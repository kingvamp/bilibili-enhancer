import { Module } from '../types';
import { showToast } from '../utils/toast';
import { DOM_IDS } from '../constants';
import { ToolbarManager } from '../services/toolbarManager';
import { ICONS } from '../constants/icons';


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

    container.innerHTML = `${ICONS.DOWNLOAD}<span style="padding-top: 1px;">下载</span>`;
    container.onclick = startDownload;
}

export const VideoDownloadModule: Module = {
    init: () => {
        chrome.storage.sync.get(['enable_download_video'], (result) => {
            isEnabled = (result['enable_download_video'] !== undefined ? result['enable_download_video'] : false) as boolean;
            ToolbarManager.getInstance().refresh();
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes['enable_download_video']) {
                isEnabled = changes['enable_download_video'].newValue as boolean;
                ToolbarManager.getInstance().refresh();
            }
        });

        ToolbarManager.getInstance().register({
            id: DOM_IDS.VIDEO_DOWNLOAD_BTN,
            order: 30,
            render: renderButton
        });
    }
};