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
    HIGHLIGHT: 'enable_highlight_follow'
};