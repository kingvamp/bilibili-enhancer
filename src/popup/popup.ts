// src/popup/popup.ts
import { STORAGE_KEYS } from '../constants';

// === 1. 辅助函数 ===
function setupToggle(element: HTMLInputElement | null, key: string, defaultValue: boolean = true) {
    if (!element) return;
    chrome.storage.sync.get([key], (result) => {
        const val = (result[key] !== undefined ? result[key] : defaultValue) as boolean;
        element.checked = val;
    });
    element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
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
const toggleHideCharging = document.getElementById('toggle-hide-charging') as HTMLInputElement;
const toggleDownloadVideo = document.getElementById('toggle-download-video') as HTMLInputElement;

// 缩略图增强 - 状态与样式 (Radio 组)
const statusRadios = document.querySelectorAll('input[name="status-mode"]');

// 社交增强
const toggleHighlight = document.getElementById('toggle-highlight') as HTMLInputElement;
const btnUpdate = document.getElementById('btn-force-update') as HTMLButtonElement;
const inputFavId = document.getElementById('input-fav-id') as HTMLInputElement;


// === 3. 初始化简单开关 ===
setupToggle(toggleMs, STORAGE_KEYS.MS_DISPLAY);
setupToggle(toggleHighlight, STORAGE_KEYS.HIGHLIGHT);
setupToggle(toggleThumbRes, STORAGE_KEYS.THUMB_RES);
setupToggle(toggleThumbPCount, STORAGE_KEYS.THUMB_PCOUNT);
setupToggle(toggleHideCharging, STORAGE_KEYS.HIDE_CHARGING);
setupToggle(toggleDownloadVideo, 'enable_download_video', false);


// === 4. 初始化封面尺寸选择 (Radio) ===
if (coverRadios.length > 0) {
    // A. 初始化回显
    chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
        const val = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
        
        // 找到对应的 Radio 并选中
        coverRadios.forEach((radio) => {
            const r = radio as HTMLInputElement;
            if (r.value === val) {
                r.checked = true;
            }
        });
    });

    // B. 绑定点击事件
    coverRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            // 直接保存 value ('off', 'small', 'medium', 'large')
            chrome.storage.sync.set({ [STORAGE_KEYS.COVER_SIZE]: target.value });
        });
    });
}


// === 5. 初始化缩略图状态 (Radio) ===
if (statusRadios.length > 0) {
    // A. 初始化回显
    chrome.storage.sync.get([STORAGE_KEYS.THUMB_STATUS, STORAGE_KEYS.THUMB_STYLE], (result) => {
        const isEnable = (result[STORAGE_KEYS.THUMB_STATUS] ?? true) as boolean;
        const style = (result[STORAGE_KEYS.THUMB_STYLE] || 'text') as string;

        let targetValue = 'off';
        if (isEnable) {
            targetValue = style === 'triangle' ? 'triangle' : 'text';
        }

        statusRadios.forEach((radio) => {
            const r = radio as HTMLInputElement;
            if (r.value === targetValue) {
                r.checked = true;
            }
        });
    });

    // B. 绑定点击事件
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
// === 6. 初始化强制同步按钮 ===
if (btnUpdate) {
    // 联动逻辑：如果关闭高亮，隐藏同步按钮
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
            } else {
                console.warn("未找到活跃标签页");
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

// === 7. 初始化收藏夹设置 ===
if (inputFavId) {
    chrome.storage.sync.get(['fav_folder_id'], (result) => {
        inputFavId.value = (result['fav_folder_id'] as string) || '';
    });
    inputFavId.addEventListener('change', () => {
        chrome.storage.sync.set({ 'fav_folder_id': inputFavId.value.trim() });
    });

    // 联动逻辑：如果关闭下载，隐藏收藏夹设置
    if (toggleDownloadVideo) {
        const favContainer = inputFavId.closest('.setting-item') as HTMLElement;
        if (favContainer) {
            chrome.storage.sync.get(['enable_download_video'], (res) => {
                const val = res['enable_download_video'] !== undefined ? res['enable_download_video'] : false;
                favContainer.style.display = val ? 'flex' : 'none';
            });
            toggleDownloadVideo.addEventListener('change', () => {
                favContainer.style.display = toggleDownloadVideo.checked ? 'flex' : 'none';
            });
        }
    }
}

// === 7. 自动显示当前版本号 ===
const versionEl = document.getElementById('app-version');
if (versionEl) {
    // 获取 manifest.json 对象
    const manifest = chrome.runtime.getManifest();
    // 自动填充版本号 (例如: "v1.0.0")
    versionEl.innerText = `v${manifest.version}`;
}

// === 8. GitHub 链接跳转 ===
const githubLink = document.getElementById('github-star');
if (githubLink) {
    githubLink.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/kingvamp/bilibili-enhancer' });
    });
}