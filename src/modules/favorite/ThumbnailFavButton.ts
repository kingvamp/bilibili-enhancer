import { FavoriteService } from '../../services/favorite';
import { bvToAv } from '../../bilibili';
import { SELECTORS } from '../../constants/selectors';
import { isFavoritePage, findCoverInElement, extractBvidFromUrl } from '../../utils/dom';

export class ThumbnailFavButton {
    private service = FavoriteService.getInstance();

    constructor(private isEnabled: boolean) {}

    public process() {
        if (!this.isEnabled) return;

        // 识别收藏夹页面，避免在已知收藏夹内冗余显示
        if (isFavoritePage()) return;

        const links = document.querySelectorAll(SELECTORS.SCANNER.VIDEO_LINK);
        links.forEach(link => {
            const anchor = link as HTMLAnchorElement;
            if (anchor.dataset.gmFavProcessed) return;

            // 搜索页优化：如果是标题 link，跳过
            if (anchor.closest(SELECTORS.SCANNER.EXCLUDED_AREAS.join(', '))) return;

            // 寻找封面容器
            const cover = findCoverInElement(anchor);
            if (!cover) return;

            const bvid = extractBvidFromUrl(anchor.href);
            if (!bvid) return;

            anchor.dataset.gmFavProcessed = "true";
            anchor.classList.add('gm-fav-rel-parent'); 

            const btn = document.createElement('div');
            btn.className = 'gm-quick-fav-hover';
            btn.innerText = '❤+';
            btn.title = '一键收藏到默认收藏夹';
            
            // 鼠标悬停时检查状态
            let hasCheckedStatus = false;
            anchor.addEventListener('mouseenter', async () => {
                if (hasCheckedStatus) return;
                hasCheckedStatus = true;
                const isFav = await this.service.checkIsFavorited(bvid);
                if (isFav) {
                    this.markAsSuccess(btn);
                }
            });

            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (btn.dataset.loading === "true") return;
                btn.dataset.loading = "true";
                const originalText = btn.innerText;
                btn.innerText = "...";

                try {
                    const aid = this.getAid(bvid);
                    if (!aid) throw new Error('获取AID失败');
                    await this.service.doFavorite(aid);
                    this.markAsSuccess(btn);
                    setTimeout(() => btn.remove(), 1500);
                } catch (err) {
                    console.error('[ThumbnailFavButton]', err);
                    btn.innerText = "!";
                    btn.title = String(err);
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.dataset.loading = "false";
                    }, 2000);
                }
            };

            anchor.appendChild(btn);
        });
    }

    private markAsSuccess(btn: HTMLElement) {
        btn.innerText = '✔';
        btn.style.backgroundColor = '#4caf50';
        btn.style.pointerEvents = 'none';
        btn.classList.add('gm-fav-success');
    }

    private getAid(bvid: string): string | null {
        const aid = bvToAv(bvid);
        return (aid && aid !== bvid) ? aid : null;
    }
}
