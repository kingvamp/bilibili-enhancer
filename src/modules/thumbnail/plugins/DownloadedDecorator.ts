import { DownloadHistoryService } from '../../../services/downloadHistory';
import { BadgeDecorator } from './types';

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
