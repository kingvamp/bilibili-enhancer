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

        // 串行执行针对同一个元素的不同装饰器，确保逻辑顺序（如：已下载标覆盖其他标）
        for (const decorator of this.decorators) {
            try {
                await decorator.render(element, videoCache, this.settings);
            } catch (e) {
                console.error(`[ThumbnailRenderer] Decorator ${decorator.name} failed:`, e);
            }
        }
    }
}
