import { Module } from '../types';
import { showToast } from '../utils/toast';

// 快捷键配置：Shift + S
const HOTKEY = { key: 'S', shift: true };
const CAMERA_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" style="vertical-align: middle;"><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`;

// 数字补零辅助函数
function pad(n: number): string { return n.toString().padStart(2, '0'); }

/**
 * 执行截图操作
 */
function capture(): void {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) {
        showToast('❌ 未找到视频');
        return;
    }

    // 设置 crossOrigin 属性以允许跨域截图（如果服务器支持）
    if (!video.getAttribute('crossOrigin')) video.setAttribute('crossOrigin', 'anonymous');

    try {
        // 创建画布并绘制当前视频帧
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        // 获取视频标题并清理非法文件名字符
        let title = document.title.replace('_哔哩哔哩_bilibili', '').trim();
        const titleEl = document.querySelector('.video-title') || document.querySelector('.tit');
        if (titleEl && titleEl instanceof HTMLElement) title = titleEl.innerText;
        title = title.replace(/[\\/:*?"<>|]/g, '').substring(0, 50);

        // 获取 BV 号
        let bvid = '';
        const match = location.href.match(/(BV[A-Za-z0-9]+)/);
        if (match) bvid = `[${match[1]}]`;

        // 获取当前播放时间
        const m = Math.floor(video.currentTime / 60);
        const s = Math.floor(video.currentTime % 60);
        // 拼接文件名
        const filename = `${title} ${bvid} [${pad(m)}-${pad(s)}].png`.replace(/\s+/g, ' ').trim();

        // 导出图片并下载
        canvas.toBlob(blob => {
            if (!blob) {
                showToast('❌ 截图空白(可能受DRM保护)');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            // 释放 URL 对象
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showToast(`📸 已保存: ${filename}`);
        }, 'image/png');
    } catch (e) {
        console.error(e);
        showToast('❌ 截图失败(跨域限制)');
    }
}

// 绑定全局快捷键（只绑定一次）
let isKeyBound = false;
function bindKey() {
    if (isKeyBound) return;
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        // 避免在输入框中触发
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
        
        if (e.key.toUpperCase() === HOTKEY.key && e.shiftKey === HOTKEY.shift) {
            e.preventDefault();
            capture();
        }
    });
    isKeyBound = true;
}

export const ScreenshotModule: Module = {
    init: (container?: HTMLElement) => {
        if (!container) return;
        bindKey(); // 确保快捷键生效

        if (document.getElementById('bili-screenshot-btn')) return;
        
        // 创建截图按钮
        const btn = document.createElement('div');
        btn.id = 'bili-screenshot-btn';
        btn.className = 'bpx-player-ctrl-btn bpx-player-ctrl-setting';
        btn.style.cssText = 'margin-right: 10px; cursor: pointer;';
        btn.innerHTML = CAMERA_ICON;
        btn.title = `截图 (Shift+S)`;
        btn.onclick = capture;
        
        container.insertBefore(btn, container.firstChild);
    }
};