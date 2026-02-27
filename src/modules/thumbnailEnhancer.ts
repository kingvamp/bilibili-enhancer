import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

// === CSS 样式定义 ===
const CSS_COMMON = `
    /* 强制父元素相对定位 */
    .b-link-cover, .bili-res-parent { position: relative !important; overflow: visible !important; }

    /* 分辨率徽章 */
    .bili-res-badge {
        position: absolute; top: 0px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.75); color: #fff; padding: 1px 5px;
        border-radius: 3px; font-size: 11px; font-weight: bold;
        z-index: 998; pointer-events: none; backdrop-filter: blur(2px);
        border: 1px solid rgba(255,255,255,0.15); white-space: nowrap; line-height: 1.2;
    }
    .res-8k { background: linear-gradient(45deg, #d4af37, #f7e98d); color: #333; border: none; }
    
    /* 分P数徽章 */
    .bili-p-count {
        position: absolute; top: 0px; left: 0px;
        background: rgba(0, 0, 0, 0.85); color: #fff; padding: 0 4px;
        border-radius: 3px; font-size: 10px; z-index: 998; pointer-events: none;
        border: 1px solid rgba(255,255,255,0.1); line-height: 1.4;
    }
`;

const CSS_TEXT_MODE = `
    .my-status-tag {
        position: absolute; top: 0px; right: 0px; color: white;
        padding: 2px 4px; border-radius: 4px; font-size: 12px;
        z-index: 999; pointer-events: none; line-height: 1;
        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }
    .tag-fav { background-color: #ff6699; }
    .tag-like { background-color: #00AEEC; }
`;

const CSS_TRIANGLE_MODE = `
    .my-status-tag {
        position: absolute; top: 0; right: 0; width: 0; height: 0;
        z-index: 999; pointer-events: none;
        border-top: 24px solid; border-left: 24px solid transparent;
        filter: drop-shadow(-1px 1px 1px rgba(0,0,0,0.3));
    }
    .tag-fav { border-top-color: #fb7299; }
    .tag-like { border-top-color: #00AEEC; }
`;

// === 状态管理 ===
let settings = {
    enableStatus: true,
    enableRes: true,
    enablePCount: true,
    styleMode: 'text' // 'text' | 'triangle'
};
let isRunning = false;
let styleEl: HTMLStyleElement | null = null;
let scanTimer: any = null; 

// 缓存与队列
const globalCache = new Map<string, any>();
const taskQueue: { bvid: string; element: HTMLElement }[] = [];
let isProcessing = false;

// === 辅助函数 ===
function injectStyle() {
    if (document.getElementById('bili-thumb-enhancer-style')) return;
    styleEl = document.createElement('style');
    styleEl.id = 'bili-thumb-enhancer-style';
    updateStyleContent();
    document.head.appendChild(styleEl);
}

function updateStyleContent() {
    if (!styleEl) return;
    const modeCss = settings.styleMode === 'triangle' ? CSS_TRIANGLE_MODE : CSS_TEXT_MODE;
    styleEl.textContent = CSS_COMMON + modeCss;
}

function getResolutionLabel(width: number, height: number) {
    const maxDim = Math.max(width, height);
    if (maxDim >= 7680) return { text: '8K', class: 'res-8k' };
    if (maxDim >= 3840) return { text: '4K', class: 'res-normal' };
    if (maxDim >= 2560) return { text: '2K', class: 'res-normal' };
    if (maxDim >= 1920) return { text: '1080P', class: 'res-normal' };
    if (maxDim >= 1280) return { text: '720P', class: 'res-normal' };
    return { text: 'SD', class: 'res-normal' };
}

function extractBvid(url: string | null): string | null {
    const match = url && url.match(/(BV[a-zA-Z0-9]{10})/);
    return match ? match[1] : null;
}

// === 渲染逻辑 ===
function render(element: HTMLElement, data: any) {
    if (!data) return;

    // 1. 状态 (收藏/点赞)
    const existingStatus = element.querySelector('.my-status-tag');
    if (existingStatus) existingStatus.remove();
    
    // 判断逻辑：只要 fav 或 like 有效就渲染
    if (settings.enableStatus && data.status && (data.status.fav || data.status.like)) {
        // 优先显示收藏，其次显示点赞
        const type = data.status.fav ? 'fav' : 'like';
        const tag = document.createElement('div');
        tag.className = `my-status-tag tag-${type}`;
        if (settings.styleMode === 'text') {
            tag.innerText = type === 'fav' ? '已收藏' : '已点赞';
        }
        element.appendChild(tag);
    }

    // 2. 分辨率
    const existingRes = element.querySelector('.bili-res-badge');
    if (existingRes) existingRes.remove();

    if (settings.enableRes && data.resolution && data.resolution.text) {
        const badge = document.createElement('div');
        badge.className = `bili-res-badge ${data.resolution.class || ''}`;
        badge.innerText = data.resolution.text;
        element.appendChild(badge);
    }

    // 3. 分P数
    const existingPCount = element.querySelector('.bili-p-count');
    if (existingPCount) existingPCount.remove();

    if (settings.enablePCount && data.pageCount && data.pageCount > 1) {
        const badge = document.createElement('div');
        badge.className = 'bili-p-count';
        badge.innerText = data.pageCount + 'P';
        element.appendChild(badge);
    }
}

