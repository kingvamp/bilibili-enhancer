import { ApiService, VideoRelation, VideoInfo } from '../../services/api';
import { DownloadHistoryService } from '../../services/downloadHistory';

export interface BadgeDecorator {
    name: string;
    render(element: HTMLElement, cache: any, settings: any): Promise<void>;
}

/**
 * 分辨率与分P数装饰器
 */
export class InfoDecorator implements BadgeDecorator {
    name = 'info';

    async render(element: HTMLElement, cache: any, settings: any) {
        const bvid = element.dataset.targetBvid;
        if (!bvid) return;

        if (!settings.enableRes && !settings.enablePCount) return;

        // 1. 获取数据 (优先缓存)
        let data: VideoInfo | null = cache.videoInfo;
        if (!data) {
            // 如果已下载，通常不需要再查分辨率（为了性能）
            if (DownloadHistoryService.getInstance().has(bvid)) return;
            
            data = await ApiService.getVideoInfo(bvid);
            if (data) cache.videoInfo = data;
        }

        if (!data) return;

        // 2. 渲染分辨率
        const existingRes = element.querySelector('.bili-res-badge');
        if (existingRes) existingRes.remove();
        if (settings.enableRes && data.resolution) {
            const badge = document.createElement('div');
            badge.className = `bili-res-badge ${data.resolution.class}`;
            badge.innerText = data.resolution.text;
            element.appendChild(badge);
        }

        // 3. 渲染分P数
        const existingPCount = element.querySelector('.bili-p-count');
        if (existingPCount) existingPCount.remove();
        if (settings.enablePCount && data.pageCount > 1) {
            const badge = document.createElement('div');
            badge.className = 'bili-p-count';
            badge.innerText = data.pageCount + 'P';
            element.appendChild(badge);
        }
    }
}

/**
 * 点赞/收藏状态装饰器
 */
export class StatusDecorator implements BadgeDecorator {
    name = 'status';

    async render(element: HTMLElement, cache: any, settings: any) {
        const bvid = element.dataset.targetBvid;
        if (!bvid || !settings.enableStatus) return;

        // 如果已下载，由于其优先级最高，此装饰器退出（由 DownloadedDecorator 处理）
        if (DownloadHistoryService.getInstance().has(bvid)) return;

        let data: VideoRelation | null = cache.status;
        if (!data) {
            data = await ApiService.getVideoRelation(bvid);
            if (data) cache.status = data;
        }

        if (!data) return;

        const isFavPage = location.href.includes('medialist') || location.href.includes('favlist') ||
                          !!document.querySelector('.fav-detail') || !!document.querySelector('.fav-info');

        let type: 'fav' | 'like' | null = null;
        if (data.fav && !isFavPage) type = 'fav';
        else if (data.like) type = 'like';

        this.updateBadge(element, type, settings.styleMode);
    }

    private updateBadge(element: HTMLElement, type: 'fav' | 'like' | null, styleMode: string) {
        element.querySelectorAll('.my-status-tag:not(.tag-downloaded)').forEach(el => el.remove());
        if (!type) return;

        const tag = document.createElement('div');
        tag.className = `my-status-tag tag-${type}`;
        if (styleMode === 'text') {
            tag.innerText = type === 'fav' ? '已收藏' : '已点赞';
        }
        element.appendChild(tag);
    }
}

/**
 * 已下载状态装饰器 (独立数据源)
 */
export class DownloadedDecorator implements BadgeDecorator {
    name = 'downloaded';

    async render(element: HTMLElement, cache: any, settings: any) {
        const bvid = element.dataset.targetBvid;
        if (!bvid || !settings.enableDownloaded) return;

        const isDownloaded = DownloadHistoryService.getInstance().has(bvid);
        
        // 清理旧的下载标
        element.querySelectorAll('.tag-downloaded').forEach(el => el.remove());

        if (isDownloaded) {
            // 已下载时，移除“已点赞/已收藏”角标（如果存在），因为下载标优先级最高
            element.querySelectorAll('.my-status-tag:not(.tag-downloaded)').forEach(el => el.remove());

            const tag = document.createElement('div');
            tag.className = 'my-status-tag tag-downloaded';
            if (settings.styleMode === 'text') {
                tag.innerText = '已下载';
            }
            element.appendChild(tag);
        }
    }
}
