import { DownloadHistoryService } from '../../services/downloadHistory';

/**
 * 专门处理视频详情页标题后的“已下载”角标
 */
export class TitleBadgeManager {
    constructor(private settings: any) {}

    public check() {
        if (!this.settings.enableDownloaded) return;
        
        const isVideoPage = location.pathname.startsWith('/video/') || location.pathname.startsWith('/list/');
        if (!isVideoPage) return;
        
        const bvid = this.extractBvid(location.href);
        if (!bvid) return;

        const titleEl = document.querySelector('.video-title') as HTMLElement || document.querySelector('.tit') as HTMLElement;
        if (!titleEl) return;

        // 清理旧标
        const oldBadge = titleEl.querySelector('.bili-downloaded-title-badge');
        if (oldBadge) {
            if (oldBadge.getAttribute('data-bvid') === bvid) return; 
            oldBadge.remove();
        }

        if (DownloadHistoryService.getInstance().has(bvid)) {
            this.inject(titleEl, bvid);
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
