/**
 * 空间投稿页统计栏：由 FilterEngine 驱动列表同步，复用互动、下载及充电服务。
 * 按当前列表 BV 号去重，包含被插件隐藏的卡片，不累计其他分页的数据。
 */
import { SELECTORS } from '../constants/selectors';
import { Module } from '../types';
import { VideoRelation } from '../services/api';
import { VideoDataCenter } from '../services/DataCenter';
import { DownloadHistoryService } from '../services/downloadHistory';
import { FilterEngine } from '../services/FilterEngine';
import { ChargingService } from './charging/ChargingService';
import { extractBvid } from '../utils/dom';
import { StyleManager } from '../utils/style';

const CONFIG = { concurrency: 3, updateDelay: 100 };
const SELECTOR = SELECTORS.SPACE.VIDEO_STATS;
const FIELDS = [
    { key: 'like', label: '已点赞' },
    { key: 'fav', label: '已收藏' },
    { key: 'download', label: '已下载' },
    { key: 'charging', label: '充电视频' }
] as const;
type Field = typeof FIELDS[number]['key'];
interface VideoState {
    relation: Partial<VideoRelation>;
    pending: boolean;
}

class SpaceVideoStats {
    private entries = new Map<string, VideoState>();
    private bar: HTMLElement | null = null;
    private list: HTMLElement | null = null;
    private toolbar: HTMLElement | null = null;
    private values = new Map<Field, HTMLElement>();
    private queue: [string, VideoState][] = [];
    private active = 0;
    private timer: number | undefined;
    private history = DownloadHistoryService.getInstance();
    private charging = ChargingService.getInstance();

    /** 启动共享观察与数据订阅，不依赖角标或筛选开关。 */
    public start() {
        this.injectStyles();
        const engine = FilterEngine.getInstance();
        engine.onMutation(() => this.schedule());
        engine.onScan(() => this.schedule());
        engine.start();
        this.history.subscribe(() => this.schedule());
        VideoDataCenter.subscribeRelation((bvid, relation) => {
            const entry = this.entries.get(bvid);
            if (!entry) return;
            entry.relation = relation;
            this.schedule();
        });
        this.sync();
    }

    /** 合并同一批 DOM 和服务事件；持续更新时也不会无限推迟统计。 */
    private schedule() {
        if (this.timer !== undefined) return;
        this.timer = window.setTimeout(() => {
            this.timer = undefined;
            this.sync();
        }, CONFIG.updateDelay);
    }

    /** 只从当前投稿列表取样，翻页时移除旧 BV 号并丢弃尚未开始的旧请求。 */
    private sync() {
        const isVideoPage = /^\/\d+\/upload\/video\/?$/.test(location.pathname);
        const root = isVideoPage ? document.querySelector<HTMLElement>(SELECTOR.ROOT) : null;
        const anchor = root?.querySelector<HTMLElement>(SELECTOR.ANCHOR);
        const dynamic = document.querySelector(SELECTOR.DYNAMIC_ACTIVE);
        const list = root?.querySelector<HTMLElement>(dynamic ? SELECTOR.DYNAMIC_LIST : SELECTOR.LIST);
        if (!anchor || !list) {
            this.clear();
            return;
        }
        if (this.list !== list) {
            this.clear();
            this.list = list;
        }
        this.mount(anchor);
        const bvids = new Set<string>();
        list.querySelectorAll<HTMLElement>(SELECTOR.CARD).forEach(card => {
            const link = card.querySelector<HTMLAnchorElement>(SELECTORS.SCANNER.VIDEO_LINK);
            const bvid = extractBvid(link?.getAttribute('href') ?? null);
            if (bvid) bvids.add(bvid);
        });
        for (const bvid of this.entries.keys()) {
            if (!bvids.has(bvid)) this.entries.delete(bvid);
        }
        this.queue = this.queue.filter(([bvid, entry]) => this.entries.get(bvid) === entry);
        for (const bvid of bvids) {
            if (this.entries.has(bvid)) continue;
            const entry: VideoState = { relation: {}, pending: true };
            this.entries.set(bvid, entry);
            this.queue.push([bvid, entry]);
        }
        this.render();
        this.processQueue();
    }

    /** 在原生排序按钮组之后挂载，不依赖可选的更多筛选按钮，保留原生控件。 */
    private mount(anchor: HTMLElement) {
        if (this.bar?.isConnected && this.bar.previousElementSibling === anchor) return;
        this.bar?.remove();
        this.toolbar?.classList.remove('bili-space-stats-toolbar');
        const bar = document.createElement('div');
        bar.className = 'bili-space-video-stats';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', '当前页视频统计，包含被插件隐藏的视频，各项独立计数');
        this.values.clear();
        for (const { key, label } of FIELDS) {
            const item = document.createElement('span');
            item.className = `bili-space-stat bili-space-stat--${key}`;
            item.append(`${label} `);
            const value = document.createElement('strong');
            item.append(value);
            bar.append(item);
            this.values.set(key, value);
        }
        anchor.after(bar);
        this.toolbar = anchor.parentElement;
        this.toolbar?.classList.add('bili-space-stats-toolbar');
        this.bar = bar;
    }

