import { ApiService, VideoRelation } from '../../../services/api';
import { DownloadHistoryService } from '../../../services/downloadHistory';
import { BadgeDecorator } from './types';

/**
 * 点赞/收藏状态装饰器
 */
export class StatusDecorator implements BadgeDecorator {
    name = 'status';

    async render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null, badgeContainer?: HTMLElement | null) {
        const bvid = element.dataset.targetBvid;
        if (!bvid || !settings.enableStatus) return;

        // 如果已下载，由于其优先级最高，此装饰器退出（由 DownloadedDecorator 处理）
        if (DownloadHistoryService.getInstance().has(bvid)) return;

        let data: VideoRelation | null = cache.status;
        if (!data) {
            data = await ApiService.getVideoRelation(bvid);
            if (data) cache.status = data;
        }

        if (!data) {
            // 清理可能残余的高亮类
            if (titleEl) {
                titleEl.classList.remove('bili-title-favorited', 'bili-title-liked');
            }
            return;
        }

        const isFavPage = location.href.includes('medialist') || location.href.includes('favlist') ||
                          !!document.querySelector('.fav-detail') || !!document.querySelector('.fav-info');

        let type: 'fav' | 'like' | null = null;
        if (data.fav && !isFavPage) type = 'fav';
        else if (data.like) type = 'like';

        this.updateBadge(element, type, settings.styleMode, badgeContainer);

        // 应用标题高亮
        if (titleEl) {
            titleEl.classList.remove('bili-title-favorited', 'bili-title-liked');
            if (type === 'fav') {
                titleEl.classList.add('bili-title-favorited');
            } else if (type === 'like') {
                titleEl.classList.add('bili-title-liked');
            }
        }
    }

    private updateBadge(element: HTMLElement, type: 'fav' | 'like' | null, styleMode: string, badgeContainer?: HTMLElement | null) {
        const container = badgeContainer || element;
        container.querySelectorAll('.my-status-tag:not(.tag-downloaded)').forEach(el => el.remove());
        if (!type) return;

        // 仅在明确标记为需要显示角标的元素（如缩略图）上添加浮动标
        if (element.dataset.showBadge === 'true') {
            const tag = document.createElement('div');
            tag.className = `my-status-tag tag-${type}`;
            if (styleMode === 'text') {
                tag.innerText = type === 'fav' ? '已收藏' : '已点赞';
            }
            container.appendChild(tag);
        }
    }
}
