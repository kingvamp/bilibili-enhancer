import { SELECTORS } from '../../constants/selectors';
import { extractBvid, isInsideExcludedArea, findCoverInElement, hasMarker, findClosestVideoCard } from '../../utils/dom';

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
            const bvid = extractBvid(anchor.href);
            if (!bvid) return;

            if (location.href.includes('watchlater')) {
                console.log(`[WatchLater] Discovered link: ${bvid}`, anchor.href);
            }

            // 如果已经处理过，检查标识位（Marker）是否还在
            // 如果 B 站进行了一次大的重渲染，虽然外层 Anchor 还在，但内部可能已经被清空了
            if (anchor.dataset.biliEnhancedProcessed) {
                const card = findClosestVideoCard(anchor) || anchor;
                const markerExists = hasMarker(card);
                if (markerExists) return;
                
                // 标记（在卡片上）不在了，说明卡片可能整体或部分重绘了，移除 processed 状态以重新发现
                delete anchor.dataset.biliEnhancedProcessed;
            }

            // 过滤掉非视频区域 (如顶栏)
            if (isInsideExcludedArea(anchor)) return;

            // 关键点：只处理具有封面的链接作为活跃实体，避免扫描到文字标题链接导致角标位置漂移
            if (!findCoverInElement(anchor)) return;

            anchor.dataset.biliEnhancedProcessed = "true";
            anchor.dataset.targetBvid = bvid;
            
            this.viewportObserver?.observe(anchor);
        });

        // 2. 扫描具有 data-key="BV..." 的元素 (如稍后再玩列表)
        const itemsWithKey = document.querySelectorAll(SELECTORS.SCANNER.DATA_KEY_BV);
        itemsWithKey.forEach(item => {
            const element = item as HTMLElement;
            const bvid = element.dataset.key;
            if (!bvid || !bvid.startsWith('BV')) return;

            if (element.dataset.biliEnhancedProcessed) {
                const cover = findCoverInElement(element);
                const target = cover || element;
                if (hasMarker(target)) return;
                delete element.dataset.biliEnhancedProcessed;
            }

            // 如果这个元素很大且不包含封面容器，说明它可能是个纯文本列表项，跳过
            if (!findCoverInElement(element) && element.innerText.length > 50) return;

            element.dataset.biliEnhancedProcessed = "true";
            element.dataset.targetBvid = bvid;
            
            this.viewportObserver?.observe(element);
        });
    }
}
