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

    private isUpdating = false;

    public refresh() {
        if (this.isUpdating) return;
        
        const toolbar = document.querySelector('.video-toolbar-left') || 
                        document.querySelector('.toolbar-left');
        if (!toolbar || !(toolbar instanceof HTMLElement)) return;

        this.isUpdating = true;
        try {
            let group = document.getElementById('gm-enhancer-toolbar-group');
            if (!group) {
                group = document.createElement('div');
                group.id = 'gm-enhancer-toolbar-group';
                group.className = 'gm-toolbar-group';
                toolbar.appendChild(group);
            }

            this.groupContainer = group;
            this.renderItems();
        } finally {
            this.isUpdating = false;
        }
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
            
            // 顺序 append 即可保证物理顺序一致
            this.groupContainer!.appendChild(itemContainer);

            item.render(itemContainer);
        });
    }

    /**
     * 启动监听 (SPA 兼容)
     */
    public startObserver() {
        let lastRun = 0;
        const observer = new MutationObserver((mutations) => {
            if (!chrome.runtime?.id) {
                observer.disconnect();
                return;
            }

            // 1. 过滤掉纯内部元素的变更，避免干扰
            const isPureInternal = mutations.every(m => {
                const target = m.target as HTMLElement;
                return target.id === 'gm-enhancer-toolbar-group' || target.closest('#gm-enhancer-toolbar-group');
            });
            if (isPureInternal) return;

            // 2. 只有当关键容器发生变化，或者 Body 发生结构性变化时才尝试刷新
            const isRelevant = mutations.some(m => {
                const target = m.target as HTMLElement;
                if (!target || !target.classList) return false;
                return target.classList.contains('video-toolbar-left') || 
                       target.classList.contains('toolbar-left') ||
                       target.tagName === 'BODY';
            });
            if (!isRelevant) return;

            // 3. 节流处理 (500ms)
            const now = Date.now();
            if (now - lastRun > 500) {
                this.refresh();
                lastRun = now;
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        this.refresh();
    }
}
