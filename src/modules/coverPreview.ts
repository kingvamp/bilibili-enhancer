import { Module } from '../types';
import { COVER_SIZES, STORAGE_KEYS } from '../constants'; // 引入公共常量

const GAP = 15;

let tooltip: HTMLElement | null = null;
let img: HTMLImageElement | null = null;
const coverCache: Record<string, string> = {}; 

// 当前使用的宽高 (默认为 medium)
let currentWidth = COVER_SIZES.medium;
let currentHeight = Math.round(COVER_SIZES.medium * 9 / 16); // 自动计算高度

let currentListLeftX = 0;
let isRunning = false;

// === 辅助函数 ===
function createTooltip() {
    if (document.getElementById('bili-hover-preview')) return;

    tooltip = document.createElement('div');
    tooltip.id = 'bili-hover-preview';
    tooltip.style.cssText = `
        position: fixed; display: none; z-index: 2147483647;
        background: #fff; border: 1px solid #ddd;
        box-shadow: -4px 4px 16px rgba(0,0,0,0.15);
        border-radius: 6px; padding: 4px;
        width: ${currentWidth}px; min-height: 50px;
        pointer-events: none;
        transition: opacity 0.1s, top 0.08s ease-out;
    `;
    
    img = document.createElement('img');
    img.style.cssText = `width: 100%; height: auto; display: block; border-radius: 4px;`;
    tooltip.appendChild(img);
    document.body.appendChild(tooltip);
}

function getBvidFromUrl(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(BV[a-zA-Z0-9]{10})/);
    return match ? match[1] : null;
}

function loadCover(bvid: string) {
    if (!img || !tooltip) return;

    // 1. 如果有缓存，直接用
    if (coverCache[bvid]) {
        img.src = coverCache[bvid];
        return;
    }

    // 2. 显示加载占位图 (灰色背景)
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjJmMmYyIi8+PC9zdmc+';

    // 3. 发送消息给 background.ts 请求数据
    chrome.runtime.sendMessage({ action: 'fetchCover', bvid: bvid }, (response) => {
        if (response && response.success && response.data) {
            const res = response.data;
            if (res.code === 0 && res.data && res.data.pic) {
                coverCache[bvid] = res.data.pic;
                // 只有当 tooltip 还在显示时才更新图片 (防止鼠标移走了图片才加载出来)
                if (tooltip && tooltip.style.display !== 'none' && img) {
                    img.src = res.data.pic;
                }
            }
        }
    });
}

function updatePosition(e: MouseEvent) {
    if (!tooltip) return;

    let left = currentListLeftX - currentWidth - GAP;
    let top = e.clientY - (currentHeight / 2);

    if (top < 10) top = 10;
    if (top + currentHeight > window.innerHeight) top = window.innerHeight - currentHeight - 10;
    if (left < 5) left = 5;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    // 确保宽度也是最新的
    tooltip.style.width = currentWidth + 'px';
}

// === 事件监听器 ===
const handleMouseOver = (e: MouseEvent) => {
    if (!isRunning) return;
    
    const target = e.target as HTMLElement;
    // 屏蔽区域
    const isForbiddenZone = target.closest('.rec-list, .recommend-list, .video-page-card, .card-box, .bili-video-card');
    if (isForbiddenZone) return;

    let bvid: string | null = null;
    let targetElement: HTMLElement | null = null;

    // 检测逻辑
    const divItem = target.closest('[data-key]') as HTMLElement;
    if (divItem) {
        const key = divItem.getAttribute('data-key');
        if (key && key.startsWith('BV')) {
            bvid = key;
            targetElement = divItem;
        }
    }

    if (!bvid) {
        const linkItem = target.closest('a');
        if (linkItem) {
            // 简单判断：没有包含图片的链接，且宽度不太宽（避免误判大横幅）
            if (!linkItem.querySelector('img') && linkItem.getBoundingClientRect().width < 500) {
                 bvid = getBvidFromUrl(linkItem.href);
                 targetElement = linkItem;
            }
        }
    }

    if (bvid && targetElement) {
        if (!tooltip) createTooltip();
        if (tooltip) {
            const rect = targetElement.getBoundingClientRect();
            currentListLeftX = rect.left;
            
            tooltip.style.display = 'block';
            loadCover(bvid);
            updatePosition(e);
        }
    }
};

const handleMouseMove = (e: MouseEvent) => {
    if (!isRunning) return;
    if (tooltip && tooltip.style.display === 'block') {
        updatePosition(e);
    }
};

const handleMouseOut = (e: MouseEvent) => {
    if (!isRunning || !tooltip) return;
    const item = (e.target as HTMLElement).closest('[data-key], a');
    if (item && e.relatedTarget && item.contains(e.relatedTarget as Node)) return;
    tooltip.style.display = 'none';
};
// === 状态应用函数 ===
function applySettings(value: string) {
    // 1. 如果是 "off"，直接停止
    if (value === 'off') {
        stop();
        return;
    }
    // 2. 如果是有效尺寸，更新宽高
    if (COVER_SIZES[value]) {
        currentWidth = COVER_SIZES[value];
        // 核心：根据 16:9 计算高度
        currentHeight = Math.round(currentWidth * 9 / 16);
        
        // 如果 tooltip 已经存在，实时更新它的宽度
        if (tooltip) {
            tooltip.style.width = currentWidth + 'px';
        }

        // 确保启动
        if (!isRunning) start();
    }
}
// === 模块控制 ===
function start() {
    if (isRunning) return;
    isRunning = true;
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseOut);
}

function stop() {
    isRunning = false;
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseout', handleMouseOut);
    if (tooltip) tooltip.remove();
    tooltip = null;
}

export const CoverPreviewModule: Module = {
    init: () => {
        // 使用常量文件里的 KEY
        chrome.storage.sync.get([STORAGE_KEYS.COVER_SIZE], (result) => {
            const val = (result[STORAGE_KEYS.COVER_SIZE] || 'medium') as string;
            applySettings(val);
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEYS.COVER_SIZE]) {
                const newVal = changes[STORAGE_KEYS.COVER_SIZE].newValue as string;
                applySettings(newVal);
            }
        });
    }
};