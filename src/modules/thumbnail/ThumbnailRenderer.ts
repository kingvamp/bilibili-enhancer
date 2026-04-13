import { BadgeDecorator } from './plugins';
import { findTitleInCard, findClosestVideoCard, findCoverInElement, ensureLayeredContext } from '../../utils/dom';

export class ThumbnailRenderer {
    private decorators: BadgeDecorator[] = [];
    private cache: Map<string, any> = new Map();
    private queue: { bvid: string; element: HTMLElement }[] = [];
    // 为了兼顾性能与安全性（防止 B 站 API 频率限制），将并发数控制在 3 个
    private maxConcurrency = 3;
    private activeTasks = 0;

    constructor(private settings: any) {}

    public addDecorator(decorator: BadgeDecorator) {
        this.decorators.push(decorator);
    }

    /**
     * 将元素加入渲染队列
     */
    public enqueue(element: HTMLElement, bvid: string) {
        if (this.queue.some(q => q.element === element)) return;

        // 1. 第一阶段：即时渲染 (同步/本地数据)
        // 确保本地状态（如：已下载变色）能够瞬间响应，不进并发队列
        this.renderInstant(element, bvid);

        // 2. 第二阶段：进队列排队处理异步/网络任务
        this.queue.push({ bvid, element });
        this.startProcessing();
    }

    public refreshAll() {
        const processed = document.querySelectorAll('a[data-bili-enhanced-processed="true"]');
        processed.forEach(el => {
            const element = el as HTMLElement;
            const bvid = element.dataset.targetBvid;
            if (bvid) this.enqueue(element, bvid);
        });
    }

    private startProcessing() {
        while (this.activeTasks < this.maxConcurrency && this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                this.activeTasks++;
                this.processTask(task).finally(() => {
                    this.activeTasks--;
                    this.startProcessing();
                });
            }
        }
    }

    private async processTask(task: { bvid: string; element: HTMLElement }) {
        const { bvid, element } = task;
        if (!this.cache.has(bvid)) this.cache.set(bvid, {});
        const videoCache = this.cache.get(bvid);

        const card = findClosestVideoCard(element) || element;
        const titleEl = findTitleInCard(card, bvid);
        const coverEl = findCoverInElement(card) || findCoverInElement(element);

        if (!titleEl) return;

        // 准备角标容器样式
        if (coverEl) {
            ensureLayeredContext(coverEl);
        }

        // 执行异步/延迟装饰器
        const deferred = this.decorators.filter(d => !d.isInstant);
        for (const decorator of deferred) {
            // 双重检查：如果已经标记为已下载，则跳过后续网络任务（收藏/分辨率）
            const isDownloaded = titleEl.classList.contains('bili-title-downloaded');
            if (isDownloaded && (decorator.name === 'status' || decorator.name === 'info')) {
                continue;
            }
            
            try {
                await decorator.render(element, videoCache, this.settings, titleEl, coverEl);
            } catch (e) {
                console.error(`[ThumbnailRenderer] Decorator ${decorator.name} failed:`, e);
            }
        }
    }

    private async renderInstant(element: HTMLElement, bvid: string) {
        if (!this.cache.has(bvid)) this.cache.set(bvid, {});
        const videoCache = this.cache.get(bvid);

        const card = findClosestVideoCard(element) || element;
        const titleEl = findTitleInCard(card, bvid);
        const coverEl = findCoverInElement(card) || findCoverInElement(element);

        if (titleEl) {
            // 在开始渲染前，清理所有可能的状态类，保证状态唯一性
            titleEl.classList.remove('bili-title-downloaded', 'bili-title-favorited', 'bili-title-liked');
        }

        // 准备角标容器样式
        if (coverEl) {
            ensureLayeredContext(coverEl);
        }

        const instants = this.decorators.filter(d => d.isInstant);
        for (const decorator of instants) {
            await decorator.render(element, videoCache, this.settings, titleEl, coverEl);
        }
    }
}
