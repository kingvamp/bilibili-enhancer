import { RotationModule } from './modules/rotation';
import { ScreenshotModule } from './modules/screenshot';
import { MillisecondsModule } from './modules/milliseconds';
import { CoverPreviewModule } from './modules/coverPreview';
import { HighlightFollowedModule } from './modules/highlightFollowed';
import { CoverDownloadModule } from './modules/coverDownload';
import { ThumbnailEnhancerModule } from './modules/thumbnailEnhancer';
import { VideoDownloadModule } from './modules/downloadVideo';
import { ChargingBlockerModule } from './modules/chargingBlocker';


// === 第一部分：封面预览 (全局功能) ===
// 它不依赖播放器 UI，直接启动。
// 即使当前页面没有视频链接，它监听全局鼠标事件也不会有性能问题。
CoverPreviewModule.init();
HighlightFollowedModule.init();
ThumbnailEnhancerModule.init();
ChargingBlockerModule.init();
// === 视频页专用功能 ===
// 封面下载模块依赖 DOM 里的 Toolbar，可以独立初始化，也可以放在 Core 里
// 建议独立初始化，因为它不依赖播放器内核，只依赖网页结构
//MARK B站顶部工具栏会刷新一次，需要等刷新完才注入
setTimeout(() => {
    CoverDownloadModule.init();
    VideoDownloadModule.init();
}, 2000);

// === 第二部分：播放器增强 (特定功能) ===
// 只有当页面里真的有播放器时，才运行这部分代码
const Core = (() => {
    function check(): void {
        // 1. 寻找播放器控制栏
        const controls = document.querySelector('.bpx-player-control-bottom-right') ||
                         document.querySelector('.bilibili-player-video-control-bottom-right');
        if (controls && controls instanceof HTMLElement) {
            // 只有找到控制栏，才初始化这些模块
            RotationModule.init(controls);
            ScreenshotModule.init(controls);
            MillisecondsModule.init();

            // 修复跨域
            const video = document.querySelector('video');
            if (video && !video.getAttribute('crossOrigin')) {
                video.setAttribute('crossOrigin', 'anonymous');
            }
        }
    }
    // 监听 DOM 变化，因为 B 站是单页应用(SPA)，播放器可能是后加载出来的
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
})();