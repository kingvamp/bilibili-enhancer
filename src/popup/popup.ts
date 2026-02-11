// src/popup/popup.ts

// === 配置项 Keys (必须与各模块中的保持一致) ===
const STORAGE_KEY_MS = 'enable_ms_display';
const STORAGE_KEY_COVER = 'cover_preview_size';
const STORAGE_KEY_HIGHLIGHT = 'enable_highlight_follow';

// === 获取 DOM 元素 ===
// 使用类型断言 (as HTML...) 方便后续获得代码提示和类型检查
const toggleMs = document.getElementById('toggle-ms') as HTMLInputElement;
const toggleHighlight = document.getElementById('toggle-highlight') as HTMLInputElement;
const selectCover = document.getElementById('select-cover-size') as HTMLSelectElement;
const btnUpdate = document.getElementById('btn-force-update') as HTMLButtonElement;

/**
 * 辅助函数：初始化并监听 Switch 开关 (Checkbox)
 * @param element Checkbox 元素
 * @param key Storage 存储键
 * @param defaultValue 默认值 (默认为 true)
 */
function setupToggle(element: HTMLInputElement | null, key: string, defaultValue: boolean = true) {
    if (!element) return;

    // 1. 初始化：从存储中读取状态
    chrome.storage.sync.get([key], (result) => {
        const val = (result[key] !== undefined ? result[key] : defaultValue) as boolean;
        element.checked = val;
    });

    // 2. 监听修改：保存到存储
    element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
    });
}

// === 1. 初始化各个开关 ===
setupToggle(toggleMs, STORAGE_KEY_MS);
setupToggle(toggleHighlight, STORAGE_KEY_HIGHLIGHT);

// === 2. 初始化封面尺寸选择 (Select 下拉框) ===
if (selectCover) {
    // 读取设置
    chrome.storage.sync.get([STORAGE_KEY_COVER], (result) => {
        // 默认为 'medium'
        const val = (result[STORAGE_KEY_COVER] || 'medium') as string;
        selectCover.value = val;
    });

    // 监听变化
    selectCover.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEY_COVER]: selectCover.value });
    });
}

// === 3. 初始化“强制同步”按钮 ===
if (btnUpdate) {
    btnUpdate.addEventListener('click', () => {
        // 给用户一点 UI 反馈，防止重复点击
        const originalText = btnUpdate.innerText;
        btnUpdate.innerText = "请求已发送...";
        btnUpdate.disabled = true;
        btnUpdate.style.cursor = "not-allowed";
        btnUpdate.style.opacity = "0.7";

        // 获取当前激活的标签页，发送消息
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // 确保有一个激活的标签页，并且它有 ID
            if (tabs[0] && tabs[0].id) {
                // 发送消息给 content.ts
                chrome.tabs.sendMessage(tabs[0].id, { action: 'forceUpdateFollowList' });
            } else {
                console.warn("未找到活跃标签页，无法发送同步请求");
            }
        });

        // 2秒后恢复按钮状态
        setTimeout(() => {
            btnUpdate.innerText = originalText;
            btnUpdate.disabled = false;
            btnUpdate.style.cursor = "pointer";
            btnUpdate.style.opacity = "1";
        }, 2000);
    });
}