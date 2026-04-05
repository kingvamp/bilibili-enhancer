import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { bvToAv } from '../bilibili';

// === CSS 样式定义 ===
const CSS = `
    /* 1. 封面悬停按钮样式 */
    .gm-quick-fav-hover {
        position: absolute; top: 4px; left: 4px; width: 26px; height: 26px;
        background-color: rgba(0, 0, 0, 0.65); color: white; border-radius: 50%;
        text-align: center; line-height: 26px; font-size: 14px; cursor: pointer;
        z-index: 1000; transition: all 0.2s; user-select: none; display: none;
        backdrop-filter: blur(4px); font-family: Arial, sans-serif;
        border: 1px solid rgba(255,255,255,0.2);
    }
    .b-link-cover:hover .gm-quick-fav-hover, 
    .bili-video-card:hover .gm-quick-fav-hover,
    .v-img:hover .gm-quick-fav-hover { display: block; }

    /* 兼容性修复：确保父级是相对定位 (仅对我们注入了按钮的元素生效) */
    .gm-fav-rel-parent { position: relative !important; overflow: visible !important; }

    /* 2. 视频页底栏按钮样式 */
    .gm-toolbar-fav-btn {
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; color: #61666d; transition: all 0.3s;
        margin-left: 18px; margin-right: 2px; font-size: 14px;
        line-height: 24px; user-select: none; flex-shrink: 0; position: relative; z-index: 10;
    }
    .gm-toolbar-fav-btn:hover { color: #00AEEC; }
    .gm-toolbar-fav-btn svg { width: 22px; height: 22px; margin-right: 6px; fill: currentColor; }
    [data-theme='dark'] .gm-toolbar-fav-btn { color: #aaa; }
    [data-theme='dark'] .gm-toolbar-fav-btn:hover { color: #00AEEC; }

    /* 成功状态 */
    .gm-fav-success { color: #00AEEC !important; }
`;

const ICONS = {
    heart: `<svg viewBox="0 0 1024 1024"><path d="M725.33 192c-85.33 0-160 42.67-213.33 106.67C458.67 234.67 384 192 298.67 192 157.87 192 42.67 307.2 42.67 448c0 256 309.33 448 469.33 448s469.33-192 469.33-448c0-140.8-115.2-256-256-256z"></path></svg>`,
    check: `<svg viewBox="0 0 1024 1024"><path d="M384 810.67L128 554.67l64-64 192 192L832 234.67l64 64z"></path></svg>`
};

let isEnabled = true;
let defaultFolderId: string | null = null;
let isRunning = false;

// === 核心工具 ===
const Utils = {
    getCsrf: () => (document.cookie.match(/bili_jct=([^;]+)/) || [])[1],

    getAid: (bvid: string): string | null => {
        const aid = bvToAv(bvid);
        if (!aid || aid === bvid) {
            console.error('[OneClickFav] bvToAv 转换失败 for', bvid);
            return null;
        }
        return aid;
    },

    getDefaultFolderId: async (): Promise<string | null> => {
        if (defaultFolderId) return defaultFolderId;
        
        try {
            const navRes = await fetch('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' });
            const navData = await navRes.json();
            if (navData.code !== 0 || !navData.data || !navData.data.isLogin) {
                console.error('[OneClickFav] User not logged in:', navData);
                return null;
            }
            
            const upMid = navData.data.mid;
            const url = `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${upMid}&type=2`;
            const listRes = await fetch(url, { credentials: 'include' });
            const data = await listRes.json();
            
            if (data.code === 0 && data.data && data.data.list) {
                const defaultFolder = data.data.list.find((f: any) => f.title === '默认收藏夹') || data.data.list[0];
                if (defaultFolder) {
                    defaultFolderId = defaultFolder.id.toString();
                    chrome.storage.local.set({ [STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID]: defaultFolderId });
                    return defaultFolderId;
                }
            }
            console.error('[OneClickFav] No favorite folder found:', data);
            return null;
        } catch (err) {
            console.error('[OneClickFav] Failed to fetch folder:', err);
            return null;
        }
    },

    doFavorite: async (aid: string, referer: string = location.href) => {
        const folderId = await Utils.getDefaultFolderId();
        if (!folderId) throw new Error('无法获取收藏夹');
        
        const csrf = Utils.getCsrf();
        if (!csrf) throw new Error('未授权 (未登录或 CSRF 缺失)');

        const url = 'https://api.bilibili.com/x/v3/fav/resource/deal';
        const body = new URLSearchParams({
            rid: aid,
            type: '2',
            add_media_ids: folderId,
            csrf: csrf
        });

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString(),
            credentials: 'include'
        });
        
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error(`WAF 拦截或非预期返回: ${text.slice(0, 100)}`);
        }

        const data = await res.json();
        const code = data.code;
        if (code === 0 || code === 11007) {
            return true;
        } else {
            throw new Error(data.message || `API错误(${code})`);
        }
    }
};

