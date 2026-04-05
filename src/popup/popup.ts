// src/popup/popup.ts
import { STORAGE_KEYS } from '../constants';

// === 1. 辅助函数 ===
function setupToggle(element: HTMLInputElement | null, key: string, defaultValue: boolean = true, callback?: (checked: boolean) => void) {
    if (!element) return;
    chrome.storage.sync.get([key], (result) => {
        const val = (result[key] !== undefined ? result[key] : defaultValue) as boolean;
        element.checked = val;
        if (callback) callback(val);
    });
    element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
        if (callback) callback(element.checked);
    });
}

// === 2. 获取 DOM 元素 ===

// 常规设置 - 开关
const toggleMs = document.getElementById('toggle-ms') as HTMLInputElement;

// 常规设置 - 封面尺寸 (Radio 组)
const coverRadios = document.querySelectorAll('input[name="cover-size"]');

// 缩略图增强 - 开关
const toggleThumbRes = document.getElementById('toggle-thumb-res') as HTMLInputElement;
const toggleThumbPCount = document.getElementById('toggle-thumb-pcount') as HTMLInputElement;
const toggleThumbDownloaded = document.getElementById('toggle-thumb-downloaded') as HTMLInputElement;
const toggleDownloadVideo = document.getElementById('toggle-download-video') as HTMLInputElement;

// 缩略图增强 - 状态与样式 (Radio 组)
const statusRadios = document.querySelectorAll('input[name="status-mode"]');

// 充电视频处理 (Radio 组)
const chargingRadios = document.querySelectorAll('input[name="charging-mode"]');

// 社交增强
const toggleHighlight = document.getElementById('toggle-highlight') as HTMLInputElement;
const btnUpdate = document.getElementById('btn-force-update') as HTMLButtonElement;


// 时长筛选
const toggleDurationFilter = document.getElementById('toggle-duration-filter') as HTMLInputElement;
const inputDurationMin = document.getElementById('input-duration-min') as HTMLInputElement;
const inputDurationMax = document.getElementById('input-duration-max') as HTMLInputElement;
const durationModeRadios = document.querySelectorAll('input[name="duration-mode"]');


// === 3. 初始化简单开关 ===
setupToggle(toggleMs, STORAGE_KEYS.MS_DISPLAY);
setupToggle(toggleHighlight, STORAGE_KEYS.HIGHLIGHT);
setupToggle(toggleThumbRes, STORAGE_KEYS.THUMB_RES);
setupToggle(toggleThumbPCount, STORAGE_KEYS.THUMB_PCOUNT);
setupToggle(toggleThumbDownloaded, STORAGE_KEYS.THUMB_DOWNLOADED);
setupToggle(toggleDownloadVideo, 'enable_download_video', false);

// Wait to initialize Duration Filter toggle to pass the callback


// === 4. 初始化封面尺寸选择 (Radio) ===
if (coverRadios.length > 0) {
    chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
        const val = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
        coverRadios.forEach((radio) => {
            const r = radio as HTMLInputElement;
            if (r.value === val) r.checked = true;
        });
    });

    coverRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            chrome.storage.sync.set({ [STORAGE_KEYS.COVER_SIZE]: target.value });
        });
    });
}


// === 5. 初始化缩略图状态 (Radio) ===
if (statusRadios.length > 0) {
    chrome.storage.sync.get([STORAGE_KEYS.THUMB_STATUS, STORAGE_KEYS.THUMB_STYLE], (result) => {
        const isEnable = (result[STORAGE_KEYS.THUMB_STATUS] ?? true) as boolean;
        const style = (result[STORAGE_KEYS.THUMB_STYLE] || 'text') as string;

        let targetValue = 'off';
        if (isEnable) {
            targetValue = style === 'triangle' ? 'triangle' : 'text';
        }

        statusRadios.forEach((radio) => {
            const r = radio as HTMLInputElement;
            if (r.value === targetValue) r.checked = true;
        });
    });

    statusRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const val = target.value;

            if (val === 'off') {
                chrome.storage.sync.set({ [STORAGE_KEYS.THUMB_STATUS]: false });
            } else {
                chrome.storage.sync.set({
                    [STORAGE_KEYS.THUMB_STATUS]: true,
                    [STORAGE_KEYS.THUMB_STYLE]: val
                });
            }
        });
    });
}


