import { SELECTORS } from '../../constants/selectors';
import { extractBvid, isInsideExcludedArea, findCoverInElement } from '../../utils/dom';

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
                    const el = entry.target as HTMLElement;
                    const bvid = el.dataset.targetBvid;
                    
                    if (bvid) {
                        // 在进入视口时进行最终的“显著性”检查
                        // 这样可以确保动态加载的元素已经有了物理尺寸
                        const cover = findCoverInElement(el);
                        if (cover) {
                            const rect = cover.getBoundingClientRect();
                            if (rect.width > 20 && rect.height > 20) { // 稍微放宽一点限制，20px 足够了
                                el.dataset.showBadge = "true";
                            }
                        }

                        this.onDiscover(el, bvid);
                        this.viewportObserver?.unobserve(el);
                    }
                }
            });
        }, { rootMargin: "150px" }); // 稍微增加预加载范围

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
        const links = document.querySelectorAll(SELECTORS.SCANNER.VIDEO_LINK);
        links.forEach(link => {
            const anchor = link as HTMLAnchorElement;
            if (anchor.dataset.biliEnhancedProcessed) return;

            // 过滤掉非视频区域 (如顶栏)
            if (isInsideExcludedArea(anchor)) return;

            const bvid = extractBvid(anchor.href);
            if (bvid) {
                anchor.dataset.biliEnhancedProcessed = "true";
                anchor.dataset.targetBvid = bvid;
                
                this.viewportObserver?.observe(anchor);
            }
        });

        // 2. 扫描具有 data-key="BV..." 的元素 (如稍后再玩列表)
        const itemsWithKey = document.querySelectorAll(SELECTORS.SCANNER.DATA_KEY_BV);
        itemsWithKey.forEach(item => {
            const element = item as HTMLElement;
            if (element.dataset.biliEnhancedProcessed) return;

            const bvid = element.dataset.key;
            if (bvid && bvid.startsWith('BV')) {
                element.dataset.biliEnhancedProcessed = "true";
                element.dataset.targetBvid = bvid;
                
                this.viewportObserver?.observe(element);
            }
        });
    }
}
