// 保存设置的 Key
const STORAGE_KEY_MS = 'enable_ms_display';

const toggle = document.getElementById('toggle-ms') as HTMLInputElement;

// 1. 初始化：从存储中读取状态
chrome.storage.sync.get([STORAGE_KEY_MS], (result) => {
    // 默认为 true (如果没存过)
    const isEnabled = (result[STORAGE_KEY_MS] !== undefined ? result[STORAGE_KEY_MS] : true) as boolean;
    toggle.checked = isEnabled;
});

// 2. 监听修改：保存到存储
toggle.addEventListener('change', () => {
    chrome.storage.sync.set({ [STORAGE_KEY_MS]: toggle.checked });
});