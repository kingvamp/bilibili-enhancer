/**
 * Floating Filter Menu Module
 * 为 B 站特定页面（投稿、搜索、稍后再看）提供一个精致的悬浮筛选菜单。
 */

import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

const MENU_STYLE = `
#gemini-floating-filter {
    position: fixed;
    left: 50%;
    top: 150px;
    transform: translateX(-50%);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    pointer-events: none;
}

#gemini-filter-toggle {
    pointer-events: auto;
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background: rgba(251, 114, 153, 0.9);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(251, 114, 153, 0.4);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

#gemini-filter-toggle:hover {
    transform: scale(1.1) rotate(15deg);
    background: rgba(251, 114, 153, 1);
}

#gemini-filter-toggle.hidden {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.5);
}

#gemini-filter-panel {
    pointer-events: auto;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
    width: max-content;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 12px 64px rgba(0, 0, 0, 0.15);
    padding: 12px 20px;
    opacity: 0;
    pointer-events: none;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

#gemini-filter-panel.active {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
}

.gemini-filter-row {
    display: flex;
    align-items: center;
    gap: 14px;
    white-space: nowrap;
}

.gemini-filter-label {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    min-width: 60px;
}

.gemini-filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.gemini-divider-v {
    width: 1px;
    height: 14px;
    background: rgba(0, 0, 0, 0.08);
}

#gemini-filter-close {
    margin-left: 8px;
    width: 24px;
    height: 24px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

#gemini-filter-close:hover {
    background: rgba(251, 114, 153, 0.1);
    color: #fb7299;
}

.gemini-sub-label {
    font-size: 12px;
    color: #6b7280;
}

.gemini-filter-input {
    width: 55px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    outline: none;
    text-align: center;
}

.gemini-filter-input:focus {
    border-color: #fb7299;
}

/* Switch styling */
.gemini-switch {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
}

.gemini-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.gemini-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e2e8f0;
    transition: .4s;
    border-radius: 18px;
}

.gemini-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

input:checked + .gemini-slider {
    background-color: #fb7299;
}

input:checked + .gemini-slider:before {
    transform: translateX(14px);
}

.gemini-select {
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    outline: none;
    cursor: pointer;
}

.gemini-segmented {
    display: flex;
    background: rgba(0, 0, 0, 0.04);
    padding: 2px;
    border-radius: 9px;
    gap: 1px;
}

.gemini-segment-item {
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.2s;
    color: #6b7280;
}

.gemini-segment-item:hover {
    color: #fb7299;
}

.gemini-segment-item.active {
    background: white;
    color: #fb7299;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.gemini-checkbox-group {
    display: flex;
    gap: 12px;
}

.gemini-checkbox-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #4b5563;
    cursor: pointer;
    user-select: none;
}

.gemini-checkbox-item input {
    accent-color: #fb7299;
    cursor: pointer;
    margin: 0;
}
`;



export const FloatingFilterMenuModule: Module = {
    init: () => {
        injectStyles();
        createMenu();
    }
};

function injectStyles() {
    if (document.getElementById('gemini-floating-filter-style')) return;
    const style = document.createElement('style');
    style.id = 'gemini-floating-filter-style';
    style.textContent = MENU_STYLE;
    document.head.appendChild(style);
}

function createMenu() {
    if (document.getElementById('gemini-floating-filter')) return;

    const container = document.createElement('div');
    container.id = 'gemini-floating-filter';
    container.innerHTML = `
        <div id="gemini-filter-panel">
            <div class="gemini-filter-row">
                <span class="gemini-filter-label">时长筛选</span>
                <label class="gemini-switch">
                    <input type="checkbox" id="gemini-duration-enable">
                    <span class="gemini-slider"></span>
                </label>
                <div class="gemini-divider-v"></div>
                <div class="gemini-filter-group">
                    <span class="gemini-sub-label">范围</span>
                    <input type="number" id="gemini-duration-min" class="gemini-filter-input" placeholder="0">
                    <span style="color:#cbd5e1">-</span>
                    <input type="number" id="gemini-duration-max" class="gemini-filter-input" placeholder="∞">
                </div>
                <div class="gemini-divider-v"></div>
                <div class="gemini-filter-group">
                    <span class="gemini-sub-label">模式</span>
                    <select id="gemini-duration-mode" class="gemini-select">
                        <option value="hide">完全隐藏</option>
                        <option value="dim">半透明</option>
                    </select>
                </div>
            </div>

            <div class="gemini-filter-row">
                <span class="gemini-filter-label">互动过滤</span>
                <div class="gemini-checkbox-group">
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-liked">
                        <span>已点赞</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-favorited">
                        <span>已收藏</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-downloaded">
                        <span>已下载</span>
                    </label>
                </div>
            </div>

            <div class="gemini-filter-row">
                <span class="gemini-filter-label">充电拦截</span>
                <div class="gemini-segmented" id="gemini-charging-segmented">
                    <div class="gemini-segment-item" data-value="off">已关闭</div>
                    <div class="gemini-segment-item" data-value="mask">显示遮罩</div>
                    <div class="gemini-segment-item" data-value="hide">完全隐藏</div>
                </div>
                <div id="gemini-filter-close" title="收起面板">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </div>
            </div>
        </div>
        <div id="gemini-filter-toggle" title="展开筛选菜单">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
        </div>
    `;

    document.body.appendChild(container);

    const toggle = document.getElementById('gemini-filter-toggle')!;
    const panel = document.getElementById('gemini-filter-panel')!;
    const closeBtn = document.getElementById('gemini-filter-close')!;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.add('active');
        toggle.classList.add('hidden');
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        toggle.classList.remove('hidden');
    });

    // 绑定数据
    bindData();
}

