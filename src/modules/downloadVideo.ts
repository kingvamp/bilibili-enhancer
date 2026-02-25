/**
 * B站视频下载功能
 * 核心逻辑：生成 Enhancer_Download 协议指令 -> 复制到剪贴板
 */

import { Module } from '../types';
import { showToast } from '../utils/toast';
import { DOM_IDS } from '../constants';

const COLORS = {
    DEFAULT: '#61666D', // B站原生深灰
    HOVER: '#00AEEC'   // B站原生蓝
};

const SVG_ICON = `
    <svg viewBox="0 0 1024 1024" version="1.1" width="24" height="24" style="margin-right: 4px; flex-shrink: 0;">
        <path d="M853.33 896H170.67a42.67 42.67 0 0 1-42.67-42.67v-85.33a42.67 42.67 0 0 1 42.67-42.67h682.66a42.67 42.67 0 0 1 42.67 42.67v85.33a42.67 42.67 0 0 1-42.67 42.67zM512 682.67a42.15 42.15 0 0 1-30.17-12.5L268.5 456.83a42.67 42.67 0 0 1 60.33-60.33l140.5 140.5V128a42.67 42.67 0 0 1 85.34 0v409l140.5-140.5a42.67 42.67 0 0 1 60.33 60.33L542.17 670.17A42.15 42.15 0 0 1 512 682.67z" fill="currentColor"></path>
    </svg>
`;

// --- 类型定义 ---
interface VideoState {
    bvid: string | null;
    p: number;
}

// --- 核心逻辑 ---
function getCurrentState(): VideoState {
    const params = new URLSearchParams(window.location.search);
    let bvid = params.get('bvid');
    if (!bvid) {
        const match = window.location.pathname.match(/(BV\w+)/);
        if (match) bvid = match[1];
    }
    let p = params.get('p') || '1';
    return { bvid, p: parseInt(p) };
}

async function startDownload() {
    const state = getCurrentState();
    if (!state.bvid) {
        showToast('❌ 无法获取BV号，请检查视频页面URL');
        return;
    }

    try {
        // 构造指令
        const videoUrl = `https://www.bilibili.com/video/${state.bvid}/?p=${state.p}`;
        const specialCommand = `Enhancer_Download||${videoUrl}`;

        // 写入剪贴板
        await navigator.clipboard.writeText(specialCommand);
        showToast('✅ 指令已复制到剪贴板');
    } catch (err: any) {
        console.error('下载流程出错：', err);
        showToast(`❌ 操作出错: ${err.message || err.toString()}`);
    }
}

// --- 按钮注入 ---
function injectButton(toolbar: HTMLElement) {
    let container = document.getElementById(DOM_IDS.VIDEO_DOWNLOAD_BTN);

    if (!container) {
        container = document.createElement('div');
        container.id = DOM_IDS.VIDEO_DOWNLOAD_BTN;
        container.style.cssText = `
            display: inline-flex; align-items: center; justify-content: center;
            position: relative; cursor: pointer; margin-left: 18px; margin-right: 0px;
            color: ${COLORS.DEFAULT}; transition: color 0.3s; font-size: 14px;
            user-select: none; line-height: 24px;
        `;

        container.innerHTML = `${SVG_ICON}<span style="padding-top: 1px;">下载</span>`;
        container.onclick = startDownload;
        const el = container; // Capture for closure
        el.onmouseenter = () => { el.style.color = COLORS.HOVER; };
        el.onmouseleave = () => { el.style.color = COLORS.DEFAULT; };
    }

    const btn = container as HTMLElement;
    // 优先寻找封面下载按钮 (ID: bili-cover-download-btn-integrated)
    const coverBtn = document.getElementById(DOM_IDS.COVER_DOWNLOAD_BTN);

    if (coverBtn) {
        if (coverBtn.nextElementSibling !== btn) coverBtn.insertAdjacentElement('afterend', btn);
    } 
}

export const VideoDownloadModule: Module = {
    init: () => {
        const checkToolbar = () => {
            const toolbar = document.querySelector('.video-toolbar-left');
            if (toolbar && toolbar instanceof HTMLElement) injectButton(toolbar);
        };
        const observer = new MutationObserver(checkToolbar);
        observer.observe(document.body, { childList: true, subtree: true });
        checkToolbar();
    }
};