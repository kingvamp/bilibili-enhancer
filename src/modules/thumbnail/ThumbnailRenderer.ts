import { BadgeDecorator } from './plugins';

export class ThumbnailRenderer {
    private decorators: BadgeDecorator[] = [];
    private cache: Map<string, any> = new Map();
    private queue: { bvid: string; element: HTMLElement }[] = [];
    // 为了兼顾性能与安全性（防止 B 站 API 频率限制），将并发数控制在 3 个
    private maxConcurrency = 3;
    private activeTasks = 0;

    constructor(private settings: any) {}

    public addDecorator(decorator: BadgeDecorator) {
        this.decorators.push(decorator);
    }

    /**
     * 将元素加入渲染队列
     */
    public enqueue(element: HTMLElement, bvid: string) {
        if (this.queue.some(q => q.element === element)) return;
        this.queue.push({ bvid, element });
        this.startProcessing();
    }

    public refreshAll() {
        const processed = document.querySelectorAll('a[data-bili-enhanced-processed="true"]');
        processed.forEach(el => {
            const element = el as HTMLElement;
            const bvid = element.dataset.targetBvid;
            if (bvid) this.enqueue(element, bvid);
        });
    }

    private startProcessing() {
        while (this.activeTasks < this.maxConcurrency && this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                this.activeTasks++;
                this.processTask(task).finally(() => {
                    this.activeTasks--;
                    this.startProcessing();
                });
            }
        }
    }

    private async processTask(task: { bvid: string; element: HTMLElement }) {
        const { bvid, element } = task;
        if (!this.cache.has(bvid)) this.cache.set(bvid, {});
        const videoCache = this.cache.get(bvid);

        const titleEl = this.findTitleElement(element);
        // 清理旧的状态类，防止多个类并存导致优先级混乱
        if (titleEl) {
            titleEl.classList.remove('bili-title-downloaded', 'bili-title-favorited', 'bili-title-liked');
        }

        // 串行执行针对同一个元素的不同装饰器，确保逻辑顺序（如：已下载标覆盖其他标）
        for (const decorator of this.decorators) {
            try {
                await decorator.render(element, videoCache, this.settings, titleEl);
            } catch (e) {
                console.error(`[ThumbnailRenderer] Decorator ${decorator.name} failed:`, e);
            }
        }
    }

    private findTitleElement(element: HTMLElement): HTMLElement | null {
        const bvid = element.dataset.targetBvid;
        
        // 1. 尝试向上寻找最可能的卡片容器 (包含推荐列表的 .card-box)
        const selectors = [
            '.bili-video-card', '.video-item', '.small-item', 
            '.video-card-common', '.b-video-item', '.video-list-item',
            '.item', '.video-card', '.archive-card', '.list-item', '.card-box',
            '[class*="video-card"]', '[class*="VideoCard"]', '[class*="card-box"]'
        ];
        const card = element.closest(selectors.join(', '));
        
        // 2. 查找逻辑
        const titleSelectors = ['.bili-video-card__info--tit', '.title', '.t', '.tit', '.video-title', 'h3'];
        
        if (card) {
            const title = card.querySelector(titleSelectors.join(', '));
            if (title) return title as HTMLElement;

            // 兜底 A: 在容器内寻找匹配 BV 号的链接
            if (bvid) {
                const links = card.querySelectorAll('a');
                for (const link of links) {
                    if (link === element) continue;
                    const hLink = link as HTMLElement;
                    if (hLink.innerText.trim() && (link.href.includes(bvid) || link.dataset.targetBvid === bvid)) {
                        return hLink;
                    }
                }
            }
        }
        
        // 3. 兜底 B: 在更大范围内寻找
        if (bvid) {
            const root = card?.parentElement || element.parentElement;
            if (root) {
                const sameBvLink = root.querySelector(`a[href*="${bvid}"]:not(.bili-res-badge-parent)`) as HTMLElement;
                if (sameBvLink && sameBvLink.innerText && sameBvLink.innerText.trim()) return sameBvLink;
            }
        }
        
        return null;
    }
}
