export interface BadgeDecorator {
    name: string;
    render(element: HTMLElement, cache: any, settings: any): Promise<void>;
}
