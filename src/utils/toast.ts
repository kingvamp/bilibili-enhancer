import { DOM_IDS } from '../constants';

/**
 * 显示一个临时的提示框 (Toast)
 * @param text 提示文本
 * @param duration 显示时长（毫秒），默认2000
 */
export function showToast(text: string, duration: number = 2000, fadeOutDuration: number = 300): void {
    let toast = document.getElementById(DOM_IDS.TOAST);
    // 如果不存在则创建
    if (!toast) {
        toast = document.createElement('div');
        toast.id = DOM_IDS.TOAST;
        // 样式稍微美化了一下：居中、半透明黑底白字
        toast.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85); color: #fff; padding: 12px 24px;
            border-radius: 8px; font-size: 14px; z-index: 100000; pointer-events: none; transition: opacity ${fadeOutDuration / 1000}s;
            transition: opacity 0.3s; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = text;
    toast.style.opacity = '1';
    
    // 清除旧的定时器（如果有），防止闪烁或过早消失
    const oldTimer = toast.getAttribute('data-timer');
    if (oldTimer) clearTimeout(parseInt(oldTimer));

    // 设置定时器，指定时长后淡出
    const timer = window.setTimeout(() => { 
        if (toast) toast.style.opacity = '0';
    }, duration);
    
    toast.setAttribute('data-timer', timer.toString());
}