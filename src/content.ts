import { RotationModule } from './modules/rotation';
import { ScreenshotModule } from './modules/screenshot';
import { MillisecondsModule } from './modules/milliseconds';
import { CoverPreviewModule } from './modules/coverPreview';

const Core = (() => {
    /**
     * 检查播放器是否加载完成，并初始化模块
     */
    function check(): void {
        // B站播放器控制栏选择器（兼容旧版和新版）
        const controls = document.querySelector('.bpx-player-control-bottom-right') ||
                         document.querySelector('.bilibili-player-video-control-bottom-right');

        // 我们需要把 controls 断言为 HTMLElement 才能传给模块
        if (controls && controls instanceof HTMLElement) {
            // 初始化各个功能模块
            RotationModule.init(controls);
            ScreenshotModule.init(controls);
            MillisecondsModule.init();

            // 尝试修复跨域问题，以便截图功能正常工作
            const video = document.querySelector('video');
            if (video && !video.getAttribute('crossOrigin')) {
                video.setAttribute('crossOrigin', 'anonymous');
            }
        }
    }
    CoverPreviewModule.init();
    // 使用 MutationObserver 监听 DOM 变化，等待播放器加载
    // 相比 setInterval，Observer 更高效且反应更快
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
})();