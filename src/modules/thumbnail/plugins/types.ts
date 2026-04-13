export interface BadgeDecorator {
    name: string;
    isInstant?: boolean; // 是否为即时渲染（如本地数据计算，不需要进并发队列）
    render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null, badgeContainer?: HTMLElement | null): Promise<void>;
}
