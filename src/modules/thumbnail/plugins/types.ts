export interface BadgeDecorator {
    name: string;
    render(element: HTMLElement, cache: any, settings: any, titleEl?: HTMLElement | null): Promise<void>;
}
