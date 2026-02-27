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

// 监听状态标记
let isPolling = false;
let isEnabled = false;

function removeButton() {
    const btn = document.getElementById(DOM_IDS.VIDEO_DOWNLOAD_BTN);
    if (btn) btn.remove();
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

// --- 自动收藏逻辑 ---
async function handleDownloadFinished(bvid: string, fav_folder_id?: string) {
    // 1. 检查登录状态
    const csrf = document.cookie.match(/(?:^|; )bili_jct=([^;]*)/)?.[1];
    if (!csrf) {
        showToast('⚠️ 自动收藏失败: 请先登录B站账号');
        return;
    }
    if (!fav_folder_id) {
        showToast('✅ 视频下载完成');
        return;
    }

    showToast('⬇️ 下载完成，正在自动收藏...');
    
    try {
        // 1. 获取 AID (收藏API需要aid而不是bvid)
        const aidRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { credentials: 'include' });
        const aidJson = await aidRes.json();
        const aid = aidJson.data?.aid;
        if (!aid) throw new Error('无法获取视频ID');

        

        // 3. 添加到收藏夹
        const params = new URLSearchParams({
            rid: aid.toString(),
            type: '2',
            add_media_ids: fav_folder_id as string,
            csrf: csrf
        });

        const favRes = await fetch('https://api.bilibili.com/x/v3/fav/resource/deal', {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'include'
        });
        const favJson = await favRes.json();

        if (favJson.code === 0 || favJson.code === 11007) { // 11007: 资源已存在
            showToast('✅ 已自动存入收藏夹');
        } else {
            throw new Error(favJson.message);
        }
    } catch (e: any) {
        showToast(`⚠️ 自动收藏失败: ${e.message}`);
    }
}

async function startDownload() {
    const state = getCurrentState();
    if (!state.bvid) {
        showToast('❌ 无法获取BV号，请检查视频页面URL');
        return;
    }

    // 提前获取收藏夹设置，避免后续异步获取失败
    const { fav_folder_id } = await chrome.storage.sync.get(['fav_folder_id']);

    try {
        // 构造指令
        const videoUrl = `https://www.bilibili.com/video/${state.bvid}/?p=${state.p}`;
        const specialCommand = `Enhancer_Download||${videoUrl}`;

        // 写入剪贴板
        await navigator.clipboard.writeText(specialCommand);
        showToast('✅ 指令已复制到剪贴板');

        // 启动剪贴板监听 (模拟 clipboard-event 毫秒级响应)
        startClipboardListener(state.bvid, fav_folder_id as string);
    } catch (err: any) {
        console.error('下载流程出错：', err);
        showToast(`❌ 操作出错: ${err.message || err.toString()}`);
    }
}

function startClipboardListener(bvid: string, fav_folder_id?: string) {
    isPolling = true;
    const startTime = Date.now();
    // 设置 10 分钟超时防止无限轮询
    const TIMEOUT = 600000;

    const poll = async () => {
        if (!isPolling) return;

        if (Date.now() - startTime > TIMEOUT) {
            isPolling = false;
            return;
        }

        // 只有当页面有焦点时才尝试读取剪贴板，避免报错
        if (document.hasFocus()) {
            try {
                const text = await navigator.clipboard.readText();
                // 确保是当前视频的下载完成信号 (防止多开标签页冲突)
                if (text.startsWith('Enhancer_Download_Finished||') && text.includes(bvid)) {
                    isPolling = false;
                    handleDownloadFinished(bvid, fav_folder_id);
                    return;
                }
            } catch (e) {
                // 忽略读取错误 (例如页面失去焦点时可能无权限)
            }
        }

        // 200ms 间隔轮询，实现近乎实时的响应
        setTimeout(poll, 200);
    };

    poll();
}

// --- 按钮注入 ---
function injectButton(toolbar: HTMLElement) {
    if (!isEnabled) return;

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

        chrome.storage.sync.get(['enable_download_video'], (result) => {
            isEnabled = (result['enable_download_video'] !== undefined ? result['enable_download_video'] : true) as boolean;
            if (isEnabled) checkToolbar();
            else removeButton();
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes['enable_download_video']) {
                isEnabled = changes['enable_download_video'].newValue as boolean;
                if (isEnabled) checkToolbar();
                else removeButton();
            }
        });

        const observer = new MutationObserver(checkToolbar);
        observer.observe(document.body, { childList: true, subtree: true });
    }
};