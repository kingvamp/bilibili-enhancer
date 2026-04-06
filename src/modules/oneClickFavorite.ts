import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ThumbnailFavButton } from './favorite/ThumbnailFavButton';
import { ToolbarFavButton } from './favorite/ToolbarFavButton';

let isEnabled = true;
let isRunning = false;

let thumbPart: ThumbnailFavButton;
let toolbarPart: ToolbarFavButton;

function start() {
    if (isRunning) return;
    isRunning = true;

    thumbPart = new ThumbnailFavButton(isEnabled);
    toolbarPart = new ToolbarFavButton(isEnabled);

    // 1. 初始化列表监听 (封面悬停)
    thumbPart.process();
    const observer = new MutationObserver(() => {
        if (!chrome.runtime?.id) {
            observer.disconnect();
            isRunning = false;
            return;
        }
        thumbPart.process();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 2. 初始化视频页监听 (工具栏)
    const timer = setInterval(() => {
        if (!chrome.runtime?.id) {
            clearInterval(timer);
            return;
        }
        const isVideoPage = location.pathname.startsWith('/video/') || 
                           location.pathname.startsWith('/list/') || 
                           location.href.includes('watchlater');
        if (isVideoPage) {
            toolbarPart.render();
        }
    }, 2000);
}

export const OneClickFavoriteModule: Module = {
    init: () => {
        chrome.storage.sync.get([STORAGE_KEYS.ONE_CLICK_FAVORITE], (result) => {
            isEnabled = (result[STORAGE_KEYS.ONE_CLICK_FAVORITE] as boolean) ?? true;
            if (isEnabled) {
                start();
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes[STORAGE_KEYS.ONE_CLICK_FAVORITE]) {
                isEnabled = changes[STORAGE_KEYS.ONE_CLICK_FAVORITE].newValue as boolean;
                if (isEnabled && !isRunning) {
                    start();
                }
            }
        });
    }
};