    /** 限制统计自身的并发，同 BV 请求由已有服务合并。 */
    private processQueue() {
        while (this.active < CONFIG.concurrency && this.queue.length) {
            const [bvid, entry] = this.queue.shift()!;
            if (this.entries.get(bvid) !== entry) continue;
            this.active++;
            void this.load(bvid, entry).finally(() => {
                this.active--;
                this.schedule();
                this.processQueue();
            });
        }
    }

    /** 未确认状态保持未知，风控或请求失败不能当作未点赞、非充电。 */
    private async load(bvid: string, entry: VideoState) {
        try {
            const [relation] = await Promise.all([
                VideoDataCenter.getVideoRelation(bvid),
                this.charging.checkChargingStatus(bvid)
            ]);
            if (this.entries.get(bvid) !== entry) return;
            // 服务返回的是合并过本地收藏更新的状态，不从卡片角标反推。
            if (relation) entry.relation = { ...relation, ...entry.relation };
            if (entry.relation.like === undefined || entry.relation.fav === undefined || this.getCharging(bvid) === undefined) {
                console.warn('[SpaceVideoStats] 视频统计状态未完整获取:', bvid);
            }
        } catch (error) {
            console.warn('[SpaceVideoStats] 获取当前页视频统计失败:', bvid, error);
        } finally {
            entry.pending = false;
        }
    }

    /** 只认可充电服务已经确认的结果，不将其失败返回值计入安全集合。 */
    private getCharging(bvid: string): boolean | undefined {
        if (this.charging.isKnownCharging(bvid)) return true;
        if (this.charging.isKnownSafe(bvid)) return false;
        return undefined;
    }

    /** 独立汇总四项数量；未知时显示省略号、下限或未完成标记。 */
    private render() {
        const counts: Record<Field, number> = { like: 0, fav: 0, download: 0, charging: 0 };
        const unknown: Record<Field, number> = { like: 0, fav: 0, download: 0, charging: 0 };
        let pending = false;
        for (const [bvid, entry] of this.entries) {
            pending ||= entry.pending;
            const states: Record<Field, boolean | undefined> = {
                like: entry.relation.like,
                fav: entry.relation.fav,
                download: this.history.loadState === 'ready' ? this.history.has(bvid) : undefined,
                charging: this.getCharging(bvid)
            };
            for (const { key } of FIELDS) {
                if (states[key] === true) counts[key]++;
                if (states[key] === undefined) unknown[key]++;
            }
        }
        for (const { key, label } of FIELDS) {
            const value = this.values.get(key)!;
            const loading = key === 'download' ? this.history.loadState === 'loading' : pending;
            const text = unknown[key] ? (counts[key] ? `${counts[key]}+` : loading ? '…' : '—') : String(counts[key]);
            const title = `当前页 ${this.entries.size} 个视频（含插件隐藏项），${label}已确认 ${counts[key]} 个` +
                (unknown[key] ? `；${unknown[key]} 个状态${loading ? '查询中' : '未获取，统计未完成'}` : '；按 BV 号去重，各项独立计数');
            // 避免自身写入触发共享 Observer 后反复修改 DOM。
            if (value.textContent !== text) value.textContent = text;
            if (value.parentElement!.title !== title) value.parentElement!.title = title;
        }
    }

    /** 离开视频页或替换列表时清理视图、队列与当前页状态。 */
    private clear() {
        this.bar?.remove();
        this.toolbar?.classList.remove('bili-space-stats-toolbar');
        this.bar = null;
        this.toolbar = null;
        this.list = null;
        this.entries.clear();
        this.values.clear();
        this.queue = [];
    }

    /** 注入仅作用于统计栏和其工具栏的样式，窄窗口允许换行。 */
    private injectStyles() {
        StyleManager.inject('bili-space-video-stats-style', `
            .video-header .breadcrumb.bili-space-stats-toolbar { flex-wrap: wrap; row-gap: 10px; }
            .bili-space-video-stats { display: flex; flex-wrap: wrap; align-items: center;
                gap: 8px 16px; margin: 0 16px; font-size: 13px; line-height: 32px;
                color: var(--text2, #61666d); }
            .bili-space-video-stats .bili-space-stat { white-space: nowrap; }
            .bili-space-video-stats strong { margin-left: 4px; font-weight: 600; font-variant-numeric: tabular-nums; }
            .bili-space-stat--like strong { color: var(--bili-color-like); }
            .bili-space-stat--fav strong { color: var(--bili-color-fav); }
            .bili-space-stat--download strong { color: var(--bili-color-download); }
            .bili-space-stat--charging strong { color: #e5a034; }
        `);
    }
}

let started = false;
export const SpaceVideoStatsModule: Module = {
    init() {
        if (started || location.hostname !== 'space.bilibili.com') return;
        started = true;
        new SpaceVideoStats().start();
    }
};
