/**
 * 显示一个临时的提示框 (Toast)
 * @param text 提示文本
 */
export function showToast(text: string): void {
    let toast = document.getElementById('bili-enhancer-toast');
    // 如果不存在则创建
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bili-enhancer-toast';
        // 样式稍微美化了一下：居中、半透明黑底白字
        toast.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85); color: #fff; padding: 12px 24px;
            border-radius: 8px; font-size: 14px; z-index: 100000; pointer-events: none;
            transition: opacity 0.3s; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = text;
    toast.style.opacity = '1';
    
    // 清除旧的定时器（如果有），防止闪烁或过早消失
    const oldTimer = toast.getAttribute('data-timer');
    if (oldTimer) clearTimeout(parseInt(oldTimer));

    // 设置定时器，2.5秒后淡出
    const timer = window.setTimeout(() => { 
        if(toast) toast.style.opacity = '0'; 
    }, 2500);
    
    toast.setAttribute('data-timer', timer.toString());
}