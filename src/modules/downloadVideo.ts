import { Module } from '../types';
import { showToast } from '../utils/toast';
import { DOM_IDS } from '../constants';
import { ToolbarManager } from '../services/toolbarManager';

const SVG_ICON = `
    <svg viewBox="0 0 1024 1024" version="1.1" width="24" height="24">
        <path d="M853.33 896H170.67a42.67 42.67 0 0 1-42.67-42.67v-85.33a42.67 42.67 0 0 1 42.67-42.67h682.66a42.67 42.67 0 0 1 42.67 42.67v85.33a42.67 42.67 0 0 1-42.67 42.67zM512 682.67a42.15 42.15 0 0 1-30.17-12.5L268.5 456.83a42.67 42.67 0 0 1 60.33-60.33l140.5 140.5V128a42.67 42.67 0 0 1 85.34 0v409l140.5-140.5a42.67 42.67 0 0 1 60.33 60.33L542.17 670.17A42.15 42.15 0 0 1 512 682.67z" fill="currentColor"></path>
    </svg>
`;

// --- 类型定义 ---
interface VideoState {
    bvid: string | null;
    p: number;
}

let isEnabled = false;

// --- 核心逻辑 ---
function getCurrentState(): VideoState {
    const params = new URLSearchParams(window.location.search);
    let bvid = params.get('bvid');
    if (!bvid) {
        const match = window.location.pathname.match(/(BV\w+)/i);
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
        const videoUrl = `https://www.bilibili.com/video/${state.bvid}/?p=${state.p}`;
        const specialCommand = `Enhancer_Download||${videoUrl}`;
        await navigator.clipboard.writeText(specialCommand);
        showToast('✅ 指令已复制到剪贴板');
    } catch (err: any) {
        showToast(`❌ 操作出错: ${err.message || err.toString()}`);
    }
}

function renderButton(container: HTMLElement) {
    if (!isEnabled) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'inline-flex';
    
    if (container.dataset.rendered === 'true') return;
    container.dataset.rendered = 'true';

    container.innerHTML = `${SVG_ICON}<span style="padding-top: 1px;">下载</span>`;
    container.onclick = startDownload;
}

export const VideoDownloadModule: Module = {
    init: () => {
        chrome.storage.sync.get(['enable_download_video'], (result) => {
            isEnabled = (result['enable_download_video'] !== undefined ? result['enable_download_video'] : false) as boolean;
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes['enable_download_video']) {
                isEnabled = changes['enable_download_video'].newValue as boolean;
            }
        });

        ToolbarManager.getInstance().register({
            id: DOM_IDS.VIDEO_DOWNLOAD_BTN,
            order: 30,
            render: renderButton
        });
    }
};