export class PageScanner {
    private isRunning = false;
    private observer: MutationObserver | null = null;
    private viewportObserver: IntersectionObserver | null = null;

    constructor(
        private onDiscover: (element: HTMLElement, bvid: string) => void
    ) {}

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.viewportObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const link = entry.target as HTMLElement;
                    const bvid = link.dataset.targetBvid;
                    if (bvid) {
                        this.onDiscover(link, bvid);
                        this.viewportObserver?.unobserve(link);
                    }
                }
            });
        }, { rootMargin: "100px" });

        this.scan();

        this.observer = new MutationObserver(() => {
            if (!chrome.runtime?.id) {
                this.stop();
                return;
            }
            this.scan();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    public stop() {
        this.isRunning = false;
        this.observer?.disconnect();
        this.viewportObserver?.disconnect();
    }

    private scan() {
        // 1. 扫描标准视频链接
        const links = document.querySelectorAll('a[href*="BV"]');
        links.forEach(link => {
            const anchor = link as HTMLAnchorElement;
            if (anchor.dataset.biliEnhancedProcessed) return;

            // 过滤掉非封面区域 (如头部的用户中心、或者是文字标题)
            if (anchor.closest('.bili-header, .mini-header, .user-card, .v-popover-content, h1, h2, h3, h4, h5, h6, .title, .info > .tit')) return;

            const hasImg = anchor.querySelector('img') || anchor.querySelector('picture') || 
                           anchor.classList.contains('cover') || anchor.classList.contains('b-img');
            if (!hasImg) return;

            const bvid = this.extractBvid(anchor.href);
            if (bvid) {
                anchor.dataset.biliEnhancedProcessed = "true";
                anchor.dataset.targetBvid = bvid;
                anchor.classList.add('bili-res-badge-parent'); 
                
                this.viewportObserver?.observe(anchor);
            }
        });

        // 2. 扫描具有 data-key="BV..." 的元素 (如稍后再看列表)
        const itemsWithKey = document.querySelectorAll('[data-key^="BV"]');
        itemsWithKey.forEach(item => {
            const element = item as HTMLElement;
            if (element.dataset.biliEnhancedProcessed) return;

            const bvid = element.dataset.key;
            if (bvid && bvid.startsWith('BV')) {
                // 标记封面区域作为徽章父级，稍后再看列表中的类名通常是 .cover
                const target = element.querySelector('.cover') || element;
                const targetEl = target as HTMLElement;
                
                if (targetEl.dataset.biliEnhancedProcessed) return;

                targetEl.dataset.biliEnhancedProcessed = "true";
                targetEl.dataset.targetBvid = bvid;
                targetEl.classList.add('bili-res-badge-parent');
                
                this.viewportObserver?.observe(targetEl);
            }
        });
    }

    private extractBvid(url: string | null): string | null {
        const match = url && url.match(/(BV[a-zA-Z0-9]{10})/i);
        return match ? match[1] : null;
    }
}
