import { BadgeDecorator } from './Decorators';

export class ThumbnailRenderer {
    private decorators: BadgeDecorator[] = [];
    private cache: Map<string, any> = new Map();
    private queue: { bvid: string; element: HTMLElement }[] = [];
    private isProcessing = false;

    constructor(private settings: any) {}

    public addDecorator(decorator: BadgeDecorator) {
        this.decorators.push(decorator);
    }

    /**
     * 将元素加入渲染队列
     */
    public enqueue(element: HTMLElement, bvid: string) {
        // 如果重复加入队列，只保留最新的
        if (this.queue.some(q => q.element === element)) return;
        this.queue.push({ bvid, element });
        this.processQueue();
    }

    /**
     * 立即执行所有已处理元素的全量刷新 (用于设置变更)
     */
    public refreshAll() {
        const processed = document.querySelectorAll('a[data-bili-enhanced-processed="true"]');
        processed.forEach(el => {
            const element = el as HTMLElement;
            const bvid = element.dataset.targetBvid;
            if (bvid) this.enqueue(element, bvid);
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        const task = this.queue.shift();
        if (!task) {
            this.isProcessing = false;
            return;
        }

        const { bvid, element } = task;
        if (!this.cache.has(bvid)) this.cache.set(bvid, {});
        const videoCache = this.cache.get(bvid);

        // 串行执行各装饰器
        for (const decorator of this.decorators) {
            try {
                await decorator.render(element, videoCache, this.settings);
            } catch (e) {
                console.error(`[ThumbnailRenderer] Decorator ${decorator.name} failed:`, e);
            }
        }

        this.isProcessing = false;
        // 给予微小的延迟，避免阻塞主线程
        setTimeout(() => this.processQueue(), 20);
    }
}