function updateSegment(id: string, value: string) {
    const parent = document.getElementById(id);
    if (!parent) return;
    parent.querySelectorAll('.gemini-segment-item').forEach(item => {
        if ((item as HTMLElement).dataset.value === value) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function bindData() {
    const durationEnable = document.getElementById('gemini-duration-enable') as HTMLInputElement;
    const durationMin = document.getElementById('gemini-duration-min') as HTMLInputElement;
    const durationMax = document.getElementById('gemini-duration-max') as HTMLInputElement;
    const durationMode = document.getElementById('gemini-duration-mode') as HTMLSelectElement;

    const filterLiked = document.getElementById('gemini-filter-liked') as HTMLInputElement;
    const filterFavorited = document.getElementById('gemini-filter-favorited') as HTMLInputElement;
    const filterDownloaded = document.getElementById('gemini-filter-downloaded') as HTMLInputElement;

    const keys = [
        STORAGE_KEYS.DURATION_FILTER_ENABLE,
        STORAGE_KEYS.DURATION_FILTER_MIN,
        STORAGE_KEYS.DURATION_FILTER_MAX,
        STORAGE_KEYS.DURATION_FILTER_MODE,
        STORAGE_KEYS.HIDE_CHARGING,
        STORAGE_KEYS.FILTER_LIKED,
        STORAGE_KEYS.FILTER_FAVORITED,
        STORAGE_KEYS.FILTER_DOWNLOADED
    ];

    chrome.storage.sync.get(keys, (res) => {
        durationEnable.checked = !!res[STORAGE_KEYS.DURATION_FILTER_ENABLE];
        durationMin.value = (res[STORAGE_KEYS.DURATION_FILTER_MIN] as number)?.toString() || '';
        durationMax.value = (res[STORAGE_KEYS.DURATION_FILTER_MAX] as number)?.toString() || '';
        durationMode.value = (res[STORAGE_KEYS.DURATION_FILTER_MODE] as string) || 'hide';
        
        filterLiked.checked = !!res[STORAGE_KEYS.FILTER_LIKED];
        filterFavorited.checked = !!res[STORAGE_KEYS.FILTER_FAVORITED];
        filterDownloaded.checked = !!res[STORAGE_KEYS.FILTER_DOWNLOADED];

        let cMode = res[STORAGE_KEYS.HIDE_CHARGING] as string | boolean;
        if (typeof cMode === 'boolean') cMode = cMode ? 'hide' : 'off';
        updateSegment('gemini-charging-segmented', (cMode as string) || 'off');
    });

    // 监听输入并更新
    durationEnable.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_ENABLE]: durationEnable.checked });
    });

    durationMin.addEventListener('input', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MIN]: parseInt(durationMin.value) || 0 });
    });

    durationMax.addEventListener('input', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MAX]: parseInt(durationMax.value) || 0 });
    });

    durationMode.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MODE]: durationMode.value });
    });

    filterLiked.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_LIKED]: filterLiked.checked });
    });

    filterFavorited.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_FAVORITED]: filterFavorited.checked });
    });

    filterDownloaded.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_DOWNLOADED]: filterDownloaded.checked });
    });

    // 分段选择器事件
    document.querySelectorAll('#gemini-charging-segmented .gemini-segment-item').forEach(item => {
        item.addEventListener('click', () => {
            const val = (item as HTMLElement).dataset.value;
            chrome.storage.sync.set({ [STORAGE_KEYS.HIDE_CHARGING]: val });
        });
    });

    // 监听外部存储变化（例如从 Popup 修改）
    chrome.storage.onChanged.addListener((changes) => {
        if (changes[STORAGE_KEYS.DURATION_FILTER_ENABLE]) {
            durationEnable.checked = !!changes[STORAGE_KEYS.DURATION_FILTER_ENABLE].newValue;
        }
        if (changes[STORAGE_KEYS.DURATION_FILTER_MIN]) {
            durationMin.value = (changes[STORAGE_KEYS.DURATION_FILTER_MIN].newValue as number)?.toString() || '';
        }
        if (changes[STORAGE_KEYS.DURATION_FILTER_MAX]) {
            durationMax.value = (changes[STORAGE_KEYS.DURATION_FILTER_MAX].newValue as number)?.toString() || '';
        }
        if (changes[STORAGE_KEYS.DURATION_FILTER_MODE]) {
            durationMode.value = changes[STORAGE_KEYS.DURATION_FILTER_MODE].newValue as string;
        }

        if (changes[STORAGE_KEYS.FILTER_LIKED]) {
            filterLiked.checked = !!changes[STORAGE_KEYS.FILTER_LIKED].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_FAVORITED]) {
            filterFavorited.checked = !!changes[STORAGE_KEYS.FILTER_FAVORITED].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_DOWNLOADED]) {
            filterDownloaded.checked = !!changes[STORAGE_KEYS.FILTER_DOWNLOADED].newValue;
        }

        if (changes[STORAGE_KEYS.HIDE_CHARGING]) {
            let newVal = changes[STORAGE_KEYS.HIDE_CHARGING].newValue;
            if (typeof newVal === 'boolean') newVal = newVal ? 'hide' : 'off';
            updateSegment('gemini-charging-segmented', newVal as string);
        }
    });
}