// === 模块 A: 封面悬停一键收藏 ===
const ThumbHoverPart = {
    process: () => {
        if (!isEnabled) return;
        const links = document.querySelectorAll('a[href*="/video/BV"]');
        links.forEach(link => {
            const anchor = link as HTMLAnchorElement;
            if (anchor.dataset.gmFavProcessed) return;

            // 搜索页优化：如果是标题 link (通常在 h1-h6 内)，或者是播放列表标题，跳过
            // 这样可以避免给标题注入按钮并破坏布局
            if (anchor.closest('h1, h2, h3, h4, h5, h6, .title, .info > .tit')) return;

            // 寻找封面容器：必须有图片或者是已知的封面类
            const cover = anchor.querySelector('img') || anchor.querySelector('picture') || 
                          anchor.classList.contains('cover') || 
                          anchor.classList.contains('bili-video-card__cover') ||
                          anchor.classList.contains('b-link-cover') ||
                          anchor.classList.contains('b-img');
            if (!cover) return;

            const bvidMatch = anchor.href.match(/(BV[a-zA-Z0-9]{10})/);
            if (!bvidMatch) return;
            const bvid = bvidMatch[1];

            anchor.dataset.gmFavProcessed = "true";
            
            // 确保样式生效 (使用我们自己的专用类名，避免全局 !important 冲突)
            anchor.classList.add('gm-fav-rel-parent'); 

            const btn = document.createElement('div');
            btn.className = 'gm-quick-fav-hover';
            btn.innerText = '❤+';
            btn.title = '一键收藏到默认收藏夹';
            
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (btn.dataset.loading === "true") return;
                btn.dataset.loading = "true";
                const originalText = btn.innerText;
                btn.innerText = "...";

                try {
                    const aid = Utils.getAid(bvid);
                    if (!aid) throw new Error('获取AID失败');
                    await Utils.doFavorite(aid);
                    btn.innerText = "✔";
                    btn.style.backgroundColor = "#4caf50";
                    setTimeout(() => btn.remove(), 1500);
                } catch (err) {
                    console.error('[OneClickFav]', err);
                    btn.innerText = "!";
                    btn.title = String(err);
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.dataset.loading = "false";
                    }, 2000);
                }
            };

            anchor.appendChild(btn);
        });
    }
};

