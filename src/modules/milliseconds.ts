import { Module } from '../types';

const STORAGE_KEY_MS = 'enable_ms_display';

let msEl: HTMLElement | null = null;
let frameId: number | null = null;
let isRunning = false;

// 核心更新逻辑
function update(): void {
    if (!isRunning) return; // 如果被关闭了，停止执行
    const video = document.querySelector('video');
    if (video && msEl && document.body.contains(msEl)) {
        const ms = (video.currentTime % 1).toFixed(3).substring(1); 
        msEl.innerText = ms;
    }
    frameId = requestAnimationFrame(update);
}

// 启动功能
function start() {
    if (isRunning) return; // 防止重复启动
    const timeWrap = document.querySelector('.bpx-player-ctrl-time-current') ||
                     document.querySelector('.bilibili-player-video-time-now');
    if (!timeWrap) return;
    // 创建元素（如果不存在）
    if (!msEl) {
        msEl = document.createElement('span');
        msEl.id = 'bili-ms-display';
        msEl.style.cssText = 'color:#00A1D6; font-size:14px; margin-left:2px; font-weight:bold; width:34px; display:inline-block; text-align:left; font-family:Consolas, monospace;';
    }
    // 插入 DOM
    if (!document.getElementById('bili-ms-display') && timeWrap.parentElement) {
        timeWrap.insertAdjacentElement('afterend', msEl);
    }

    isRunning = true;
    update();
}

// 停止功能
function stop() {
    isRunning = false;
    if (frameId) cancelAnimationFrame(frameId);
    // 从 DOM 移除
    if (msEl && msEl.parentElement) {
        msEl.remove();
    }
}

export const MillisecondsModule: Module = {
    init: () => {
        // 1. 初次加载：检查存储状态
        chrome.storage.sync.get([STORAGE_KEY_MS], (result) => {
            const shouldEnable = result[STORAGE_KEY_MS] !== undefined ? result[STORAGE_KEY_MS] : true;
            if (shouldEnable) {
                start();
            }
        });
        // 2. 监听变化：用户在 Popup 开关时实时响应
        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEY_MS]) {
                if (changes[STORAGE_KEY_MS].newValue === true) {
                    start();
                } else {
                    stop();
                }
            }
        });
    }
};