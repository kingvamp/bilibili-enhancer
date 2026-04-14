/**
 * Floating Filter Menu Module
 * 为 B 站特定页面（投稿、搜索、稍后再看）提供一个精致的悬浮筛选菜单。
 */

import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

const MENU_STYLE = `
#gemini-floating-filter {
    position: fixed;
    right: 20px;
    bottom: 80px;
    z-index: 10001;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

#gemini-filter-toggle {
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

#gemini-filter-panel {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 280px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    padding: 20px;
    transform: translateY(20px) scale(0.9);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: bottom right;
}

#gemini-filter-panel.active {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: auto;
}

.gemini-filter-section {
    margin-bottom: 20px;
}

.gemini-filter-section:last-child {
    margin-bottom: 0;
}

.gemini-filter-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.gemini-filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.gemini-filter-label {
    font-size: 13px;
    color: #4b5563;
}

.gemini-filter-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.gemini-filter-input {
    width: 60px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s;
}

.gemini-filter-input:focus {
    border-color: #fb7299;
}

/* Switch styling */
.gemini-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
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
    background-color: #cbd5e1;
    transition: .4s;
    border-radius: 20px;
}

.gemini-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
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
    transform: translateX(16px);
}

.gemini-select {
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    outline: none;
    cursor: pointer;
}

.gemini-filter-footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 11px;
    color: #9ca3af;
    text-align: center;
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
            <div class="gemini-filter-section">
                <div class="gemini-filter-title">
                    <span>⏱️</span> 时长筛选
                </div>
                <div class="gemini-filter-row">
                    <span class="gemini-filter-label">启用功能</span>
                    <label class="gemini-switch">
                        <input type="checkbox" id="gemini-duration-enable">
                        <span class="gemini-slider"></span>
                    </label>
                </div>
                <div class="gemini-filter-row">
                    <span class="gemini-filter-label">时长范围 (秒)</span>
                    <div class="gemini-filter-input-group">
                        <input type="number" id="gemini-duration-min" class="gemini-filter-input" placeholder="最小">
                        <span style="color:#9ca3af">-</span>
                        <input type="number" id="gemini-duration-max" class="gemini-filter-input" placeholder="最大">
                    </div>
                </div>
                <div class="gemini-filter-row">
                    <span class="gemini-filter-label">过滤模式</span>
                    <select id="gemini-duration-mode" class="gemini-select">
                        <option value="hide">完全隐藏</option>
                        <option value="dim">半透明</option>
                    </select>
                </div>
            </div>

            <div class="gemini-filter-section">
                <div class="gemini-filter-title">
                    <span>⚡</span> 充电拦截
                </div>
                <div class="gemini-filter-row">
                    <span class="gemini-filter-label">拦截模式</span>
                    <select id="gemini-charging-mode" class="gemini-select">
                        <option value="off">关闭</option>
                        <option value="mask">遮罩提示</option>
                        <option value="hide">完全隐藏</option>
                    </select>
                </div>
            </div>

            <div class="gemini-filter-footer">
                Bilibili Enhancer · 实验室功能
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

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target as Node)) {
            panel.classList.remove('active');
        }
    });

    // 绑定数据
    bindData();
}

function bindData() {
    const durationEnable = document.getElementById('gemini-duration-enable') as HTMLInputElement;
    const durationMin = document.getElementById('gemini-duration-min') as HTMLInputElement;
    const durationMax = document.getElementById('gemini-duration-max') as HTMLInputElement;
    const durationMode = document.getElementById('gemini-duration-mode') as HTMLSelectElement;
    const chargingMode = document.getElementById('gemini-charging-mode') as HTMLSelectElement;

    const keys = [
        STORAGE_KEYS.DURATION_FILTER_ENABLE,
        STORAGE_KEYS.DURATION_FILTER_MIN,
        STORAGE_KEYS.DURATION_FILTER_MAX,
        STORAGE_KEYS.DURATION_FILTER_MODE,
        STORAGE_KEYS.HIDE_CHARGING
    ];

    chrome.storage.sync.get(keys, (res) => {
        durationEnable.checked = !!res[STORAGE_KEYS.DURATION_FILTER_ENABLE];
        durationMin.value = (res[STORAGE_KEYS.DURATION_FILTER_MIN] as number)?.toString() || '';
        durationMax.value = (res[STORAGE_KEYS.DURATION_FILTER_MAX] as number)?.toString() || '';
        durationMode.value = (res[STORAGE_KEYS.DURATION_FILTER_MODE] as string) || 'hide';
        
        let cMode = res[STORAGE_KEYS.HIDE_CHARGING] as string | boolean;
        if (typeof cMode === 'boolean') cMode = cMode ? 'hide' : 'off';
        chargingMode.value = (cMode as string) || 'off';
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

    chargingMode.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.HIDE_CHARGING]: chargingMode.value });
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
        if (changes[STORAGE_KEYS.HIDE_CHARGING]) {
            let newVal = changes[STORAGE_KEYS.HIDE_CHARGING].newValue;
            if (typeof newVal === 'boolean') newVal = newVal ? 'hide' : 'off';
            chargingMode.value = newVal as string;
        }
    });
}
