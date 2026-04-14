import { ApiService, VideoRelation, VideoInfo } from './api';

/**
 * Video Data Center
 * 
 * 统一管理全站视频数据的缓存与并发请求。
 * 它是过滤器模块和增强模块的共同数据入口。
 */

class DataCenter {
    private static instance: DataCenter;
    
    private relationCache = new Map<string, VideoRelation>();
    private infoCache = new Map<string, VideoInfo>();
    
    private inFlightRelation = new Map<string, Promise<VideoRelation | null>>();
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
    public async getVideoRelation(bvid: string): Promise<VideoRelation | null> {
        if (this.relationCache.has(bvid)) return this.relationCache.get(bvid)!;
        if (this.inFlightRelation.has(bvid)) return this.inFlightRelation.get(bvid)!;

        const promise = ApiService.getVideoRelationRaw(bvid).then(res => {
            if (res) this.relationCache.set(bvid, res);
            this.inFlightRelation.delete(bvid);
            return res;
        }).catch(() => {
            this.inFlightRelation.delete(bvid);
            return null;
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
     * 手动更新缓存 (例如在执行收藏操作后)
     */
    public setRelation(bvid: string, data: VideoRelation) {
        this.relationCache.set(bvid, data);
    }
}

export const VideoDataCenter = DataCenter.getInstance();
