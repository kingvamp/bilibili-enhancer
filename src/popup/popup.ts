const STORAGE_KEY_MS = 'enable_ms_display';
const STORAGE_KEY_COVER = 'cover_preview_size'; // ⚠️ 注意：我改了个Key名，避免和之前的冲突

const toggleMs = document.getElementById('toggle-ms') as HTMLInputElement;
// 这里改成了 HTMLSelectElement
const selectCover = document.getElementById('select-cover-size') as HTMLSelectElement;

// 1. 处理毫秒开关 (逻辑不变)
if (toggleMs) {
    chrome.storage.sync.get([STORAGE_KEY_MS], (result) => {
        const isEnabled = (result[STORAGE_KEY_MS] !== undefined ? result[STORAGE_KEY_MS] : true) as boolean;
        toggleMs.checked = isEnabled;
    });
    toggleMs.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEY_MS]: toggleMs.checked });
    });
}

// 2. 处理封面大小 (新逻辑)
if (selectCover) {
    chrome.storage.sync.get([STORAGE_KEY_COVER], (result) => {
        // 默认值设为 'medium' (中)
        const val = (result[STORAGE_KEY_COVER] || 'medium') as string;
        selectCover.value = val;
    });

    selectCover.addEventListener('change', () => {
        chrome.storage.sync.set({ [STORAGE_KEY_COVER]: selectCover.value });
    });
}