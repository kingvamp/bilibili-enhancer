import { Module } from '../types';
import { DOM_IDS } from '../constants';

// 图标 SVG 路径配置
const ICON_PATHS = {
    LEFT: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />',
    RIGHT: '<path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />'
};

// 当前旋转角度状态
let currentRotation = 0;

/**
 * 旋转视频的核心逻辑
 * @param deg 旋转角度（90 或 -90）
 */
function rotateVideo(deg: number): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) return;

    // 更新旋转角度，保持在 0-360 范围内
    currentRotation = (currentRotation + deg) % 360;
    let scale = 1;
    
    // 如果旋转了 90 或 270 度，视频宽高比会倒置，需要缩放以适应播放器容器
    if (Math.abs(currentRotation) % 180 !== 0) {
        const { videoWidth, videoHeight } = video;
        if (videoWidth && videoHeight) {
            // 计算缩放比例：始终确保视频能填满容器的短边，避免黑边过多或溢出
            scale = videoWidth > videoHeight ? (videoHeight / videoWidth) : (videoHeight / videoWidth);
            if (scale > 1) scale = 1 / scale; // 确保缩放比例正确
        }
    }
    
    // 应用样式
    video.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    video.style.transform = `rotate(${currentRotation}deg) scale(${scale})`;
}

/**
 * 创建控制栏按钮
 * @param id 按钮元素ID
 * @param path SVG图标路径
 * @param title 提示文本
 * @param margin 样式边距
 * @param onClick 点击回调
 */
function createBtn(id: string, path: string, title: string, margin: string, onClick: () => void): HTMLElement | null {
    if (document.getElementById(id)) return null;
    
    const btn = document.createElement('div');
    btn.id = id;
    btn.className = 'bpx-player-ctrl-btn';
    btn.style.cssText = `margin-right: ${margin}; cursor: pointer; color: hsla(0,0%,100%,.8);`;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">${path}</svg>`;
    btn.setAttribute('aria-label', title);
    btn.onclick = onClick;
    // 添加悬停效果
    btn.onmouseenter = () => btn.style.color = '#fff';
    btn.onmouseleave = () => btn.style.color = 'hsla(0,0%,100%,.8)';
    return btn;
}

export const RotationModule: Module = {
    /**
     * 初始化旋转模块
     * @param container 播放器控制栏容器
     */
    init: (container?: HTMLElement) => {
        if (!container) return;
        // 创建左右旋转按钮
        const btnRight = createBtn(DOM_IDS.ROTATION_RIGHT_BTN, ICON_PATHS.RIGHT, '向右旋转', '12px', () => rotateVideo(90));
        const btnLeft = createBtn(DOM_IDS.ROTATION_LEFT_BTN, ICON_PATHS.LEFT, '向左旋转', '4px', () => rotateVideo(-90));
        
        // 插入到控制栏最前面
        if (btnRight) container.insertBefore(btnRight, container.firstChild);
        if (btnLeft) container.insertBefore(btnLeft, container.firstChild);
    }
};