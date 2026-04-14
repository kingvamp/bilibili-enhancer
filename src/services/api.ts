/**
 * B站 API 服务库
 * 封装与 background.ts 的通信，提供类型安全的 API 访问
 */

export interface VideoRelation {
    fav: boolean;
    like: boolean;
}

export interface VideoInfo {
    resolution: { text: string; class: string } | null;
    pageCount: number;
}

export const ApiService = {
    /**
     * 获取视频互动状态 (原生请求)
     */
    async getVideoRelationRaw(bvid: string): Promise<VideoRelation | null> {
        if (!chrome.runtime?.id) return null;

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'fetchVideoRelation', bvid }, res => {
                    if (res && res.success && res.data && res.data.code === 0) {
                        resolve({
                            fav: !!res.data.data.favorite,
                            like: !!res.data.data.like
                        });
                    } else {
                        resolve(null);
                    }
                });
            } catch (e) {
                console.warn('[ApiService] Context invalidated during fetchVideoRelation');
                resolve(null);
            }
        });
    },

    /**
     * 获取视频详细信息 (原生请求)
     */
    async getVideoInfoRaw(bvid: string): Promise<VideoInfo | null> {
        if (!chrome.runtime?.id) return null;

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'fetchVideoInfo', bvid }, res => {
                    if (res && res.success && res.data && res.data.code === 0) {
                        const d = res.data.data;
                        let resolution = null;
                        if (d.dimension) {
                            resolution = this.getResolutionLabel(d.dimension.width, d.dimension.height);
                        }
                        resolve({ resolution, pageCount: d.videos || 1 });
                    } else {
                        resolve(null);
                    }
                });
            } catch (e) {
                console.warn('[ApiService] Context invalidated during fetchVideoInfo');
                resolve(null);
            }
        });
    },

    getResolutionLabel(width: number, height: number) {
        const maxDim = Math.max(width, height);
        if (maxDim >= 7680) return { text: '8K', class: 'res-8k' };
        if (maxDim >= 3840) return { text: '4K', class: 'res-normal' };
        if (maxDim >= 2560) return { text: '2K', class: 'res-normal' };
        if (maxDim >= 1920) return { text: '1080P', class: 'res-normal' };
        if (maxDim >= 1280) return { text: '720P', class: 'res-normal' };
        return { text: 'SD', class: 'res-normal' };
    }
};
