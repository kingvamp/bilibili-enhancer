import { VideoInfo } from '../../../services/api';
import { VideoDataCenter } from '../../../services/DataCenter';
import { DownloadHistoryService } from '../../../services/downloadHistory';
import { BadgeDecorator } from './types';

/**
 * 分辨率与分P数装饰器
 */
export class InfoDecorator implements BadgeDecorator {
    name = 'info';

    async render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null, badgeContainer?: HTMLElement | null) {
        const bvid = element.dataset.targetBvid;
        if (!bvid) return;

        if (!settings.enableRes && !settings.enablePCount) return;

        // 1. 获取数据 (优先缓存)
        let data: VideoInfo | null = cache.videoInfo || await VideoDataCenter.getVideoInfo(bvid);
        if (data) cache.videoInfo = data;

        if (!data) return;

        // 确定最终角标挂载点
        const container = badgeContainer || element;

        // 2. 渲染分辨率
        const existingRes = container.querySelector('.bili-res-badge');
        if (existingRes) existingRes.remove();
        if (settings.enableRes && data.resolution) {
            // 仅在明确标记为需要显示角标的元素（如缩略图）上添加浮动标
            if (element.dataset.showBadge === 'true') {
                const badge = document.createElement('div');
                badge.className = `bili-res-badge ${data.resolution.class}`;
                badge.innerText = data.resolution.text;
                container.appendChild(badge);
            }
        }

        // 3. 渲染分P数
        const existingPCount = container.querySelector('.bili-p-count');
        if (existingPCount) existingPCount.remove();
        if (settings.enablePCount && data.pageCount > 1) {
            // 仅在明确标记为需要显示角标的元素（如缩略图）上添加浮动标
            if (element.dataset.showBadge === 'true') {
                const badge = document.createElement('div');
                badge.className = 'bili-p-count';
                badge.innerText = data.pageCount + 'P';
                container.appendChild(badge);
            }
        }
    }
}
