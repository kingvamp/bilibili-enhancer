import { ApiService, VideoRelation, VideoInfo } from './api';

/**
 * Video Data Center
 * 
 * 统一管理全站视频数据的缓存与并发请求。
 * 它是过滤器模块和增强模块的共同数据入口。
 */

class DataCenter {
    private static instance: DataCenter;
    
    // 收藏接口只确认收藏状态；未查询到的点赞状态保持未知，避免覆盖已有数据。
    private relationCache = new Map<string, Partial<VideoRelation>>();
    private infoCache = new Map<string, VideoInfo>();
    private relationListeners = new Set<(bvid: string, relation: Partial<VideoRelation>) => void>();
    
    private inFlightRelation = new Map<string, Promise<Partial<VideoRelation> | null>>();
    private inFlightInfo = new Map<string, Promise<VideoInfo | null>>();

    private constructor() {}

    public static getInstance(): DataCenter {
        if (!DataCenter.instance) {
            DataCenter.instance = new DataCenter();
        }
        return DataCenter.instance;
    }

    /**
     * 获取视频互动状态 (带缓存与去重)
     */
    public async getVideoRelation(bvid: string): Promise<Partial<VideoRelation> | null> {
        const cached = this.relationCache.get(bvid);
        if (cached?.fav !== undefined && cached.like !== undefined) return cached;
        if (this.inFlightRelation.has(bvid)) return this.inFlightRelation.get(bvid)!;

        const promise = ApiService.getVideoRelationRaw(bvid).then(res => {
            // 请求期间可能已完成收藏，已确认的本地更新优先于较早发出的查询结果。
            const current = this.relationCache.get(bvid);
            const relation = res ? { ...res, ...current } : current;
            if (relation) this.setRelation(bvid, relation);
            this.inFlightRelation.delete(bvid);
            return relation ?? null;
        }).catch(error => {
            this.inFlightRelation.delete(bvid);
            console.warn('[DataCenter] 获取视频互动状态失败:', bvid, error);
            return this.relationCache.get(bvid) ?? null;
        });

        this.inFlightRelation.set(bvid, promise);
        return promise;
    }

    /**
     * 获取视频详细信息 (带缓存与去重)
     */
    public async getVideoInfo(bvid: string): Promise<VideoInfo | null> {
        if (this.infoCache.has(bvid)) return this.infoCache.get(bvid)!;
        if (this.inFlightInfo.has(bvid)) return this.inFlightInfo.get(bvid)!;

        const promise = ApiService.getVideoInfoRaw(bvid).then(res => {
            if (res) this.infoCache.set(bvid, res);
            this.inFlightInfo.delete(bvid);
            return res;
        }).catch(() => {
            this.inFlightInfo.delete(bvid);
            return null;
        });

        this.inFlightInfo.set(bvid, promise);
        return promise;
    }

    /**
     * 合并已确认的互动状态，只更新传入字段，保留其他已知状态。
     */
    public setRelation(bvid: string, data: Partial<VideoRelation>) {
        const relation = { ...this.relationCache.get(bvid), ...data };
        this.relationCache.set(bvid, relation);
        this.relationListeners.forEach(callback => callback(bvid, relation));
    }

    /** 订阅已确认的互动状态，供当前页统计同步查询和快捷收藏结果。 */
    public subscribeRelation(callback: (bvid: string, relation: Partial<VideoRelation>) => void) {
        this.relationListeners.add(callback);
        return () => this.relationListeners.delete(callback);
    }
}

export const VideoDataCenter = DataCenter.getInstance();
