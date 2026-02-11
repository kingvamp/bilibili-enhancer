// src/popup/popup.ts
import { STORAGE_KEYS } from '../constants';

// === 1. 获取 DOM 元素 (使用类型断言) ===

// 基础功能
const toggleMs = document.getElementById('toggle-ms') as HTMLInputElement;
const selectCover = document.getElementById('select-cover-size') as HTMLSelectElement;

// 关注高亮
const toggleHighlight = document.getElementById('toggle-highlight') as HTMLInputElement;
const btnUpdate = document.getElementById('btn-force-update') as HTMLButtonElement;

// 缩略图增强 (新增)
const toggleThumbStatus = document.getElementById('toggle-thumb-status') as HTMLInputElement;
const toggleThumbRes = document.getElementById('toggle-thumb-res') as HTMLInputElement;
const toggleThumbPCount = document.getElementById('toggle-thumb-pcount') as HTMLInputElement;
const selectThumbStyle = document.getElementById('select-thumb-style') as HTMLSelectElement;
const styleContainer = document.getElementById('style-select-container') as HTMLElement;

/**
 * 辅助函数：初始化并监听 Switch 开关 (Checkbox)
 * @param element Checkbox 元素
 * @param key Storage 存储键
 * @param defaultValue 默认值
 */
function setupToggle(element: HTMLInputElement | null, key: string, defaultValue: boolean = true) {
    if (!element) return;

    // 1. 初始化：从存储中读取状态
    chrome.storage.sync.get([key], (result) => {
        // 🔥 修复点：添加 'as boolean' 类型断言
        const val = (result[key] !== undefined ? result[key] : defaultValue) as boolean;
        element.checked = val;
    });

    // 2. 监听修改：保存到存储
    element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
    });
}

// === 2. 初始化普通开关 ===
setupToggle(toggleMs, STORAGE_KEYS.MS_DISPLAY);
setupToggle(toggleHighlight, STORAGE_KEYS.HIGHLIGHT);
setupToggle(toggleThumbRes, STORAGE_KEYS.THUMB_RES);
setupToggle(toggleThumbPCount, STORAGE_KEYS.THUMB_PCOUNT);

// === 3. 初始化带有联动逻辑的开关 (缩略图状态) ===
if (toggleThumbStatus) {
    setupToggle(toggleThumbStatus, STORAGE_KEYS.THUMB_STATUS);

    // 联动逻辑：当关闭"显示状态"时，隐藏"样式选择"下拉框
    const updateVisibility = () => {
        if (styleContainer) {
            styleContainer.style.display = toggleThumbStatus.checked ? 'flex' : 'none';
        }
    };

    toggleThumbStatus.addEventListener('change', updateVisibility);

    // 初始化时也检查一次显隐
    chrome.storage.sync.get([STORAGE_KEYS.THUMB_STATUS], (result) => {
        const isOn = (result[STORAGE_KEYS.THUMB_STATUS] ?? true) as boolean;
        if (styleContainer) {
            styleContainer.style.display = isOn ? 'flex' : 'none';
        }
    });
}

// === 4. 初始化下拉菜单 (Select) ===

// 封面预览尺寸
if (selectCover) {
    chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
        // 🔥 修复点：添加 'as string' 断言
        selectCover.value = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
    });

    selectCover.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.COVER_SIZE]: selectCover.value });
    });
}

// 缩略图状态样式 (文字/角标)
if (selectThumbStyle) {
    chrome.storage.sync.get([STORAGE_KEYS.THUMB_STYLE], (result) => {
        // 🔥 修复点：添加 'as string' 断言
        selectThumbStyle.value = (result[STORAGE_KEYS.THUMB_STYLE] || 'text') as string;
    });

    selectThumbStyle.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.THUMB_STYLE]: selectThumbStyle.value });
    });
}

// === 5. 初始化操作按钮 (强制同步) ===
if (btnUpdate) {
    btnUpdate.addEventListener('click', () => {
        // UI 反馈
        const originalText = btnUpdate.innerText;
        btnUpdate.innerText = "请求已发送...";
        btnUpdate.disabled = true;
        btnUpdate.style.cursor = "not-allowed";
        btnUpdate.style.opacity = "0.7";

        // 发送消息给当前标签页
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'forceUpdateFollowList' });
            } else {
                console.warn("未找到活跃标签页");
            }
        });

        // 2秒后恢复按钮
        setTimeout(() => {
            btnUpdate.innerText = originalText;
            btnUpdate.disabled = false;
            btnUpdate.style.cursor = "pointer";
            btnUpdate.style.opacity = "1";
        }, 2000);
    });
}