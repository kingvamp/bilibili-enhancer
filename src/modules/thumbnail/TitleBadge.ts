import { DownloadHistoryService } from '../../services/downloadHistory';
import { FavoriteService } from '../../services/favorite';
import { ApiService } from '../../services/api';
import { SELECTORS } from '../../constants/selectors';

/**
 * 专门处理视频详情页标题后的“已下载”角标及标题样式高亮
 */
export class TitleBadgeManager {
    constructor(private settings: any) {}

    public async check() {
        const isVideoPage = location.pathname.startsWith('/video/') || location.pathname.startsWith('/list/');
        if (!isVideoPage) return;
        
        const bvid = this.extractBvid(location.href);
        if (!bvid) return;

        const mainTitleSelectors = SELECTORS.PLAY_PAGE.MAIN_VIDEO_TITLE.join(', ');
        const titleEl = document.querySelector(mainTitleSelectors) as HTMLElement;
        if (!titleEl) return;

        // 1. 处理“已下载”角标 (仅当开启了该设置时)
        if (this.settings.enableDownloaded) {
            // 清理旧标
            const oldBadge = titleEl.querySelector('.bili-downloaded-title-badge');
            if (oldBadge) {
                // 如果 BV 号没变，角标就不必动了（除非是第一次标记）
                if (oldBadge.getAttribute('data-bvid') !== bvid) {
                    oldBadge.remove();
                }
            }

            if (DownloadHistoryService.getInstance().has(bvid)) {
                if (!titleEl.querySelector('.bili-downloaded-title-badge')) {
                    this.inject(titleEl, bvid);
                }
            }
        }

        // 2. 处理标题高亮样式
        // 获取状态
        const isDownloaded = DownloadHistoryService.getInstance().has(bvid);
        const relation = await ApiService.getVideoRelation(bvid);
        const isFavorited = !!relation?.fav;
        const isLiked = !!relation?.like;

        // 清理旧类
        titleEl.classList.remove('bili-title-favorited', 'bili-title-downloaded', 'bili-title-liked');

        // 应用新类 (优先级：下载 > 收藏 > 点赞)
        if (isDownloaded) {
            titleEl.classList.add('bili-title-downloaded');
        } else if (isFavorited) {
            titleEl.classList.add('bili-title-favorited');
        } else if (isLiked) {
            titleEl.classList.add('bili-title-liked');
        }
    }

    private inject(titleEl: HTMLElement, bvid: string) {
        // 布局优化
        if (titleEl.tagName === 'H1' || titleEl.classList.contains('video-title')) {
            titleEl.style.display = 'flex';
            titleEl.style.flexWrap = 'wrap';
            titleEl.style.alignItems = 'center';
        }

        const badge = document.createElement('span');
        badge.className = 'bili-downloaded-title-badge';
        badge.setAttribute('data-bvid', bvid);
        badge.innerText = '已下载';
        badge.style.flexShrink = '0';
        badge.style.whiteSpace = 'nowrap';
        
        titleEl.appendChild(badge);
    }

    private extractBvid(url: string | null): string | null {
        const match = url && url.match(/(BV[a-zA-Z0-9]{10})/i);
        return match ? match[1] : null;
    }
}
