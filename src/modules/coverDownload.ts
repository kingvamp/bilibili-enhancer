// src/modules/coverDownload.ts
import { Module } from '../types';
import { COVER_SIZES, STORAGE_KEYS, DOM_IDS } from '../constants';
import { showToast } from '../utils/toast';
import { ToolbarManager } from '../services/toolbarManager';
import { ICONS } from '../constants/icons';


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

// === 下载逻辑 ===
function downloadAction(container: HTMLElement) {
    const coverUrl = getCoverUrl();
    if (!coverUrl) {
        showToast('❌ 未找到封面信息');
        return;
    }

    const textSpan = container.querySelector('.bili-cover-text') as HTMLElement;
    if (textSpan) textSpan.innerText = '下载中...';

    const titleElement = document.querySelector('h1.video-title') || document.title;
    const titleText = (titleElement instanceof HTMLElement ? titleElement.innerText : titleElement) || 'cover';
    const bvId = getBvId();
    const fileName = sanitizeFileName(`${titleText} [${bvId}]`) + '.jpg';

    if (!chrome.runtime?.id) return;

    try {
        chrome.runtime.sendMessage({ action: 'fetchImageBlob', url: coverUrl }, (response) => {
            if (response && response.success && response.data) {
                const link = document.createElement('a');
                link.href = response.data;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast('✅ 封面已下载');
            } else {
                window.open(coverUrl, '_blank');
                showToast('⚠️ 下载失败，已在新标签页打开');
            }
            if (textSpan) textSpan.innerText = '封面';
        });
    } catch (e) {
        const span = container.querySelector('.bili-cover-text') as HTMLElement;
        if (span) span.innerText = '封面';
    }
}

function getCurrentWidthStyle(): string {
    if (currentSizeKey === 'off') return '0px';
    const size = COVER_SIZES[currentSizeKey];
    return size ? `${size}px` : `${COVER_SIZES.medium}px`;
}

// 当前预览尺寸 Key (默认为 medium)
let currentSizeKey = 'medium';

function renderButton(container: HTMLElement) {
    if (container.dataset.rendered === 'true') return;
    container.dataset.rendered = 'true';

    container.innerHTML = `${ICONS.COVER}<span class="bili-cover-text" style="padding-top: 2px; min-width: 28px;">封面</span>`;

    // 1. 获取或创建全局预览层（直接挂在 body 下，破除 z-index 限制）
    let previewImg = document.getElementById(DOM_IDS.COVER_PREVIEW_IMG) as HTMLImageElement;
    if (!previewImg) {
        previewImg = document.createElement('img');
        previewImg.id = DOM_IDS.COVER_PREVIEW_IMG;
        previewImg.style.cssText = `
            display: none; position: fixed; 
            border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            z-index: 2147483647; background: #fff; padding: 4px; border: 1px solid #e7e7e7;
            transition: width 0.2s ease; pointer-events: none;
        `;
        document.body.appendChild(previewImg);
    }

    const textSpan = container.querySelector('.bili-cover-text') as HTMLElement;
    container.onclick = () => downloadAction(container);

    container.onmouseenter = () => {
        textSpan.innerText = '下载';
        if (currentSizeKey === 'off') return;
        const url = getCoverUrl();
        if (url) {
            previewImg.src = url;
            const widthStyle = getCurrentWidthStyle();
            previewImg.style.width = widthStyle;
            
            // 2. 动态计算位置（在按钮上方居中）
            const rect = container.getBoundingClientRect();
            const width = parseInt(widthStyle);
            const left = rect.left + (rect.width / 2) - (width / 2);
            
            previewImg.style.left = `${left}px`;
            previewImg.style.bottom = `${window.innerHeight - rect.top + 8}px`; // 按钮上方 8px
            previewImg.style.display = 'block';
        }
    };

    container.onmouseleave = () => {
        textSpan.innerText = '封面';
        if (previewImg) previewImg.style.display = 'none';
    };
}

export const CoverDownloadModule: Module = {
    init: () => {
        chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
            currentSizeKey = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEYS.COVER_SIZE]) {
                currentSizeKey = changes[STORAGE_KEYS.COVER_SIZE].newValue as string;
            }
        });

        ToolbarManager.getInstance().register({
            id: DOM_IDS.COVER_DOWNLOAD_BTN,
            order: 20,
            render: renderButton
        });
    }
};