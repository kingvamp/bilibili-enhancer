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

    private constructor() { }

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
        console.trace('[ToolbarManager] Refresh triggered!');
        if (this.isUpdating) return;

        const toolbar = document.querySelector('.video-toolbar-left') ||
            document.querySelector('.toolbar-left');
        if (!toolbar || !(toolbar instanceof HTMLElement)) {
            // 如果没找到工具栏，说明可能已经离开视频页，清空容器引用
            this.groupContainer = null;
            return;
        }

        this.isUpdating = true;
        try {
            let group = document.getElementById('gm-enhancer-toolbar-group');
            if (!group) {
                group = document.createElement('div');
                group.id = 'gm-enhancer-toolbar-group';
                group.className = 'gm-toolbar-group';
            }

            // 只有当 group 不在当前 toolbar 下时才执行插入
            if (group.parentElement !== toolbar) {
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

        this.items.forEach((item, index) => {
            let itemContainer = document.getElementById(item.id);
            if (!itemContainer) {
                itemContainer = document.createElement('div');
                itemContainer.id = item.id;
                itemContainer.className = 'gm-toolbar-item';
            }

            // 只有当位置不对时才执行 appendChild (减少 DOM 变动通知)
            if (this.groupContainer!.children[index] !== itemContainer) {
                this.groupContainer!.insertBefore(itemContainer, this.groupContainer!.children[index] || null);
            }

            item.render(itemContainer);
        });
    }

    /**
     * 启动监听 (SPA 兼容)
     */
    public startObserver() {
        let timer: any = null;

        // 1. 尝试寻找更窄的观察范围
        const targetNode = document.getElementById('app') || document.querySelector('.v-wrap') || document.body;

        const observer = new MutationObserver((mutations) => {
            if (!chrome.runtime?.id) {
                observer.disconnect();
                return;
            }

            const isRelevant = mutations.some(m => {
                const target = m.target as HTMLElement;
                if (!target || !target.classList) return false;

                // 排除顶栏和导航栏的日常闪烁，不理会它们的变动
                if (target.classList.contains('bili-header') || target.closest('.bili-header')) return false;

                // 仅关注工具栏或相关业务容器
                return target.classList.contains('video-toolbar-left') ||
                    target.classList.contains('toolbar-left') ||
                    target.id === 'arc_toolbar_report' ||
                    target.classList.contains('video-info-container');
            });

            if (isRelevant) {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => this.refresh(), 50);
            }
        });

        observer.observe(targetNode, { childList: true, subtree: true });
        this.refresh();
    }
}