// === 模块 B: 视频页底栏按钮 ===
const VideoPagePart = {
    lastBvid: '', // 用于追踪当前按钮对应的视频，一旦 URL 变了就重置按钮

    render: async () => {
        if (!isEnabled) return;
        const btnId = 'gm-one-click-fav-btn';
        let btn = document.getElementById(btnId);

        // 获取当前 URL 里的 BVID
        const bvidMatch = location.href.match(/(BV\w{10})/);
        const currentBvid = bvidMatch ? bvidMatch[1] : null;
        if (!currentBvid) return;

        // 如果动态切换了视频 (SPA)，重置现有的按钮状态
        if (btn && VideoPagePart.lastBvid !== currentBvid) {
            btn.innerHTML = ICONS.heart + '<span>一键收藏</span>';
            btn.classList.remove('gm-fav-success');
            btn.style.pointerEvents = 'auto';
            btn.dataset.loading = "false";
            VideoPagePart.lastBvid = currentBvid;
        }

        if (btn) return;

        // 寻找工具栏 (兼容不同版本UI)
        const toolbar = document.querySelector('.video-toolbar-left') || 
                        document.querySelector('.toolbar-left') || 
                        document.querySelector('.video-info-ops');
        if (!toolbar) return;

        btn = document.createElement('div');
        btn.id = btnId;
        btn.className = 'gm-toolbar-fav-btn';
        btn.innerHTML = ICONS.heart + '<span>一键收藏</span>';
        btn.title = '一键收藏到默认收藏夹';
        VideoPagePart.lastBvid = currentBvid;

        btn.onclick = async () => {
            if (btn!.dataset.loading === "true") return;
            
            // 每次点击时重新获取最新的 BVID (防止点击时的 URL 和初始化时的不一致)
            const clickBvidMatch = location.href.match(/(BV\w{10})/);
            const clickBvid = clickBvidMatch ? clickBvidMatch[1] : null;
            if (!clickBvid) return;

            btn!.dataset.loading = "true";
            const span = btn!.querySelector('span');
            if (span) span.innerText = '稍等...';

            try {
                const aid = Utils.getAid(clickBvid);
                if (!aid) throw new Error('获取AID失败');
                await Utils.doFavorite(aid);
                
                btn!.innerHTML = ICONS.check + '<span>已收藏</span>';
                btn!.classList.add('gm-fav-success');
                btn!.style.pointerEvents = 'none';
                VideoPagePart.lastBvid = clickBvid;
            } catch (err) {
                console.error('[OneClickFav]', err);
                if (span) span.innerText = '错误';
                setTimeout(() => {
                    if (span) span.innerText = '一键收藏';
                    btn!.dataset.loading = "false";
                }, 2000);
            }
        };

        toolbar.appendChild(btn);
    },

    initLoop: () => {
        setInterval(() => {
            const isVideoPage = location.pathname.startsWith('/video/') || 
                               location.pathname.startsWith('/list/') || 
                               location.href.includes('watchlater');
            if (isVideoPage) {
                VideoPagePart.render();
            }
        }, 2000);
    }
};


function injectStyle() {
    if (document.getElementById('gm-one-click-fav-style')) return;
    const style = document.createElement('style');
    style.id = 'gm-one-click-fav-style';
    style.textContent = CSS;
    document.head.appendChild(style);
}

function start() {
    if (isRunning) return;
    isRunning = true;
    injectStyle();

    // 1. 初始化列表监听
    ThumbHoverPart.process();
    const observer = new MutationObserver(() => ThumbHoverPart.process());
    observer.observe(document.body, { childList: true, subtree: true });

    // 2. 初始化视频页监听
    VideoPagePart.initLoop();
}

export const OneClickFavoriteModule: Module = {
    init: () => {
        chrome.storage.sync.get([STORAGE_KEYS.ONE_CLICK_FAVORITE], (result) => {
            isEnabled = (result[STORAGE_KEYS.ONE_CLICK_FAVORITE] as boolean) ?? true;
            if (isEnabled) {
                chrome.storage.local.get([STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID], (local) => {
                    defaultFolderId = (local[STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID] as string) || null;
                    start();
                });
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEYS.ONE_CLICK_FAVORITE]) {
                isEnabled = changes[STORAGE_KEYS.ONE_CLICK_FAVORITE].newValue as boolean;
                if (isEnabled && !isRunning) start();
            }
        });
    }
};
