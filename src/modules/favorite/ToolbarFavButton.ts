import { FavoriteService } from '../../services/favorite';
import { ICONS } from './icons';
import { DOM_IDS } from '../../constants';
import { bvToAv } from '../../bilibili';

export class ToolbarFavButton {
    private service = FavoriteService.getInstance();
    private lastBvid: string = '';

    constructor(private isEnabled: boolean) {}

    public async render() {
        if (!this.isEnabled) return;
        const btnId = 'gm-one-click-fav-btn';
        let btn = document.getElementById(btnId);

        const bvidMatch = location.href.match(/(BV\w{10})/);
        const currentBvid = bvidMatch ? bvidMatch[1] : null;
        if (!currentBvid) return;

        // SPA 路由切换处理
        if (btn && this.lastBvid !== currentBvid) {
            this.resetButton(btn, currentBvid);
            const isFav = await this.service.checkIsFavorited(currentBvid);
            if (isFav) {
                this.markAsSuccess(btn);
            }
        }

        if (btn) return;

        const toolbar = document.querySelector('.video-toolbar-left') || 
                        document.querySelector('.toolbar-left');
        if (!toolbar) return;

        const isFavOnLoad = await this.service.checkIsFavorited(currentBvid);

        btn = document.createElement('div');
        btn.id = btnId;
        btn.className = 'gm-toolbar-fav-btn';
        this.lastBvid = currentBvid;

        if (isFavOnLoad) {
            this.markAsSuccess(btn);
        } else {
            btn.innerHTML = ICONS.heart + '<span>一键收藏</span>';
        }
        
        btn.title = '一键收藏到默认收藏夹';

        btn.onclick = async () => {
            if (btn!.dataset.loading === "true") return;
            
            const clickBvidMatch = location.href.match(/(BV\w{10})/);
            const clickBvid = clickBvidMatch ? clickBvidMatch[1] : null;
            if (!clickBvid) return;

            btn!.dataset.loading = "true";
            const span = btn!.querySelector('span');
            if (span) span.innerText = '稍等...';

            try {
                const aid = bvToAv(clickBvid);
                if (!aid || aid === clickBvid) throw new Error('获取AID失败');
                
                await this.service.doFavorite(aid);
                this.markAsSuccess(btn!);
                this.lastBvid = clickBvid;
            } catch (err) {
                console.error('[ToolbarFavButton]', err);
                if (span) span.innerText = '错误';
                setTimeout(() => {
                    if (span) span.innerText = '一键收藏';
                    btn!.dataset.loading = "false";
                }, 2000);
            }
        };

        const lastBtn = toolbar.querySelector('#' + DOM_IDS.VIDEO_DOWNLOAD_BTN) || 
                        toolbar.querySelector('#' + DOM_IDS.COVER_DOWNLOAD_BTN) ||
                        toolbar.lastElementChild;
        
        if (lastBtn && lastBtn.parentElement === toolbar) {
             lastBtn.insertAdjacentElement('afterend', btn);
        } else {
             toolbar.appendChild(btn);
        }
    }

    private resetButton(btn: HTMLElement, bvid: string) {
        btn.innerHTML = ICONS.heart + '<span>一键收藏</span>';
        btn.classList.remove('gm-fav-success');
        btn.style.pointerEvents = 'auto';
        btn.dataset.loading = "false";
        this.lastBvid = bvid;
    }

    private markAsSuccess(btn: HTMLElement) {
        btn.innerHTML = ICONS.check + '<span>已收藏</span>';
        btn.classList.add('gm-fav-success');
        btn.style.pointerEvents = 'none';
    }
}
