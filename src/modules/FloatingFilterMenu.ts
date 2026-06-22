/**
 * Floating Filter Menu Module
 * 为 B 站特定页面（投稿、搜索、稍后再看）提供一个精致的悬浮筛选菜单。
 */

import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';





export const FloatingFilterMenuModule: Module = {
    init: () => {
        createMenu();
        startVisibilityMonitor();
    }
};

/**
 * 判断当前是否为视频播放页
 */
function isPlaybackPage() {
    const path = window.location.pathname;
    return path.startsWith('/video/') || 
           path.startsWith('/bangumi/play/') ||
           path.startsWith('/list/');
}

/**
 * 启动可见性监听器 (适配 SPA)
 */
function startVisibilityMonitor() {
    const check = () => {
        const container = document.getElementById('gemini-floating-filter');
        if (!container) return;
        
        const shouldHide = isPlaybackPage();
        if (shouldHide) {
            container.style.display = 'none';
        } else {
            container.style.display = 'flex';
        }
    };

    // 初始检查
    check();
    
    // 定时检查以适配单页跳转
    setInterval(check, 1000);
}



function createMenu() {
    if (document.getElementById('gemini-floating-filter')) return;

    const container = document.createElement('div');
    container.id = 'gemini-floating-filter';
    container.innerHTML = `
        <div id="gemini-filter-panel">
            <div class="gemini-filter-row" id="gemini-duration-row">
                <span class="gemini-filter-label">时长筛选</span>
                <label class="gemini-switch">
                    <input type="checkbox" id="gemini-duration-enable">
                    <span class="gemini-slider"></span>
                </label>
                <div class="gemini-duration-controls" id="gemini-duration-controls">
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
                <span class="gemini-filter-label">分辨率过滤</span>
                <div class="gemini-checkbox-group">
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-8k">
                        <span>8K</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-4k">
                        <span>4K</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-2k">
                        <span>2K</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-1080p">
                        <span>1080P</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-720p">
                        <span>720P</span>
                    </label>
                    <label class="gemini-checkbox-item">
                        <input type="checkbox" id="gemini-filter-res-sd">
                        <span>SD</span>
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
                <div id="gemini-filter-reset" title="重置所有筛选器">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <polyline points="3 3 3 8 8 8"></polyline>
                    </svg>
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
    const resetBtn = document.getElementById('gemini-filter-reset')!;

    // === 拖动逻辑 ===
    let startX = 0;
    let startY = 0;
    let containerStartX = 0;
    let containerStartY = 0;
    let isDragging = false;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return; // 仅支持左键拖拽
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = container.getBoundingClientRect();
        containerStartX = rect.left;
        containerStartY = rect.top;
        
        hasMoved = false;
        isDragging = true;
        
        container.classList.add('gemini-dragging');
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        if (!hasMoved && Math.hypot(dx, dy) > 5) {
            hasMoved = true;
        }
        
        if (hasMoved) {
            let leftVal = containerStartX + dx;
            let topVal = containerStartY + dy;
            
            const rect = container.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            leftVal = Math.max(0, Math.min(window.innerWidth - width, leftVal));
            topVal = Math.max(0, Math.min(window.innerHeight - height, topVal));
            
            container.style.left = `${leftVal}px`;
            container.style.top = `${topVal}px`;
            container.style.transform = 'none';
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        container.classList.remove('gemini-dragging');
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        if (hasMoved) {
            const rect = container.getBoundingClientRect();
            const leftVal = rect.left;
            const topVal = rect.top;
            
            const pctX = Math.max(0, Math.min(100, (leftVal / window.innerWidth) * 100));
            const pctY = Math.max(0, Math.min(100, (topVal / window.innerHeight) * 100));
            
            container.style.left = `${pctX}%`;
            container.style.top = `${pctY}%`;
            container.style.transform = 'none';
            
            chrome.storage.sync.set({
                [STORAGE_KEYS.FILTER_PANEL_X]: pctX,
                [STORAGE_KEYS.FILTER_PANEL_Y]: pctY
            });
            
            // 根据按钮所在X轴百分比区间，动态更新对齐方向类名
            const alignClass = getAlignmentClass(pctX);
            container.classList.remove('gemini-align-left', 'gemini-align-right', 'gemini-align-center');
            container.classList.add(alignClass);
        } else {
            // 点击行为：展开面板
            panel.classList.add('active');
            toggle.classList.add('hidden');
            chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_PANEL_EXPANDED]: true });
        }
    };

    toggle.addEventListener('mousedown', onMouseDown);

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('active');
        toggle.classList.remove('hidden');
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_PANEL_EXPANDED]: false });
    });

    // === 重置确认逻辑 ===
    let resetTimer: number | null = null;
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (resetBtn.classList.contains('gemini-confirming')) {
            resetBtn.classList.remove('gemini-confirming');
            resetBtn.setAttribute('title', '重置所有筛选器');
            if (resetTimer) {
                clearTimeout(resetTimer);
                resetTimer = null;
            }
            chrome.storage.sync.set({
                [STORAGE_KEYS.DURATION_FILTER_ENABLE]: false,
                [STORAGE_KEYS.DURATION_FILTER_MIN]: 0,
                [STORAGE_KEYS.DURATION_FILTER_MAX]: 0,
                [STORAGE_KEYS.DURATION_FILTER_MODE]: 'hide',
                [STORAGE_KEYS.FILTER_LIKED]: false,
                [STORAGE_KEYS.FILTER_FAVORITED]: false,
                [STORAGE_KEYS.FILTER_DOWNLOADED]: false,
                [STORAGE_KEYS.HIDE_CHARGING]: 'off',
                [STORAGE_KEYS.FILTER_RESOLUTION_8K]: false,
                [STORAGE_KEYS.FILTER_RESOLUTION_4K]: false,
                [STORAGE_KEYS.FILTER_RESOLUTION_2K]: false,
                [STORAGE_KEYS.FILTER_RESOLUTION_1080P]: false,
                [STORAGE_KEYS.FILTER_RESOLUTION_720P]: false,
                [STORAGE_KEYS.FILTER_RESOLUTION_SD]: false
            });
        } else {
            resetBtn.classList.add('gemini-confirming');
            resetBtn.setAttribute('title', '再次点击确定重置');
            resetTimer = window.setTimeout(() => {
                resetBtn.classList.remove('gemini-confirming');
                resetBtn.setAttribute('title', '重置所有筛选器');
                resetTimer = null;
            }, 3000);
        }
    });

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

function updateDurationControlsState(enabled: boolean) {
    const controls = document.getElementById('gemini-duration-controls');
    const minInput = document.getElementById('gemini-duration-min') as HTMLInputElement;
    const maxInput = document.getElementById('gemini-duration-max') as HTMLInputElement;
    const modeSelect = document.getElementById('gemini-duration-mode') as HTMLSelectElement;
    if (controls) {
        if (enabled) {
            controls.classList.remove('gemini-disabled');
            minInput.disabled = false;
            maxInput.disabled = false;
            modeSelect.disabled = false;
        } else {
            controls.classList.add('gemini-disabled');
            minInput.disabled = true;
            maxInput.disabled = true;
            modeSelect.disabled = true;
        }
    }
}

function updateActiveBadgeState() {
    const keys = [
        STORAGE_KEYS.DURATION_FILTER_ENABLE,
        STORAGE_KEYS.FILTER_LIKED,
        STORAGE_KEYS.FILTER_FAVORITED,
        STORAGE_KEYS.FILTER_DOWNLOADED,
        STORAGE_KEYS.HIDE_CHARGING,
        STORAGE_KEYS.FILTER_RESOLUTION_8K,
        STORAGE_KEYS.FILTER_RESOLUTION_4K,
        STORAGE_KEYS.FILTER_RESOLUTION_2K,
        STORAGE_KEYS.FILTER_RESOLUTION_1080P,
        STORAGE_KEYS.FILTER_RESOLUTION_720P,
        STORAGE_KEYS.FILTER_RESOLUTION_SD
    ];
    
    chrome.storage.sync.get(keys, (res) => {
        const hasDuration = !!res[STORAGE_KEYS.DURATION_FILTER_ENABLE];
        const hasInteraction = !!res[STORAGE_KEYS.FILTER_LIKED] || 
                               !!res[STORAGE_KEYS.FILTER_FAVORITED] || 
                               !!res[STORAGE_KEYS.FILTER_DOWNLOADED];
        const hasResolution = !!res[STORAGE_KEYS.FILTER_RESOLUTION_8K] ||
                              !!res[STORAGE_KEYS.FILTER_RESOLUTION_4K] ||
                              !!res[STORAGE_KEYS.FILTER_RESOLUTION_2K] ||
                              !!res[STORAGE_KEYS.FILTER_RESOLUTION_1080P] ||
                              !!res[STORAGE_KEYS.FILTER_RESOLUTION_720P] ||
                              !!res[STORAGE_KEYS.FILTER_RESOLUTION_SD];
        let cMode = res[STORAGE_KEYS.HIDE_CHARGING];
        if (typeof cMode === 'boolean') cMode = cMode ? 'hide' : 'off';
        const hasCharging = cMode && cMode !== 'off';

        const isActive = hasDuration || hasInteraction || hasResolution || hasCharging;
        const toggle = document.getElementById('gemini-filter-toggle');
        if (toggle) {
            if (isActive) {
                toggle.classList.add('gemini-active');
            } else {
                toggle.classList.remove('gemini-active');
            }
        }
    });
}

/**
 * 根据 X 轴百分比坐标计算面板对齐类名，优化各区域展开方向
 */
function getAlignmentClass(pctX: number): string {
    if (pctX < 15) {
        // 左边缘：向右展开
        return 'gemini-align-left';
    } else if (pctX < 40) {
        // 靠左部分：向左展开
        return 'gemini-align-right';
    } else if (pctX <= 60) {
        // 中间部分：居中展开
        return 'gemini-align-center';
    } else if (pctX <= 85) {
        // 靠右部分：向右展开
        return 'gemini-align-left';
    } else {
        // 右边缘：向左展开
        return 'gemini-align-right';
    }
}

function bindData() {
    const durationEnable = document.getElementById('gemini-duration-enable') as HTMLInputElement;
    const durationMin = document.getElementById('gemini-duration-min') as HTMLInputElement;
    const durationMax = document.getElementById('gemini-duration-max') as HTMLInputElement;
    const durationMode = document.getElementById('gemini-duration-mode') as HTMLSelectElement;

    const filterLiked = document.getElementById('gemini-filter-liked') as HTMLInputElement;
    const filterFavorited = document.getElementById('gemini-filter-favorited') as HTMLInputElement;
    const filterDownloaded = document.getElementById('gemini-filter-downloaded') as HTMLInputElement;

    const filterRes8k = document.getElementById('gemini-filter-res-8k') as HTMLInputElement;
    const filterRes4k = document.getElementById('gemini-filter-res-4k') as HTMLInputElement;
    const filterRes2k = document.getElementById('gemini-filter-res-2k') as HTMLInputElement;
    const filterRes1080p = document.getElementById('gemini-filter-res-1080p') as HTMLInputElement;
    const filterRes720p = document.getElementById('gemini-filter-res-720p') as HTMLInputElement;
    const filterResSd = document.getElementById('gemini-filter-res-sd') as HTMLInputElement;

    const keys = [
        STORAGE_KEYS.DURATION_FILTER_ENABLE,
        STORAGE_KEYS.DURATION_FILTER_MIN,
        STORAGE_KEYS.DURATION_FILTER_MAX,
        STORAGE_KEYS.DURATION_FILTER_MODE,
        STORAGE_KEYS.HIDE_CHARGING,
        STORAGE_KEYS.FILTER_LIKED,
        STORAGE_KEYS.FILTER_FAVORITED,
        STORAGE_KEYS.FILTER_DOWNLOADED,
        STORAGE_KEYS.FILTER_PANEL_EXPANDED,
        STORAGE_KEYS.FILTER_RESOLUTION_8K,
        STORAGE_KEYS.FILTER_RESOLUTION_4K,
        STORAGE_KEYS.FILTER_RESOLUTION_2K,
        STORAGE_KEYS.FILTER_RESOLUTION_1080P,
        STORAGE_KEYS.FILTER_RESOLUTION_720P,
        STORAGE_KEYS.FILTER_RESOLUTION_SD,
        STORAGE_KEYS.FILTER_PANEL_X,
        STORAGE_KEYS.FILTER_PANEL_Y
    ];

    chrome.storage.sync.get(keys, (res) => {
        const container = document.getElementById('gemini-floating-filter')!;
        const expanded = !!res[STORAGE_KEYS.FILTER_PANEL_EXPANDED];
        const panel = document.getElementById('gemini-filter-panel')!;
        const toggle = document.getElementById('gemini-filter-toggle')!;
        
        const posX = res[STORAGE_KEYS.FILTER_PANEL_X] as number | undefined;
        const posY = res[STORAGE_KEYS.FILTER_PANEL_Y] as number | undefined;
        if (typeof posX === 'number' && typeof posY === 'number') {
            container.style.left = `${posX}%`;
            container.style.top = `${posY}%`;
            container.style.transform = 'none';
            const alignClass = getAlignmentClass(posX);
            container.classList.remove('gemini-align-left', 'gemini-align-right', 'gemini-align-center');
            container.classList.add(alignClass);
        } else {
            container.classList.remove('gemini-align-left', 'gemini-align-right');
            container.classList.add('gemini-align-center');
        }

        if (expanded) {
            panel.classList.add('active');
            toggle.classList.add('hidden');
        }

        durationEnable.checked = !!res[STORAGE_KEYS.DURATION_FILTER_ENABLE];
        durationMin.value = (res[STORAGE_KEYS.DURATION_FILTER_MIN] as number)?.toString() || '';
        durationMax.value = (res[STORAGE_KEYS.DURATION_FILTER_MAX] as number)?.toString() || '';
        durationMode.value = (res[STORAGE_KEYS.DURATION_FILTER_MODE] as string) || 'hide';
        
        updateDurationControlsState(durationEnable.checked);

        filterLiked.checked = !!res[STORAGE_KEYS.FILTER_LIKED];
        filterFavorited.checked = !!res[STORAGE_KEYS.FILTER_FAVORITED];
        filterDownloaded.checked = !!res[STORAGE_KEYS.FILTER_DOWNLOADED];

        filterRes8k.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_8K];
        filterRes4k.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_4K];
        filterRes2k.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_2K];
        filterRes1080p.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_1080P];
        filterRes720p.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_720P];
        filterResSd.checked = !!res[STORAGE_KEYS.FILTER_RESOLUTION_SD];

        let cMode = res[STORAGE_KEYS.HIDE_CHARGING] as string | boolean;
        if (typeof cMode === 'boolean') cMode = cMode ? 'hide' : 'off';
        updateSegment('gemini-charging-segmented', (cMode as string) || 'off');

        updateActiveBadgeState();
    });

    // 监听输入并更新
    durationEnable.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_ENABLE]: durationEnable.checked });
        updateDurationControlsState(durationEnable.checked);
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

    filterRes8k.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_8K]: filterRes8k.checked });
    });

    filterRes4k.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_4K]: filterRes4k.checked });
    });

    filterRes2k.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_2K]: filterRes2k.checked });
    });

    filterRes1080p.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_1080P]: filterRes1080p.checked });
    });

    filterRes720p.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_720P]: filterRes720p.checked });
    });

    filterResSd.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_RESOLUTION_SD]: filterResSd.checked });
    });

    // 分段选择器事件
    document.querySelectorAll('#gemini-charging-segmented .gemini-segment-item').forEach(item => {
        item.addEventListener('click', () => {
            const val = (item as HTMLElement).dataset.value;
            chrome.storage.sync.set({ [STORAGE_KEYS.HIDE_CHARGING]: val });
        });
    });

    // 监听外部存储变化
    chrome.storage.onChanged.addListener((changes) => {
        if (changes[STORAGE_KEYS.DURATION_FILTER_ENABLE]) {
            const enabled = !!changes[STORAGE_KEYS.DURATION_FILTER_ENABLE].newValue;
            durationEnable.checked = enabled;
            updateDurationControlsState(enabled);
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

        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_8K]) {
            filterRes8k.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_8K].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_4K]) {
            filterRes4k.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_4K].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_2K]) {
            filterRes2k.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_2K].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_1080P]) {
            filterRes1080p.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_1080P].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_720P]) {
            filterRes720p.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_720P].newValue;
        }
        if (changes[STORAGE_KEYS.FILTER_RESOLUTION_SD]) {
            filterResSd.checked = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_SD].newValue;
        }

        if (changes[STORAGE_KEYS.HIDE_CHARGING]) {
            let newVal = changes[STORAGE_KEYS.HIDE_CHARGING].newValue;
            if (typeof newVal === 'boolean') newVal = newVal ? 'hide' : 'off';
            updateSegment('gemini-charging-segmented', newVal as string);
        }

        updateActiveBadgeState();
    });
}
