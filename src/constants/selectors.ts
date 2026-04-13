export const SELECTORS = {
    // 视频卡片相关
    VIDEO_CARD: {
        // 独立的视频实体卡片容器 (一对一，用于扫描)
        ENTITY: [
            '.bili-video-card',
            '.video-item',
            '.small-item',
            '.video-card-common',
            '.b-video-item',
            '.video-list-item',
            '.video-card',
            '.archive-card',
            '.feed-card',
            '.rank-item',
            '.cube-list li',
            '.floor-card',
            '.recommend-card',
            '.video-page-card',
            '.video-page-card-small',
            '.bili-dyn-card-video',
            '.v-card-single',
            '.upload-video-card',
            '.items__item',
            '.item'
        ],
        // 可能包含视频实体的祖先容器 (用于向上寻找，不应直接用于扫描)
        ANCESTORS: [
            '.list-item',
            '.card-box',
            '.action-list-item',
            '.action-list-item-wrap'
        ],
        // 外部包裹容器 (用于隐藏/间距控制)
        WRAPPERS: [
            '.feed-card',
            '.bili-video-card__wrap',
            '.video-list-item',
            '.col_3',
            '.col_4',
            '.card-box',
            '.upload-video-card',
            '.items__item',
            '.floor-card',
            '.recommend-card',
            '.video-page-card-small',
            '.bili-dyn-list__item',
            '.small-item',
            '.item'
        ],
        // 视频标题选择器
        TITLE: [
            '.bili-video-card__info--tit',
            '.bili-video-card__title',
            '.upload-video-card__title',
            '.title',
            '.t',
            '.tit',
            '.video-title',
            '.video-title-href',
            'h3'
        ],
        // 封面图选择器 (优先匹配容器类，避免直接匹配 img)
        COVER: [
            '.pic',
            '.cover',
            '.bili-cover-card',
            '.bili-video-card__cover',
            '.bili-video-card__image--link',
            '.bili-video-card__image--cover',
            '.b-link-cover',
            '.b-img',
            '.img-anchor',
            '.lazy-img',
            'picture',
            'img'
        ],
        // 视频时长标签
        DURATION: [
            '.bili-video-card__stats__duration',
            '.length',
            '.duration',
            '.item-footer > span:first-child',
            '.bili-video-card__stats span:last-child',
            '.bili-video-card__info__duration',
            '.bili-cover-card__stats__duration',
            '.stats span.length'
        ]
    },

    // 播放页相关
    PLAY_PAGE: {
        // 主视频标题
        MAIN_VIDEO_TITLE: [
            '.video-info-container .video-title',
            '.video-info-container .video-info-title-inner',
            '.v-title h1',
            '.left-container .tit',
            '.video-info-title-inner',
            '.video-title'
        ],
        // 工具栏左侧区域
        TOOLBAR_LEFT: [
            '.video-toolbar-left',
            '.toolbar-left'
        ],
        // 视频信息/及相关推荐容器 (常用于 MutationObserver 挂载)
        INFO_CONTAINER: [
            '.video-info-container',
            '#arc_toolbar_report',
            '.v-wrap',
            '#app'
        ]
    },

    // 扫描与排除区域
    SCANNER: {
        // 基础视频链接
        VIDEO_LINK: 'a[href*="/video/BV"], a[href*="bvid=BV"]',
        // 带有 BV 号数据的元素 (如稍后再玩列表)
        DATA_KEY_BV: '[data-key^="BV"]',
        // 需要排除扫描的区域 (即：完全不可能包含感兴趣视频链接的区域，如导航栏、弹窗、头部)
        EXCLUDED_AREAS: [
            '.bili-header',
            '.mini-header',
            '.user-card',
            '.v-popover-content',
            '.nav-menu',
            '.international-footer'
        ],
        // 封面预览屏蔽区域 (即：已经有封面图的区域，不需要额外弹出预览)
        PREVIEW_BLOCKERS: [
            '.bili-video-card',
            '.video-item',
            '.recommend-list',
            '.rec-list',
            '.card-box'
        ]
    },

    // 用户相关
    USER: {
        // 用户空间链接
        SPACE_LINK: 'a[href*="space.bilibili.com"]'
    },

    // 收藏相关
    FAVORITE: {
        // 收藏夹容器标识
        PAGE_MARKERS: [
            '.fav-detail',
            '.fav-info'
        ]
    }
};