// === 6. 初始化充电视频处理 (Radio) ===
if (chargingRadios.length > 0) {
    chrome.storage.sync.get([STORAGE_KEYS.HIDE_CHARGING], (result) => {
        let val = result[STORAGE_KEYS.HIDE_CHARGING];
        if (typeof val === 'boolean') val = val ? 'hide' : 'off';
        if (!val) val = 'hide';

        chargingRadios.forEach((radio) => {
            const r = radio as HTMLInputElement;
            if (r.value === val) r.checked = true;
        });
    });

    chargingRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            chrome.storage.sync.set({ [STORAGE_KEYS.HIDE_CHARGING]: target.value });
        });
    });
}


// === 7. 初始化强制同步按钮与联动 ===
if (btnUpdate) {
    if (toggleHighlight) {
        chrome.storage.sync.get([STORAGE_KEYS.HIGHLIGHT], (res) => {
            const val = res[STORAGE_KEYS.HIGHLIGHT] !== undefined ? res[STORAGE_KEYS.HIGHLIGHT] : true;
            btnUpdate.style.display = val ? 'flex' : 'none';
        });
        toggleHighlight.addEventListener('change', () => {
            btnUpdate.style.display = toggleHighlight.checked ? 'flex' : 'none';
        });
    }

    btnUpdate.addEventListener('click', () => {
        const originalHTML = btnUpdate.innerHTML;
        btnUpdate.innerText = "请求已发送...";
        btnUpdate.disabled = true;
        btnUpdate.style.cursor = "not-allowed";
        btnUpdate.style.opacity = "0.7";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'forceUpdateFollowList' });
            }
        });

        setTimeout(() => {
            btnUpdate.innerHTML = originalHTML;
            btnUpdate.disabled = false;
            btnUpdate.style.cursor = "pointer";
            btnUpdate.style.opacity = "1";
        }, 2000);
    });
}


// === 9. 时长筛选逻辑 ===

// 辅助：秒转 MM:SS 或 SS
function secondsToText(seconds: number): string {
    if (seconds <= 0) return '';
    if (seconds < 60) return seconds.toString();
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 辅助：MM:SS 或 SS 转秒
function textToSeconds(text: string): number {
    const t = text.trim();
    if (!t) return 0;
    if (t.includes(':')) {
        const parts = t.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return parts[0] * 60 + parts[1];
        }
    }
    const s = parseInt(t);
    return isNaN(s) ? 0 : s;
}

if (toggleDurationFilter) {
    // A. 初始化数据回显
    chrome.storage.sync.get([
        STORAGE_KEYS.DURATION_FILTER_MIN,
        STORAGE_KEYS.DURATION_FILTER_MAX,
        STORAGE_KEYS.DURATION_FILTER_MODE
    ], (res) => {
        if (inputDurationMin) {
            inputDurationMin.value = secondsToText((res[STORAGE_KEYS.DURATION_FILTER_MIN] as number) || 0);
        }
        if (inputDurationMax) {
            inputDurationMax.value = secondsToText((res[STORAGE_KEYS.DURATION_FILTER_MAX] as number) || 0);
        }
        
        const mode = (res[STORAGE_KEYS.DURATION_FILTER_MODE] as string) || 'hide';
        durationModeRadios.forEach(radio => {
            const r = radio as HTMLInputElement;
            if (r.value === mode) r.checked = true;
        });
    });

    // B. 绑定事件
    if (inputDurationMin) {
        inputDurationMin.addEventListener('change', () => {
            chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MIN]: textToSeconds(inputDurationMin.value) });
        });
    }
    if (inputDurationMax) {
        inputDurationMax.addEventListener('change', () => {
            chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MAX]: textToSeconds(inputDurationMax.value) });
        });
    }
    durationModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            chrome.storage.sync.set({ [STORAGE_KEYS.DURATION_FILTER_MODE]: target.value });
        });
    });

    // 联动：如果关闭时长筛选，隐藏详细设置
    const container = toggleDurationFilter.closest('.section-group');
    if (container) {
        const allItems = container.querySelectorAll('.setting-item');
        const itemsToToggle = Array.from(allItems).slice(1); 
        
        const updateVisibility = (checked: boolean) => {
            const display = checked ? 'flex' : 'none';
            itemsToToggle.forEach(item => (item as HTMLElement).style.display = display);
        };

        // 初始化开关及联动
        setupToggle(toggleDurationFilter, STORAGE_KEYS.DURATION_FILTER_ENABLE, false, (checked) => {
            updateVisibility(checked);
        });
    }
}


// === 10. 页脚功能 ===
const versionEl = document.getElementById('app-version');
if (versionEl) {
    const manifest = chrome.runtime.getManifest();
    versionEl.innerText = `v${manifest.version}`;
}

const githubLink = document.getElementById('github-star');
if (githubLink) {
    githubLink.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/kingvamp/bilibili-enhancer' });
    });
}