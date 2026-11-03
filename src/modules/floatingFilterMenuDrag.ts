/**
 * 悬浮筛选菜单拖动与定位；由 FloatingFilterMenu 调用，配合 floatingFilterMenu.css。
 */
import { STORAGE_KEYS } from '../constants';

const ALIGNMENTS = ['gemini-align-left', 'gemini-align-right', 'gemini-align-center'];
const CONTROLS = 'input, select, button, label, .gemini-duration-controls, .gemini-checkbox-group, .gemini-segmented, #gemini-filter-reset, #gemini-filter-close';

/** 根据按钮横向位置保留原有五区域展开规则。 */
export function getAlignmentClass(pctX: number): string {
    if (pctX < 15) return 'gemini-align-left'; // 左边缘：向右展开
    if (pctX < 40) return 'gemini-align-right'; // 靠左部分：向左展开
    if (pctX <= 60) return 'gemini-align-center'; // 中间部分：居中展开
    if (pctX <= 85) return 'gemini-align-left'; // 靠右部分：向右展开
    return 'gemini-align-right'; // 右边缘：向左展开
}

/** 统一切换展开方向。 */
export function setAlignmentClass(container: HTMLElement, alignment: string) {
    container.classList.remove(...ALIGNMENTS);
    container.classList.add(alignment);
}

/** 共用鼠标拖动入口，面板控件保留自身交互。 */
export function bindFilterMenuDrag(container: HTMLElement, toggle: HTMLElement, panel: HTMLElement) {
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let bounds: DOMRect;
    let moved = false;
    let dragging = false;
    let fromToggle = false;

    /** 保存位置与展开方向，避免恢复时重新推导方向导致面板跳位。 */
    const savePosition = () => {
        const rect = container.getBoundingClientRect();
        const pctX = rect.left / window.innerWidth * 100;
        const pctY = rect.top / window.innerHeight * 100;
        container.style.left = `${pctX}%`;
        container.style.top = `${pctY}%`;
        chrome.storage.sync.set({
            [STORAGE_KEYS.FILTER_PANEL_X]: pctX,
            [STORAGE_KEYS.FILTER_PANEL_Y]: pctY,
            [STORAGE_KEYS.FILTER_PANEL_ALIGNMENT]: ALIGNMENTS.find(value => container.classList.contains(value))
        }, () => {
            if (chrome.runtime.lastError) console.error('保存筛选浮窗位置失败：', chrome.runtime.lastError.message);
        });
    };

    /** 在可见矩形范围内平移；窗口小于面板时保留面板左上角可访问。 */
    const onMove = (event: MouseEvent) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!moved && Math.hypot(dx, dy) <= 5) return;
        moved = true;
        const left = Math.max(0, Math.min(Math.max(0, window.innerWidth - bounds.width), bounds.left + dx));
        const top = Math.max(0, Math.min(Math.max(0, window.innerHeight - bounds.height), bounds.top + dy));
        container.style.left = `${originX + left - bounds.left}px`;
        container.style.top = `${originY + top - bounds.top}px`;
        container.style.transform = 'none';
    };

    /** 收尾时先补偿对齐变更引起的偏移，再保存，整个过程关闭过渡动画。 */
    const finish = (allowClick: boolean) => {
        if (!dragging) return;
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        window.removeEventListener('blur', onBlur);
        if (moved) {
            const rect = container.getBoundingClientRect();
            const before = panel.getBoundingClientRect();
            setAlignmentClass(container, getAlignmentClass(rect.left / window.innerWidth * 100));
            if (!fromToggle) {
                const after = panel.getBoundingClientRect();
                container.style.left = `${rect.left + before.left - after.left}px`;
                container.style.top = `${rect.top + before.top - after.top}px`;
            }
            savePosition();
        } else if (fromToggle && allowClick) {
            panel.classList.add('active');
            toggle.classList.add('hidden');
            chrome.storage.sync.set({ [STORAGE_KEYS.FILTER_PANEL_EXPANDED]: true });
        }
        // 先提交无动画的位置，随后恢复常规展开/收起动画。
        container.getBoundingClientRect();
        container.classList.remove('gemini-dragging');
    };

    /** 正常松手允许原有按钮点击展开。 */
    const onUp = () => finish(true);
    /** 窗口失焦结束拖动，避免返回页面后继续跟随鼠标。 */
    const onBlur = () => finish(false);

    /** 排除控件区域后记录可见面板相对于定位容器的真实边界。 */
    const onDown = (event: MouseEvent) => {
        if (event.button !== 0 || dragging) return;
        fromToggle = event.currentTarget === toggle;
        if (!fromToggle && event.target instanceof Element && event.target.closest(CONTROLS)) return;
        container.classList.add('gemini-dragging');
        const rect = container.getBoundingClientRect();
        // 不采用按钮 hover 缩放后的边界，避免影响原有按钮定位。
        bounds = fromToggle ? rect : panel.getBoundingClientRect();
        originX = rect.left;
        originY = rect.top;
        startX = event.clientX;
        startY = event.clientY;
        moved = false;
        dragging = true;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        window.addEventListener('blur', onBlur);
        event.preventDefault();
    };

    toggle.addEventListener('mousedown', onDown);
    panel.addEventListener('mousedown', onDown);
}
