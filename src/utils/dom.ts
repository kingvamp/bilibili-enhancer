import { SELECTORS } from '../constants/selectors';

/**
 * DOM 操作工具类
 * 提供针对 B 站页面结构的通用查找和判断逻辑。
 */

/**
 * 提取 URL 中的 BV 号
 */
export function extractBvid(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(BV[a-zA-Z0-9]{10})/i);
    return match ? match[1] : null;
}

/**
 * 向上寻找最近的视频卡片容器
 */
export function findClosestVideoCard(element: HTMLElement): HTMLElement | null {
    const list = [...SELECTORS.VIDEO_CARD.ENTITY, ...SELECTORS.VIDEO_CARD.ANCESTORS];
    return element.closest(list.join(', '));
}

/**
 * 在卡片容器内寻找标题元素
 * @param card 卡片容器轴元素
 * @param bvid 可选，用于兜底逻辑匹配 BV 号
 */
export function findTitleInCard(card: HTMLElement, bvid?: string): HTMLElement | null {
    const titleSelectors = SELECTORS.VIDEO_CARD.TITLE.join(', ');
    
    // 1. 检查容器本身是否就是标题
    if (card.matches(titleSelectors)) return card;

    // 2. 优先通过标题选择器查找
    const title = card.querySelector(titleSelectors);
    if (title) return title as HTMLElement;

    // 2. 兜底逻辑：在容器内寻找匹配 BV 号且包含文字的链接
    if (bvid) {
        const links = card.querySelectorAll('a');
        for (const link of links) {
            const hLink = link as HTMLElement;
            // 排除封面图本身 (通常带有特殊标识类)
            if (hLink.classList.contains('bili-res-badge-parent')) continue;
            
            if (hLink.innerText.trim() && (hLink.getAttribute('href')?.includes(bvid) || hLink.dataset.targetBvid === bvid)) {
                return hLink;
            }
        }
    }

    return null;
}

/**
 * 判断元素是否位于需要排除扫描的区域
 */
export function isInsideExcludedArea(element: HTMLElement): boolean {
    return !!element.closest(SELECTORS.SCANNER.EXCLUDED_AREAS.join(', '));
}

/**
 * 在基础元素内查找封面图容器 (必须返回可以包含子元素的容器，不能直接返回 img)
 */
export function findCoverInElement(element: HTMLElement): HTMLElement | null {
    const coverSelectors = SELECTORS.VIDEO_CARD.COVER;

    // 1. 优先查找容器类 (排除 img 和 picture)
    for (const s of coverSelectors) {
        if (s === 'img' || s === 'picture') continue;
        const found = element.querySelector(s);
        if (found) return found as HTMLElement;
        
        // 检查元素自身是否就是该容器
        if (s.startsWith('.') && element.classList.contains(s.slice(1))) {
            return element;
        }
    }

    // 2. 尝试寻找通用的图片包装类 (B 站常用的布局类)
    const commonWrappers = element.querySelector('[class*="cover"], [class*="image"], [class*="thumb"], [class*="pic"]');
    if (commonWrappers && commonWrappers.tagName !== 'IMG' && commonWrappers.tagName !== 'PICTURE') {
        return commonWrappers as HTMLElement;
    }

    // 3. 兜底：寻找图片标签，并返回其父级作为容器
    const img = element.querySelector('img, picture');
    if (img && img.parentElement && img.parentElement !== element) {
        return img.parentElement as HTMLElement;
    }

    return null;
}

/**
 * 确保元素具有层叠上下文（用于定位角标），同时不破坏 B 站原有的布局
 */
export function ensureLayeredContext(element: HTMLElement) {
    const style = window.getComputedStyle(element);
    if (style.position === 'static') {
        element.style.position = 'relative';
    }
    // 注意：如果元素已经是 absolute 或 relative，我们绝对不要改动它或加 !important
    // 同时也保持高度兼容性
    element.classList.add('bili-res-badge-parent');
}

/**
 * 从 B 站用户空间链接中提取 UID
 */
export function extractUid(url: string | null): number | null {
    if (!url) return null;
    const match = url.match(/space\.bilibili\.com\/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

/**
 * 寻找卡片的基础包裹容器 (常用于应用隐藏或透明度样式)
 */
export function findVideoCardWrapper(card: HTMLElement): HTMLElement {
    const wrapper = card.closest(SELECTORS.VIDEO_CARD.WRAPPERS.join(', ')) as HTMLElement | null;
    return (wrapper && wrapper !== document.body) ? wrapper : card;
}

/**
 * 判断当前是否处于收藏夹相关页面
 */
export function isFavoritePage(): boolean {
    const markers = SELECTORS.FAVORITE.PAGE_MARKERS.join(', ');
    return location.href.includes('medialist') || 
           location.href.includes('favlist') ||
           !!document.querySelector(markers);
}

/**
 * 通用的从 URL 提取 BV 号的工具 (extractBvid 的同义词，保持命名习惯一致)
 */
export function extractBvidFromUrl(url: string | null): string | null {
    return extractBvid(url);
}
