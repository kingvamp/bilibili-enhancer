import { SELECTORS } from '../constants/selectors';
import { findVideoCardWrapper, extractBvid, findCoverInElement } from '../utils/dom';

/**
 * Filter Engine Service
 * 
 * 统一管理视频卡片的过滤状态与视觉表现。
 * 支持多个过滤器（时长、充电、互动）共同决策，并按优先级应用样式。
 */

export type FilterMode = 'off' | 'dim' | 'mask' | 'hide';

const MODE_PRIORITY: Record<FilterMode, number> = {
    'hide': 100,
    'mask': 50,
    'dim': 30,
    'off': 0
};

interface CardState {
    bvid: string | null;
    filters: Map<string, FilterMode>;
    currentMode: FilterMode;
}

export class FilterEngine {
    private static instance: FilterEngine;
    private states: Map<HTMLElement, CardState> = new Map();
    private observer: MutationObserver | null = null;
    private scanListeners: ((card: HTMLElement, bvid: string | null) => void)[] = [];
    private scanTimeout: number | undefined;

    private constructor() {}

    public static getInstance(): FilterEngine {
        if (!FilterEngine.instance) {
            FilterEngine.instance = new FilterEngine();
        }
        return FilterEngine.instance;
    }

    /**
     * 注册扫描监听器
     */
    public onScan(callback: (card: HTMLElement, bvid: string | null) => void) {
        this.scanListeners.push(callback);
        // 如果已经启动，立即扫一遍
        if (this.observer) this.scan();
    }

    /**
     * 应用过滤规则
     */
    public apply(card: HTMLElement, filterId: string, mode: FilterMode) {
        if (!this.states.has(card)) {
            this.states.set(card, {
                bvid: this.tryExtractBvid(card),
                filters: new Map(),
                currentMode: 'off'
            });
        }

        const state = this.states.get(card)!;
        state.filters.set(filterId, mode);
        this.recompute(card);
    }

    /**
     * 启动统一扫描引擎
     */
    public start() {
        if (this.observer) return;

        this.scan();
        this.observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length > 0)) {
                this.debouncedScan();
            }
        });
        this.observer.observe(document.body, { childList: true, subtree: true });

        // 定期检查（兜底）
        window.setInterval(() => this.scan(), 5000);
    }

    /**
     * 停止及清理
     */
    public stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        
        // 恢复所有状态
        this.states.forEach((state, card) => {
            state.filters.clear();
            this.recompute(card);
        });
        this.states.clear();
    }

    private debouncedScan() {
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = window.setTimeout(() => this.scan(), 200);
    }

    private scan() {
        const cards = document.querySelectorAll<HTMLElement>(SELECTORS.VIDEO_CARD.ENTITY.join(', '));
        cards.forEach(card => {
            let bvid = null;
            if (this.states.has(card)) {
                bvid = this.states.get(card)!.bvid;
            } else {
                bvid = this.tryExtractBvid(card);
            }
            
            this.scanListeners.forEach(cb => cb(card, bvid));
        });
    }

    private recompute(card: HTMLElement) {
        const state = this.states.get(card);
        if (!state) return;

        let maxPriority = -1;
        let finalMode: FilterMode = 'off';

        state.filters.forEach((mode) => {
            const priority = MODE_PRIORITY[mode];
            if (priority > maxPriority) {
                maxPriority = priority;
                finalMode = mode;
            }
        });

        if (state.currentMode !== finalMode) {
            this.applyStyle(card, finalMode, state.currentMode);
            state.currentMode = finalMode;
        }
    }

    private applyStyle(card: HTMLElement, mode: FilterMode, oldMode: FilterMode) {
        const wrapper = findVideoCardWrapper(card);
        
        // 1. 清理旧效果
        if (oldMode === 'hide') wrapper.style.removeProperty('display');
        if (oldMode === 'dim') wrapper.style.removeProperty('opacity');
        if (oldMode === 'mask') this.removeMask(card);

        // 2. 应用新效果
        switch (mode) {
            case 'hide':
                wrapper.style.setProperty('display', 'none', 'important');
                break;
            case 'dim':
                wrapper.style.setProperty('opacity', '0.2', 'important');
                break;
            case 'mask':
                this.addMask(card);
                break;
            case 'off':
            default:
                // 已经清理过了
                break;
        }
    }

    private tryExtractBvid(card: HTMLElement): string | null {
        // 复用之前的提取逻辑
        const links = card.querySelectorAll<HTMLAnchorElement>('a[href*="/video/BV"], a[href*="bvid=BV"]');
        for (const link of links) {
            const found = extractBvid(link.href) || extractBvid(link.getAttribute('href'));
            if (found) return found;
        }
        const withKey = card.querySelector('[data-key^="BV"]') as HTMLElement | null;
        if (withKey && withKey.dataset.key) return withKey.dataset.key;
        if (card.dataset.key?.startsWith('BV')) return card.dataset.key;
        if (card.dataset.targetBvid) return card.dataset.targetBvid;
        return null;
    }

    private addMask(card: HTMLElement) {
        const cover = findCoverInElement(card) || card;
        if (getComputedStyle(cover).position === 'static') {
            cover.style.position = 'relative';
        }

        let mask = cover.querySelector('.gemini-universal-mask');
        if (!mask) {
            mask = document.createElement('div');
            mask.className = 'gemini-universal-mask';
            // 参考 ChargingUI 的样式，但更通用
            mask.setAttribute('style', `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.65); z-index: 10;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(1px); border-radius: inherit;
                pointer-events: none; color: white;
            `);
            mask.innerHTML = `<span style="font-size:14px;">已屏蔽</span>`;
            cover.appendChild(mask);
        }
    }

    private removeMask(card: HTMLElement) {
        const cover = findCoverInElement(card) || card;
        const mask = cover.querySelector('.gemini-universal-mask');
        if (mask) mask.remove();
    }
}
