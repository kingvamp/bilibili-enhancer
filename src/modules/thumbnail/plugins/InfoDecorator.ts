import { ApiService, VideoInfo } from '../../../services/api';
import { DownloadHistoryService } from '../../../services/downloadHistory';
import { BadgeDecorator } from './types';

/**
 * 分辨率与分P数装饰器
 */
export class InfoDecorator implements BadgeDecorator {
    name = 'info';

    async render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null) {
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
