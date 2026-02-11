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
    THUMB_STYLE: 'thumb_status_style'          // 样式：'text' 或 'triangle'
};