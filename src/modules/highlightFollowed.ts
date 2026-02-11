// src/modules/highlightFollowed.ts
import { Module } from '../types';
import { showToast } from '../utils/toast'; // 复用之前的提示框

const STORAGE_KEY_ENABLE = 'enable_highlight_follow';
const STORAGE_KEY_LIST = 'follow_list_cache';
const STORAGE_KEY_TIME = 'follow_list_last_update';
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24小时缓存

// CSS 样式 (玫红色高亮)
const CSS = `
    .bili-followed-user {
        color: #ff005c !important;
        font-weight: bold;
        background-color: transparent !important;
        text-decoration: none !important;
    }
    .bili-followed-avatar img {
        box-shadow: 0 0 0 2px #ff005c !important;
        border-radius: 50%;
    }
`;

let isRunning = false;
let followSet: Set<number> = new Set();
let styleEl: HTMLStyleElement | null = null;

// === 辅助函数 ===
function getMyUID(): string | null {
    const match = document.cookie.match(/(?:^|; )DedeUserID=([^;]*)/);
    return match ? match[1] : null;
}

// 注入样式
function injectStyle() {
    if (document.getElementById('bili-highlight-style')) return;
    styleEl = document.createElement('style');
    styleEl.id = 'bili-highlight-style';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
}

// 移除样式
function removeStyle() {
    if (styleEl) {
        styleEl.remove();
        styleEl = null;
    }
    // 清理页面上已有的标记
    document.querySelectorAll('.bili-followed-user').forEach(el => el.classList.remove('bili-followed-user'));
    document.querySelectorAll('.bili-followed-avatar').forEach(el => el.classList.remove('bili-followed-avatar'));
    document.querySelectorAll('[data-bili-follow-checked]').forEach(el => el.removeAttribute('data-bili-follow-checked'));
}

// 核心高亮逻辑
function highlight() {
    if (!isRunning || followSet.size === 0) return;

    const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
    links.forEach((link) => {
        // 类型断言，确保它是 HTMLAnchorElement
        const anchor = link as HTMLAnchorElement;

        if (anchor.dataset.biliFollowChecked) return;

        const match = anchor.href.match(/space\.bilibili\.com\/(\d+)/);
        if (!match) return;

        const uid = parseInt(match[1]);

        if (followSet.has(uid)) {
            const img = anchor.querySelector('img');
            if (img) {
                anchor.classList.add('bili-followed-avatar');
            } else if (anchor.innerText.trim().length > 0) {
                if (!anchor.classList.contains('bili-header-m-avatar-icon')) {
                    anchor.classList.add('bili-followed-user');
                }
            }
        }
        anchor.dataset.biliFollowChecked = "true";
    });
}

// === 数据同步 ===
async function syncFollowList(force = false): Promise<void> {
    const myUID = getMyUID();
    if (!myUID) {
        if (force) showToast("❌ 未登录，无法获取关注列表");
        return;
    }

    // 检查缓存
    const result = await chrome.storage.local.get([STORAGE_KEY_LIST, STORAGE_KEY_TIME]);
    
    // 🔥 修复点：添加 'as number[]' 类型断言
    const cachedList = (result[STORAGE_KEY_LIST] || []) as number[];
    
    // 强制转换为 number (虽然存储时是number，但为了保险)
    const lastUpdate = (result[STORAGE_KEY_TIME] || 0) as number;
    const now = Date.now();

    if (!force && cachedList.length > 0 && (now - lastUpdate < CACHE_TIME)) {
        followSet = new Set(cachedList);
        highlight(); // 立即执行一次
        return;
    }

    if (force) showToast("🔄 开始同步关注列表...");

    // ... (后面的代码保持不变) ...
    // 开始从 API 拉取
    let allFollowings: number[] = [];
    let page = 1;
    const pageSize = 50;
    let keepFetching = true;

    try {
        while (keepFetching) {
            // 请求 Background 代理
            const response = await chrome.runtime.sendMessage({ 
                action: 'fetchFollowList', 
                vmid: myUID, 
                page, 
                pageSize 
            });

            if (response && response.success && response.data && response.data.code === 0) {
                const list = response.data.data.list;
                if (list && list.length > 0) {
                    const uids = list.map((u: any) => u.mid);
                    allFollowings = allFollowings.concat(uids);
                    
                    if (list.length < pageSize) {
                        keepFetching = false; // 最后一页
                    } else {
                        page++; // 下一页
                        // 稍微延时，防封控
                        await new Promise(r => setTimeout(r, 200));
                    }
                } else {
                    keepFetching = false;
                }
            } else {
                console.warn("API Error or End", response);
                keepFetching = false;
            }
        }

        // 保存数据
        if (allFollowings.length > 0) {
            await chrome.storage.local.set({
                [STORAGE_KEY_LIST]: allFollowings,
                [STORAGE_KEY_TIME]: now
            });
            followSet = new Set(allFollowings);
            highlight();
            if (force) showToast(`✅ 同步完成，共 ${allFollowings.length} 人`);
        } else {
            if (force) showToast("⚠️ 未获取到关注数据");
        }

    } catch (e) {
        console.error(e);
        if (force) showToast("❌ 同步失败");
    }
}

// === 模块控制 ===
function start() {
    if (isRunning) return;
    isRunning = true;
    injectStyle();
    
    // 初始化时尝试同步（读取缓存或更新）
    syncFollowList(false);

    // 监听 DOM 变化持续高亮
    const observer = new MutationObserver(() => highlight());
    observer.observe(document.body, { childList: true, subtree: true });
    
    // 保存 observer 引用以便 stop 时断开 (这里简化处理，暂未保存，仅用 isRunning 控制逻辑)
}

function stop() {
    isRunning = false;
    removeStyle();
    // 实际项目中可以 disconnect observer，但因为我们是单页应用，
    // 这里简单通过 isRunning 标志位让 highlight 函数空转即可。
}

export const HighlightFollowedModule: Module = {
    init: () => {
        // 1. 读取开关设置
        chrome.storage.sync.get([STORAGE_KEY_ENABLE], (result) => {
            const shouldEnable = result[STORAGE_KEY_ENABLE] !== undefined ? result[STORAGE_KEY_ENABLE] : true;
            if (shouldEnable) start();
        });

        // 2. 监听开关变化
        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEY_ENABLE]) {
                changes[STORAGE_KEY_ENABLE].newValue ? start() : stop();
            }
        });

        // 3. 监听来自 Popup 的“强制更新”消息
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'forceUpdateFollowList') {
                if (isRunning) syncFollowList(true);
                else showToast("请先开启高亮功能");
            }
        });
    }
};