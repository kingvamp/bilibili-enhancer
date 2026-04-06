/**
 * 样式管理器
 * 负责向页面注入 CSS 样式
 */

export const StyleManager = {
    /**
     * 注入样式到页面头部分
     * @param id 样式的唯一 ID，防止重复注入
     * @param cssText 样式内容
     */
    inject(id: string, cssText: string): void {
        if (document.getElementById(id)) return;
        
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssText;
        document.head.appendChild(style);
    },

    /**
     * 更新已有样式的内容
     */
    update(id: string, cssText: string): void {
        const style = document.getElementById(id) as HTMLStyleElement;
        if (style) {
            style.textContent = cssText;
        } else {
            this.inject(id, cssText);
        }
    }
};
