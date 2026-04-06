/**
 * 工具栏管理器
 * 负责统一管理视频页工具栏上的增强功能按钮
 */
export interface ToolbarItem {
    id: string;
    order: number; // 排序权重，小的排在前面
    render: (container: HTMLElement) => void;
}

export class ToolbarManager {
    private static instance: ToolbarManager;
    private items: ToolbarItem[] = [];
    private groupContainer: HTMLElement | null = null;

    private constructor() {}

    public static getInstance(): ToolbarManager {
        if (!ToolbarManager.instance) {
            ToolbarManager.instance = new ToolbarManager();
        }
        return ToolbarManager.instance;
    }

    /**
     * 注册按钮
     */
    public register(item: ToolbarItem) {
        if (this.items.some(i => i.id === item.id)) return;
        this.items.push(item);
        this.items.sort((a, b) => a.order - b.order);
    }

    /**
     * 渲染/刷新工具栏
     */
    public refresh() {
        const toolbar = document.querySelector('.video-toolbar-left') || 
                        document.querySelector('.toolbar-left');
        if (!toolbar || !(toolbar instanceof HTMLElement)) return;

        let group = document.getElementById('gm-enhancer-toolbar-group');
        if (!group) {
            group = document.createElement('div');
            group.id = 'gm-enhancer-toolbar-group';
            group.className = 'gm-toolbar-group';
            
            // 插入位置：通常在原有按钮之后
            toolbar.appendChild(group);
        }

        this.groupContainer = group;
        this.renderItems();
    }

    private renderItems() {
        if (!this.groupContainer) return;

        this.items.forEach(item => {
            let itemContainer = document.getElementById(item.id);
            if (!itemContainer) {
                itemContainer = document.createElement('div');
                itemContainer.id = item.id;
                itemContainer.className = 'gm-toolbar-item';
            }
            
            // 始终 append 以确保顺序正确 (appendChild 会移动已存在的元素)
            if (itemContainer.parentElement !== this.groupContainer) {
                this.groupContainer!.appendChild(itemContainer);
            } else if (this.groupContainer!.lastElementChild !== itemContainer) {
                // 如果不是最后一个，重新 append 也会把它移到最后，这样按顺序 append 就能保证最终物理顺序
                this.groupContainer!.appendChild(itemContainer);
            }

            item.render(itemContainer);
        });
    }

    /**
     * 启动监听 (SPA 兼容)
     */
    public startObserver() {
        const check = () => this.refresh();
        const observer = new MutationObserver(() => {
            if (!chrome.runtime?.id) {
                observer.disconnect();
                return;
            }
            check();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        check();
    }
}
