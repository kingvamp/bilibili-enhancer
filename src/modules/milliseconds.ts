import { Module } from '../types';

let msEl: HTMLElement | null = null;
let frameId: number | null = null;

/**
 * 每一帧更新毫秒显示
 */
function update(): void {
    const video = document.querySelector('video');
    if (video && msEl && document.body.contains(msEl)) {
        // 获取当前时间的毫秒部分（3位小数）
        const ms = (video.currentTime % 1).toFixed(3).substring(1); 
        msEl.innerText = ms;
    }
    // 使用 requestAnimationFrame 保证流畅度
    frameId = requestAnimationFrame(update);
}

export const MillisecondsModule: Module = {
    init: () => {
        // 寻找时间显示容器
        const timeWrap = document.querySelector('.bpx-player-ctrl-time-current') ||
                         document.querySelector('.bilibili-player-video-time-now');
        if (!timeWrap) return;
        if (document.getElementById('bili-ms-display')) return;

        // 创建毫秒显示元素
        msEl = document.createElement('span');
        msEl.id = 'bili-ms-display';
        msEl.style.cssText = 'color:#00A1D6; font-size:14px; margin-left:2px; font-weight:bold; width:34px; display:inline-block; text-align:left; font-family:Consolas, monospace;';

        // 插入到时间元素后面
        if (timeWrap.parentElement) {
            timeWrap.insertAdjacentElement('afterend', msEl);
        }

        // 启动更新循环
        if (frameId) cancelAnimationFrame(frameId);
        update();
    }
};