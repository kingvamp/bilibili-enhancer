import { ApiService } from './api';
import { extractBvid } from '../utils/dom';

/**
 * 动态视频数据接口
 */
export interface BiliDynamicVideo {
    bvid: string;
    title: string;
    cover: string;
    duration: string;
    pubDate: number;
    playCount: string;
    danmakuCount: string;
    author: string;
}

export class DynamicVideoService {
    private static instance: DynamicVideoService;
    private hasMore: boolean = true;
    private offset: string = '';

    private constructor() {}

    public static getInstance(): DynamicVideoService {
        if (!DynamicVideoService.instance) {
            DynamicVideoService.instance = new DynamicVideoService();
        }
        return DynamicVideoService.instance;
    }

    /**
     * 获取空间动态视频
     */
    public async fetchDynamicVideos(mid: number, isRefresh: boolean = false): Promise<BiliDynamicVideo[]> {
        if (isRefresh) {
            this.offset = '';
            this.hasMore = true;
        }

        if (!this.hasMore) return [];

        const data = await ApiService.fetchSpaceDynamics(mid, this.offset);
        if (!data || data.code !== 0 || !data.data) {
            this.hasMore = false;
            return [];
        }

        this.hasMore = data.data.has_more;
        this.offset = data.data.offset;

        const dynamicList = data.data.items || [];
        return this.mapDynamicsToVideos(dynamicList);
    }

    /**
     * 缓存管理：保存当前状态到 session
     */
    public saveStateToSession(mid: number, videos: BiliDynamicVideo[]) {
        const key = `bili_enhanced_dynamic_cache_${mid}`;
        const state = {
            videos,
            offset: this.offset,
            hasMore: this.hasMore,
            timestamp: Date.now()
        };
        sessionStorage.setItem(key, JSON.stringify(state));
    }

    /**
     * 缓存管理：从 session 恢复状态
     */
    public loadStateFromSession(mid: number): { videos: BiliDynamicVideo[] } | null {
        const key = `bili_enhanced_dynamic_cache_${mid}`;
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;

        try {
            const state = JSON.parse(raw);
            // 缓存 30 分钟内有效
            if (Date.now() - state.timestamp > 30 * 60 * 1000) {
                sessionStorage.removeItem(key);
                return null;
            }
            this.offset = state.offset;
            this.hasMore = state.hasMore;
            return { videos: state.videos };
        } catch (e) {
            return null;
        }
    }

    /**
     * 将原始动态列表映射为视频格式
     */
    private mapDynamicsToVideos(items: any[]): BiliDynamicVideo[] {
        const videos: BiliDynamicVideo[] = [];

        for (const item of items) {
            const major = item.modules?.module_dynamic?.major;
            const type = major?.type;
            
            // 支持多种视频类型：ARCHIVE, UGC_SEASON, PGC
            if (type !== 'MAJOR_TYPE_ARCHIVE' && type !== 'MAJOR_TYPE_UGC_SEASON' && type !== 'MAJOR_TYPE_PGC') {
                continue;
            }

            let archiveData: any = null;
            if (type === 'MAJOR_TYPE_ARCHIVE') {
                archiveData = major.archive;
            } else if (type === 'MAJOR_TYPE_UGC_SEASON') {
                archiveData = major.ugc_season;
            } else if (type === 'MAJOR_TYPE_PGC') {
                archiveData = major.pgc;
            }

            if (!archiveData) continue;

            // 过滤掉常规投稿视频：这类视频通常 badge 为 "投稿视频"
            // 动态视频通常 badge 为 "动态视频" 或没有该字段
            if (archiveData.badge?.text === '投稿视频') {
                continue;
            }

            videos.push({
                bvid: archiveData.bvid || extractBvid(archiveData.jump_url) || '',
                title: archiveData.title,
                cover: archiveData.cover,
                duration: archiveData.duration_text || '',
                pubDate: item.modules?.module_author?.pub_ts * 1000 || 0,
                playCount: archiveData.stat?.play || archiveData.stat?.view || '0',
                danmakuCount: archiveData.stat?.danmaku || '0',
                author: item.modules?.module_author?.name || ''
            });
        }

        return videos;
    }

    public getStatus() {
        return { hasMore: this.hasMore, offset: this.offset };
    }
}
