// src/constants.ts

// 定义封面预览的宽度 (单位: px)
// 高度会在代码中根据 16:9 比例自动计算
export const COVER_SIZES: Record<string, number> = {
    small:  320,
    medium: 480,
    large:  640
};

// 存储 Key 也建议放在这里，防止写错
export const STORAGE_KEYS = {
    MS_DISPLAY: 'enable_ms_display',
    COVER_SIZE: 'cover_preview_size',
    HIGHLIGHT: 'enable_highlight_follow',

    // === 新增：缩略图增强相关 ===
    THUMB_STATUS: 'enable_thumb_status',       // 开关：收藏/点赞状态
    THUMB_RES: 'enable_thumb_resolution',      // 开关：分辨率
    THUMB_PCOUNT: 'enable_thumb_pcount',       // 开关：分P数
    THUMB_STYLE: 'thumb_status_style',         // 样式：'text' 或 'triangle'
    HIDE_CHARGING: 'hide_charging_videos'      // 开关：屏蔽充电视频
};

// === 新增：DOM 元素 ID 常量 ===
export const DOM_IDS = {
    // 封面下载按钮
    COVER_DOWNLOAD_BTN: 'bili-cover-download-btn-integrated',
    // 封面预览图
    COVER_PREVIEW_IMG: 'bili-cover-preview-img',
    // 视频下载按钮
    VIDEO_DOWNLOAD_BTN: 'bili-video-download-btn-ffmpeg',
    // 截图按钮
    SCREENSHOT_BTN: 'bili-screenshot-btn',
    // 旋转按钮
    ROTATION_LEFT_BTN: 'bili-rot-l',
    ROTATION_RIGHT_BTN: 'bili-rot-r',
    // 毫秒显示
    MS_DISPLAY: 'bili-ms-display',
    // 提示框
    TOAST: 'bili-enhancer-toast',
    // 悬浮预览框
    HOVER_PREVIEW: 'bili-hover-preview'
};