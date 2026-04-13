import { DownloadHistoryService } from '../../../services/downloadHistory';
import { BadgeDecorator } from './types';

/**
 * 已下载状态装饰器 (独立数据源)
 */
export class DownloadedDecorator implements BadgeDecorator {
    name = 'downloaded';
    isInstant = true;

    async render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null, badgeContainer?: HTMLElement | null) {
        const bvid = element.dataset.targetBvid;
        if (!bvid || !settings.enableDownloaded) return;

        const isDownloaded = DownloadHistoryService.getInstance().has(bvid);
        const container = badgeContainer || element;
        
        // 清理旧的下载标
        container.querySelectorAll('.tag-downloaded').forEach(el => el.remove());

        if (isDownloaded) {
            // 已下载时，移除“已点赞/已收藏”角标（如果存在），因为下载标优先级最高
            container.querySelectorAll('.my-status-tag:not(.tag-downloaded)').forEach(el => el.remove());

            // 仅在明确标记为需要显示角标的元素（如缩略图）上添加浮动标
            if (element.dataset.showBadge === 'true') {
                const tag = document.createElement('div');
                tag.className = 'my-status-tag tag-downloaded';
                if (settings.styleMode === 'text') {
                    tag.innerText = '已下载';
                }
                container.appendChild(tag);
            }

            // 应用标题高亮 (无论是否显示角标，只要匹配就高亮标题)
            if (titleEl) {
                titleEl.classList.add('bili-title-downloaded');
            }
        } else {
            // 如果未下载，清理可能残余的高亮类
            if (titleEl) {
                titleEl.classList.remove('bili-title-downloaded');
            }
        }
    }
}
