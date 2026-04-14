import { DownloadHistoryService } from '../../services/downloadHistory';
import { FavoriteService } from '../../services/favorite';
import { VideoDataCenter } from '../../services/DataCenter';
import { SELECTORS } from '../../constants/selectors';

/**
 * 专门处理视频详情页标题样式高亮
 */
export class TitleBadgeManager {
    constructor(private settings: any) { }

    public async check() {
        const isVideoPage = location.pathname.startsWith('/video/') || location.pathname.startsWith('/list/');
        if (!isVideoPage) return;

        const bvid = this.extractBvid(location.href);
        if (!bvid) return;

        const mainTitleSelectors = SELECTORS.PLAY_PAGE.MAIN_VIDEO_TITLE.join(', ');
        const titleEl = document.querySelector(mainTitleSelectors) as HTMLElement;
        if (!titleEl) return;

        // 仅在开启了相关功能时处理
        if (!this.settings.enableDownloaded && !this.settings.enableStatus) return;

        // 获取状态
        const isDownloaded = DownloadHistoryService.getInstance().has(bvid);
        const relation = await VideoDataCenter.getVideoRelation(bvid);
        const isFavorited = !!relation?.fav;
        const isLiked = !!relation?.like;

        // 清理旧类
        titleEl.classList.remove('bili-title-favorited', 'bili-title-downloaded', 'bili-title-liked');

        // 应用新类 (优先级：下载 > 收藏 > 点赞)
        if (isDownloaded && this.settings.enableDownloaded) {
            titleEl.classList.add('bili-title-downloaded');
        } else if (isFavorited) {
            titleEl.classList.add('bili-title-favorited');
        } else if (isLiked) {
            titleEl.classList.add('bili-title-liked');
        }
    }

    private extractBvid(url: string | null): string | null {
        const match = url && url.match(/(BV[a-zA-Z0-9]{10})/i);
        return match ? match[1] : null;
    }
}