// === 队列处理 ===
function processQueue() {
    if (isProcessing || taskQueue.length === 0) return;
    isProcessing = true;
    
    const task = taskQueue.shift();
    if (!task) { isProcessing = false; return; }
    
    const { bvid, element } = task;

    const cached = globalCache.get(bvid);
    let needFetch = false;

    if (!cached) {
        needFetch = true;
    } else {
        if (settings.enableStatus && cached.status === undefined) needFetch = true;
        if ((settings.enableRes || settings.enablePCount) && cached.resolution === undefined) needFetch = true;
    }

    if (!needFetch && cached) {
        render(element, cached);
        isProcessing = false;
        requestAnimationFrame(processQueue);
        return;
    }

    // 准备 API 请求
    const requests: Promise<any>[] = [];

    // 请求 1: 互动状态
    if (settings.enableStatus && (!cached || cached.status === undefined)) {
        requests.push(new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'fetchVideoRelation', bvid }, res => {
                if (res && res.success && res.data && res.data.code === 0) {
                    // 🔥 核心修复：使用 !! 强制转换为 boolean，兼容 1 和 true
                    resolve({ 
                        fav: !!res.data.data.favorite, 
                        like: !!res.data.data.like 
                    });
                } else {
                    resolve(null);
                }
            });
        }));
    } else {
        requests.push(Promise.resolve(cached ? cached.status : null));
    }

    // 请求 2: 视频信息
    if ((settings.enableRes || settings.enablePCount) && (!cached || cached.resolution === undefined)) {
        requests.push(new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'fetchVideoInfo', bvid }, res => {
                if (res && res.success && res.data && res.data.code === 0) {
                    const d = res.data.data;
                    let resolution = null;
                    if (d.dimension) {
                        resolution = getResolutionLabel(d.dimension.width, d.dimension.height);
                    }
                    resolve({ resolution, pageCount: d.videos || 1 });
                } else {
                    resolve(null);
                }
            });
        }));
    } else {
        requests.push(Promise.resolve(cached ? { resolution: cached.resolution, pageCount: cached.pageCount } : null));
    }

    Promise.all(requests).then(([statusData, infoData]) => {
        const finalData = {
            status: statusData,
            resolution: infoData?.resolution,
            pageCount: infoData?.pageCount
        };
        
        globalCache.set(bvid, finalData);
        render(element, finalData);

        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, 50);
    });
}

// === 页面扫描 ===
function scanPage() {
    if (!isRunning) return;

    const links = document.querySelectorAll('a[href*="BV"]');
    
    links.forEach(link => {
        const anchor = link as HTMLAnchorElement;
        if (anchor.dataset.biliEnhancedProcessed) return;

        if (anchor.closest('.bili-header, .mini-header, .user-card, .v-popover-content')) return;

        const hasImg = anchor.querySelector('img') || anchor.querySelector('picture') || anchor.classList.contains('cover');
        if (!hasImg) return;

        const bvid = extractBvid(anchor.href);
        if (bvid) {
            anchor.dataset.biliEnhancedProcessed = "true";
            anchor.dataset.targetBvid = bvid;
            anchor.classList.add('bili-res-parent'); 
            viewportObserver.observe(anchor);
        }
    });
}

const viewportObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const link = entry.target as HTMLElement;
            const bvid = link.dataset.targetBvid;
            if (bvid) {
                taskQueue.push({ bvid, element: link });
                processQueue();
                viewportObserver.unobserve(link);
            }
        }
    });
}, { rootMargin: "100px" });

// === 核心逻辑：即时刷新 ===
function refreshAllElements() {
    const processed = document.querySelectorAll('a[data-bili-enhanced-processed="true"]');
    processed.forEach(el => {
        const element = el as HTMLElement;
        const bvid = element.dataset.targetBvid;
        if (bvid) {
            taskQueue.push({ bvid, element });
        }
    });
    processQueue();
}

// === 模块控制 ===
function start() {
    if (isRunning) return;
    isRunning = true;
    injectStyle();
    
    if (location.pathname.startsWith('/video/')) {
        setTimeout(scanPage, 1500);
    } else {
        scanPage();
    }
    
    const observer = new MutationObserver(() => {
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = setTimeout(scanPage, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

export const ThumbnailEnhancerModule: Module = {
    init: () => {
        chrome.storage.sync.get([
            STORAGE_KEYS.THUMB_STATUS,
            STORAGE_KEYS.THUMB_RES,
            STORAGE_KEYS.THUMB_PCOUNT,
            STORAGE_KEYS.THUMB_STYLE
        ], (result) => {
            settings.enableStatus = (result[STORAGE_KEYS.THUMB_STATUS] ?? true) as boolean;
            settings.enableRes = (result[STORAGE_KEYS.THUMB_RES] ?? true) as boolean;
            settings.enablePCount = (result[STORAGE_KEYS.THUMB_PCOUNT] ?? true) as boolean;
            settings.styleMode = (result[STORAGE_KEYS.THUMB_STYLE] || 'text') as string;

            if (settings.enableStatus || settings.enableRes || settings.enablePCount) {
                start();
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            const keys = [STORAGE_KEYS.THUMB_STATUS, STORAGE_KEYS.THUMB_RES, STORAGE_KEYS.THUMB_PCOUNT, STORAGE_KEYS.THUMB_STYLE];
            if (keys.some(k => changes[k])) {
                if (changes[STORAGE_KEYS.THUMB_STATUS]) settings.enableStatus = changes[STORAGE_KEYS.THUMB_STATUS].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_RES]) settings.enableRes = changes[STORAGE_KEYS.THUMB_RES].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_PCOUNT]) settings.enablePCount = changes[STORAGE_KEYS.THUMB_PCOUNT].newValue as boolean;
                
                if (changes[STORAGE_KEYS.THUMB_STYLE]) {
                    settings.styleMode = changes[STORAGE_KEYS.THUMB_STYLE].newValue as string;
                    updateStyleContent();
                }

                if (!isRunning && (settings.enableStatus || settings.enableRes || settings.enablePCount)) {
                    start();
                }

                refreshAllElements();
            }
        });
    }
};