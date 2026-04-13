import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { DownloadHistoryService } from '../services/downloadHistory';
import { FavoriteService } from '../services/favorite';
import { ThumbnailRenderer } from './thumbnail/ThumbnailRenderer';
import { PageScanner } from './thumbnail/PageScanner';
import { TitleBadgeManager } from './thumbnail/TitleBadge';
import { InfoDecorator, StatusDecorator, DownloadedDecorator } from './thumbnail/plugins';
import { showToast } from '../utils/toast';

interface ThumbnailSettings {
    enableStatus: boolean;
    enableRes: boolean;
    enablePCount: boolean;
    enableDownloaded: boolean;
    styleMode: string;
}

let isRunning = false;
const settings: ThumbnailSettings = {
    enableStatus: true,
    enableRes: true,
    enablePCount: true,
    enableDownloaded: true,
    styleMode: 'text'
};

// --- 子模块单例 ---
let renderer: ThumbnailRenderer;
let scanner: PageScanner;
let titleBadge: TitleBadgeManager;

function updateStyles() {
    document.body.classList.remove('bili-thumb-style-text', 'bili-thumb-style-triangle');
    document.body.classList.add(`bili-thumb-style-${settings.styleMode}`);
}

function start() {
    if (isRunning) return;
    isRunning = true;

    updateStyles();

    // 1. 初始化核心渲染器
    renderer = new ThumbnailRenderer(settings);
    renderer.addDecorator(new DownloadedDecorator()); // 下载权重最高，放第一个可能影响性能？不对，我们的业务逻辑是：如果是已下载，移除其他标，所以顺序其实不敏感，但逻辑上下载最先判断。
    renderer.addDecorator(new StatusDecorator());
    renderer.addDecorator(new InfoDecorator());

    // 2. 初始化扫描器
    scanner = new PageScanner((el: HTMLElement, bvid: string) => {
        renderer.enqueue(el, bvid);
    });


    // 3. 初始化标题标
    titleBadge = new TitleBadgeManager(settings);

    // 4. 获取下载历史并开启监听
    const historyService = DownloadHistoryService.getInstance();
    historyService.refresh().then(() => {
        setTimeout(() => {
            showToast('视频增强模块加载完成');
            // 专门监听 B 站典型的二级导航切换
            const titleTag = document.querySelector('title');
            if (titleTag) {
                new MutationObserver(() => {
                    refreshAll('二级导航切换');
                }).observe(titleTag, { childList: true });
            }
            // 监听历史变化 (当其他模块触发下载成功时，自动通知渲染器刷新)
            historyService.subscribe(() => {
                refreshAll("历史变化刷新");
            });

            // 监听收藏变化
            FavoriteService.getInstance().subscribe(() => {
                showToast('收藏变化刷新');
                titleBadge.check();
            });
            scanner.start();
            titleBadge.check();
        }, 1000); // 延迟 1 秒后应用高亮
    });
}

export const ThumbnailEnhancerModule: Module = {
    init: () => {
        chrome.storage.sync.get([
            STORAGE_KEYS.THUMB_STATUS,
            STORAGE_KEYS.THUMB_RES,
            STORAGE_KEYS.THUMB_PCOUNT,
            STORAGE_KEYS.THUMB_DOWNLOADED,
            STORAGE_KEYS.THUMB_STYLE
        ], (result) => {
            Object.assign(settings, {
                enableStatus: result[STORAGE_KEYS.THUMB_STATUS] ?? true,
                enableRes: result[STORAGE_KEYS.THUMB_RES] ?? true,
                enablePCount: result[STORAGE_KEYS.THUMB_PCOUNT] ?? true,
                enableDownloaded: result[STORAGE_KEYS.THUMB_DOWNLOADED] ?? true,
                styleMode: result[STORAGE_KEYS.THUMB_STYLE] || 'text'
            });

            if (settings.enableStatus || settings.enableRes || settings.enablePCount || settings.enableDownloaded) {
                start();
            }
        });

        // 监听存储变化，动态开关功能
        chrome.storage.onChanged.addListener((changes) => {
            const keys = [
                STORAGE_KEYS.THUMB_STATUS, STORAGE_KEYS.THUMB_RES,
                STORAGE_KEYS.THUMB_PCOUNT, STORAGE_KEYS.THUMB_DOWNLOADED,
                STORAGE_KEYS.THUMB_STYLE
            ];

            if (keys.some(k => changes[k])) {
                if (changes[STORAGE_KEYS.THUMB_STATUS]) settings.enableStatus = changes[STORAGE_KEYS.THUMB_STATUS].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_RES]) settings.enableRes = changes[STORAGE_KEYS.THUMB_RES].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_PCOUNT]) settings.enablePCount = changes[STORAGE_KEYS.THUMB_PCOUNT].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_DOWNLOADED]) settings.enableDownloaded = changes[STORAGE_KEYS.THUMB_DOWNLOADED].newValue as boolean;
                if (changes[STORAGE_KEYS.THUMB_STYLE]) {
                    settings.styleMode = changes[STORAGE_KEYS.THUMB_STYLE].newValue as string;
                    updateStyles();
                }

                if (!isRunning && (settings.enableStatus || settings.enableRes || settings.enablePCount || settings.enableDownloaded)) {
                    start();
                } else if (isRunning) {
                    refreshAll("设置刷新");
                }
            }
        });
    }
};

function refreshAll(toast: string = '刷新') {
    showToast(toast);
    renderer.refreshAll();
    titleBadge.check();
}