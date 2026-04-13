// src/utils/toast.ts

/**
 * 显示提示信息 (支持堆叠)
 * @param text 提示文本
 * @param duration 显示时长 (ms)
 */
export function showToast(text: string, duration: number = 2000): void {
    const CONTAINER_ID = 'bili-enhancer-toast-container';
    let container = document.getElementById(CONTAINER_ID);

    // 1. 确保容器存在
    if (!container) {
        container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            z-index: 100000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // 2. 创建新消息元素
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: #fb7299;
        color: #fff;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s, transform 0.3s;
        white-space: nowrap;
    `;
    toast.innerText = text;
    container.appendChild(toast);

    // 3. 进场动画
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // 4. 定时淡出并移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        // 动画结束后从 DOM 移除
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}