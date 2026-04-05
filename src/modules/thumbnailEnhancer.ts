import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

// === CSS 样式定义 ===
const CSS_COMMON = `
    /* 强制父元素相对定位 (仅对增强过的元素生效) */
    .bili-res-badge-parent { position: relative !important; overflow: visible !important; }

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

    /* 播放页标题已下载标识 */
    .bili-downloaded-title-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        font-size: 12px;
        color: #10b981;
        padding: 0 4px;
        border: 1px solid #10b981;
        border-radius: 4px;
        vertical-align: middle;
        font-weight: normal;
        height: 18px;
        line-height: 1;
        position: relative;
        top: -1px;
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
    .tag-downloaded { background-color: #10b981; }
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
    .tag-downloaded { border-top-color: #10b981; }
`;

// === 状态管理 ===
let settings = {
    enableStatus: true,
    enableRes: true,
    enablePCount: true,
    enableDownloaded: true,
    styleMode: 'text' // 'text' | 'triangle'
};
let isRunning = false;
let downloadHistory = new Set<string>();
let styleEl: HTMLStyleElement | null = null;
let scanTimer: any = null; 
let lastHref = location.href;

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

    // 1. 状态 (已下载 / 收藏 / 点赞)
    const existingStatus = element.querySelector('.my-status-tag');
    if (existingStatus) existingStatus.remove();
    
    const bvid = element.dataset.targetBvid;
    
    // 优先级：已下载 > 收藏 > 点赞
    let type: 'downloaded' | 'fav' | 'like' | null = null;
    
    if (settings.enableDownloaded && bvid && downloadHistory.has(bvid)) {
        type = 'downloaded';
    } else if (settings.enableStatus && data.status) {
        if (data.status.fav) type = 'fav';
        else if (data.status.like) type = 'like';
    }

    if (type) {
        const tag = document.createElement('div');
        tag.className = `my-status-tag tag-${type}`;
        if (settings.styleMode === 'text') {
            const labelsMap = {
                downloaded: '已下载',
                fav: '已收藏',
                like: '已点赞'
            };
            tag.innerText = labelsMap[type];
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
        // 性能优化：如果视频已下载，跳过互动状态查询（已下载优先级最高）
        if (settings.enableDownloaded && downloadHistory.has(bvid)) {
            requests.push(Promise.resolve(null));
        } else {
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
        }
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

        // 排除标题、头像等可能包含链接但不适合放角标的地方
        if (anchor.closest('.bili-header, .mini-header, .user-card, .v-popover-content, h1, h2, h3, h4, h5, h6, .title, .info > .tit')) return;

        const hasImg = anchor.querySelector('img') || anchor.querySelector('picture') || anchor.classList.contains('cover') || anchor.classList.contains('b-img');
        if (!hasImg) return;

        const bvid = extractBvid(anchor.href);
        if (bvid) {
            anchor.dataset.biliEnhancedProcessed = "true";
            anchor.dataset.targetBvid = bvid;
            anchor.classList.add('bili-res-badge-parent'); 
            
            // 性能优化：如果是已下载视频，立即进行初次渲染显示角标
            if (settings.enableDownloaded && downloadHistory.has(bvid)) {
                render(anchor, globalCache.get(bvid) || {});
            }
            
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

// === 下载历史获取 ===
function updateDownloadHistory() {
    chrome.runtime.sendMessage({ action: 'fetchDownloadHistory' }, res => {
        if (res && res.success && Array.isArray(res.data)) {
            downloadHistory = new Set(res.data);
            refreshAllElements();
            checkVideoPageTitle();
        } else if (res && res.cachedData) {
            // 如果请求失败但有缓存数据，使用缓存数据
            downloadHistory = new Set(res.cachedData);
            refreshAllElements();
            checkVideoPageTitle();
        }
    });
}

// === 播放页标题增强 ===
function checkVideoPageTitle() {
    if (!settings.enableDownloaded) return;
    
    // 支持 /video/ 和 /list/ (稍后观看等)
    const isVideoPage = location.pathname.startsWith('/video/') || location.pathname.startsWith('/list/');
    if (!isVideoPage) return;
    
    // 增加对 URL 参数 bvid 的支持
    const bvid = extractBvid(location.href);
    if (!bvid) return;

    const titleEl = document.querySelector('.video-title') as HTMLElement || document.querySelector('.tit') as HTMLElement;
    if (!titleEl) return;

    // 先清除旧的（支持列表切换刷新）
    const oldBadge = titleEl.querySelector('.bili-downloaded-title-badge');
    if (oldBadge) {
        if (oldBadge.getAttribute('data-bvid') === bvid) return; // 没变就不动
        oldBadge.remove();
    }

    if (downloadHistory.has(bvid)) {
        // 样式优化：确保标题容器是 flex 布局且允许换行，防止角标被生硬折行
        if (titleEl.tagName === 'H1' || titleEl.classList.contains('video-title')) {
            titleEl.style.display = 'flex';
            titleEl.style.flexWrap = 'wrap';
            titleEl.style.alignItems = 'center';
        }

        const badge = document.createElement('span');
        badge.className = 'bili-downloaded-title-badge';
        badge.setAttribute('data-bvid', bvid);
        badge.innerText = '已下载';
        // 强制不换行，且保持在文字流中
        badge.style.flexShrink = '0';
        badge.style.whiteSpace = 'nowrap';
        
        titleEl.appendChild(badge);
    }
}

// === 模块控制 ===
function start() {
    if (isRunning) return;
    isRunning = true;
    injectStyle();

    // 加载缓存的下载历史并启动实时拉取
    chrome.storage.local.get(['download_history'], (cache) => {
        if (cache && Array.isArray(cache.download_history)) {
            downloadHistory = new Set(cache.download_history as string[]);
        }
        updateDownloadHistory();
    });
    
    if (location.pathname.startsWith('/video/')) {
        setTimeout(() => {
            scanPage();
            checkVideoPageTitle();
        }, 1500);
    } else {
        scanPage();
    }
    
    const observer = new MutationObserver(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            checkVideoPageTitle();
        }
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = setTimeout(() => {
            scanPage();
            checkVideoPageTitle();
        }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 专门监听浏览器标签页标题变化（B站切换视频必改标题）
    const titleTag = document.querySelector('title');
    if (titleTag) {
        const titleTagObserver = new MutationObserver(() => {
            checkVideoPageTitle();
        });
        titleTagObserver.observe(titleTag, { childList: true });
    }

    // 兜底轮询 URL 变化
    setInterval(() => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            checkVideoPageTitle();
        }
    }, 1000);
}

export const ThumbnailEnhancerModule: Module = {
    init: () => {
        chrome.storage.sync.get([
            STORAGE_KEYS.THUMB_STATUS,
            STORAGE_KEYS.THUMB_RES,
            STORAGE_KEYS.THUMB_PCOUNT,
            STORAGE_KEYS.THUMB_DOWNLOADED,
            STORAGE_KEYS.THUMB_STYLE
        ], (result) => {
            settings.enableStatus = (result[STORAGE_KEYS.THUMB_STATUS] ?? true) as boolean;
            settings.enableRes = (result[STORAGE_KEYS.THUMB_RES] ?? true) as boolean;
            settings.enablePCount = (result[STORAGE_KEYS.THUMB_PCOUNT] ?? true) as boolean;
            settings.enableDownloaded = (result[STORAGE_KEYS.THUMB_DOWNLOADED] ?? true) as boolean;
            settings.styleMode = (result[STORAGE_KEYS.THUMB_STYLE] || 'text') as string;

            if (settings.enableStatus || settings.enableRes || settings.enablePCount || settings.enableDownloaded) {
                start();
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            const keys = [
                STORAGE_KEYS.THUMB_STATUS, 
                STORAGE_KEYS.THUMB_RES, 
                STORAGE_KEYS.THUMB_PCOUNT, 
                STORAGE_KEYS.THUMB_DOWNLOADED,
                STORAGE_KEYS.THUMB_STYLE
            ];
            if (keys.some(k => changes[k])) {
                if (changes[STORAGE_KEYS.THUMB_STATUS]) settings.enableStatus = changes[STORAGE_KEYS.THUMB_STATUS].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_RES]) settings.enableRes = changes[STORAGE_KEYS.THUMB_RES].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_PCOUNT]) settings.enablePCount = changes[STORAGE_KEYS.THUMB_PCOUNT].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_DOWNLOADED]) {
                    settings.enableDownloaded = changes[STORAGE_KEYS.THUMB_DOWNLOADED].newValue as boolean;
                    if (settings.enableDownloaded) updateDownloadHistory();
                }
                
                if (changes[STORAGE_KEYS.THUMB_STYLE]) {
                    settings.styleMode = changes[STORAGE_KEYS.THUMB_STYLE].newValue as string;
                    updateStyleContent();
                }

                if (!isRunning && (settings.enableStatus || settings.enableRes || settings.enablePCount || settings.enableDownloaded)) {
                    start();
                }

                refreshAllElements();
            }
        });
    }
};