export const CSS_THUMBNAIL = `
    /* 强制父元素相对定位 (仅对增强过的元素生效) */
    .bili-res-badge-parent { position: relative !important; overflow: visible !important; }

    /* 分辨率徽章 */
    .bili-res-badge {
        position: absolute; top: 0px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.75); color: #fff; padding: 1px 5px;
        border-radius: 3px; font-size: 11px; font-weight: bold;
        z-index: 998; pointer-events: none; backdrop-filter: blur(2px);
        border: 1px solid rgba(255,255,255,0.15); white-space: nowrap; line-height: 1.2;
    }
    .res-8k { background: linear-gradient(45deg, #d4af37, #f7e98d); color: #333; border: none; }
    
    /* 分P数徽章 */
    .bili-p-count {
        position: absolute; top: 0px; left: 0px;
        background: rgba(0, 0, 0, 0.85); color: #fff; padding: 0 4px;
        border-radius: 3px; font-size: 10px; z-index: 998; pointer-events: none;
        border: 1px solid rgba(255,255,255,0.1); line-height: 1.4;
    }

    /* 播放页标题已下载标识 */
    .bili-downloaded-title-badge {
        display: inline-flex; align-items: center; justify-content: center;
        margin-left: 8px; font-size: 12px; color: #10b981;
        padding: 0 4px; border: 1px solid #10b981; border-radius: 4px;
        vertical-align: middle; font-weight: normal; height: 18px;
        line-height: 1; position: relative; top: -1px;
    }

    /* 文本模式 */
    .my-status-tag {
        position: absolute; top: 0px; right: 0px; color: white;
        padding: 2px 4px; border-radius: 4px; font-size: 12px;
        z-index: 999; pointer-events: none; line-height: 1;
        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }
    .tag-fav { background-color: #ff6699; }
    .tag-like { background-color: #00AEEC; }
    .tag-downloaded { background-color: #10b981; }
`;

export const CSS_TRIANGLE_MODE = `
    .my-status-tag {
        position: absolute; top: 0; right: 0; width: 0; height: 0;
        z-index: 999; pointer-events: none;
        border-top: 24px solid; border-left: 24px solid transparent;
        filter: drop-shadow(-1px 1px 1px rgba(0,0,0,0.3));
    }
    .tag-fav { border-top-color: #fb7299; }
    .tag-like { border-top-color: #00AEEC; }
    .tag-downloaded { border-top-color: #10b981; }
`;
