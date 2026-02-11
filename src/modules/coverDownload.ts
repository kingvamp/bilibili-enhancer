// src/modules/coverDownload.ts
import { Module } from '../types';
import { COVER_SIZES, STORAGE_KEYS } from '../constants';
// 复用已有的 Key，实现设置同步
const STORAGE_KEY_COVER_SIZE = 'cover_preview_size';

const BUTTON_ID = 'bili-cover-download-btn-integrated';
const PREVIEW_ID = 'bili-cover-preview-img';
const COLORS = { DEFAULT: '#61666D', HOVER: '#00AEEC' };

// 当前预览尺寸 Key (默认为 medium)
let currentSizeKey = 'medium';

// SVG 图标
const SVG_ICON = `
    <svg viewBox="0 0 1024 1024" version="1.1" width="28" height="28" style="margin-right: 4px; flex-shrink: 0;">
        <path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zM336 448c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m528 352H160v-66.6l165.5-206.9c5.1-6.4 14.8-7.2 20.8-1.7l116.3 106.6 200.5-240.2c5.6-6.7 15.9-6.9 21.7-0.4L864 736v64z" fill="currentColor"></path>
    </svg>
`;

// === 工具函数 ===
function getCoverUrl(): string | null {
    const meta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
    if (meta) {
        let url = meta.content;
        if (url.startsWith('http:')) url = url.replace('http:', 'https:');
        if (url.indexOf('@') > -1) url = url.split('@')[0]; // 去除压缩参数
        return url;
    }
    return null;
}

function getBvId(): string {
    const match = window.location.href.match(/(BV\w{10,12})/);
    return match ? match[1] : 'unknown';
}

function sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// === 下载逻辑 (通过 Background 代理) ===
function downloadAction(container: HTMLElement) {
    const coverUrl = getCoverUrl();
    if (!coverUrl) {
        alert('❌ 未找到封面信息');
        return;
    }

    // UI 反馈
    const originalText = container.innerHTML;
    const textSpan = container.querySelector('.bili-cover-text') as HTMLElement;
    if(textSpan) textSpan.innerText = '下载中...';

    // 准备文件名
    const titleElement = document.querySelector('h1.video-title') || document.title;
    const titleText = (titleElement instanceof HTMLElement ? titleElement.innerText : titleElement) || 'cover';
    const bvId = getBvId();
    const fileName = sanitizeFileName(`${titleText} [${bvId}]`) + '.jpg';

    // 发送消息给后台下载
    chrome.runtime.sendMessage({ action: 'fetchImageBlob', url: coverUrl }, (response) => {
        if (response && response.success && response.data) {
            // response.data 是 base64 字符串
            const link = document.createElement('a');
            link.href = response.data; 
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            console.error('后台下载失败，尝试直接打开', response);
            window.open(coverUrl, '_blank');
        }

        // 恢复 UI
        if(textSpan) textSpan.innerText = '封面';
    });
}
// === 辅助函数：获取当前宽度的 CSS 字符串 ===
function getCurrentWidthStyle(): string {
    if (currentSizeKey === 'off') return '0px';
    // 从公共常量获取数字，并拼接 'px'
    const size = COVER_SIZES[currentSizeKey];
    return size ? `${size}px` : `${COVER_SIZES.medium}px`;
}
// === 注入按钮 ===
function injectButton(toolbar: HTMLElement) {
    if (document.getElementById(BUTTON_ID)) return;

    const container = document.createElement('div');
    container.id = BUTTON_ID;
    container.style.cssText = `
        display: inline-flex; align-items: center; justify-content: center;
        position: relative; cursor: pointer; margin-left: 6px; margin-right: 0px;
        color: ${COLORS.DEFAULT}; transition: color 0.3s; font-size: 14px;
        user-select: none; line-height: 24px;
    `;
    container.innerHTML = `${SVG_ICON}<span class="bili-cover-text" style="padding-top: 2px; min-width: 28px;">封面</span>`;

   // 预览图元素
    const previewImg = document.createElement('img');
    previewImg.id = PREVIEW_ID;
    previewImg.style.cssText = `
        display: none; position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%);
        border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        z-index: 10002; background: #fff; padding: 4px; border: 1px solid #e7e7e7;
        transition: width 0.2s ease;
    `;
    container.appendChild(previewImg);

    // 事件绑定
    const textSpan = container.querySelector('.bili-cover-text') as HTMLElement;
    container.onclick = () => downloadAction(container);

    container.onmouseenter = () => {
        container.style.color = COLORS.HOVER;
        textSpan.innerText = '下载';
        
        if (currentSizeKey === 'off') return;

        const url = getCoverUrl();
        if (url) {
            previewImg.src = url;
            // 使用公共函数获取宽度
            previewImg.style.width = getCurrentWidthStyle(); 
            previewImg.style.display = 'block';
        }
    };

    container.onmouseleave = () => {
        container.style.color = COLORS.DEFAULT;
        textSpan.innerText = '封面';
        previewImg.style.display = 'none';
    };

    toolbar.appendChild(container);
}

export const CoverDownloadModule: Module = {
    init: () => {
        // 使用常量文件里的 KEY
        chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
            currentSizeKey = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEYS.COVER_SIZE]) {
                currentSizeKey = changes[STORAGE_KEYS.COVER_SIZE].newValue as string;
            }
        });

        // 3. 寻找注入点 (依赖 Core Observer，不需要自己写 MutationObserver)
        // 这个 init 会被 content.ts 在找到 controls 时调用
        // 但是下载按钮通常在 .video-toolbar-left 里，不在 controls (.bpx-player-control...) 里
        // 所以我们需要自己找 toolbar
        const checkToolbar = () => {
            const toolbar = document.querySelector('.video-toolbar-left') || 
                            document.querySelector('.toolbar-left'); // 兼容旧版
            if (toolbar && toolbar instanceof HTMLElement) {
                injectButton(toolbar);
            }
        };

        // 启动一个针对 toolbar 的检测
        const observer = new MutationObserver(checkToolbar);
        observer.observe(document.body, { childList: true, subtree: true });
        checkToolbar(); // 立即检测一次
    }
};