import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ApiService } from '../services/api';
import { DownloadHistoryService } from '../services/downloadHistory';
import { SELECTORS } from '../constants/selectors';
import { findVideoCardWrapper, extractBvid } from '../utils/dom';

/**
 * 互动状态过滤模块 (点赞/收藏/下载)
 */

const CARD_SELECTORS = SELECTORS.VIDEO_CARD.ENTITY;

interface InteractionSettings {
    filterLiked: boolean;
    filterFavorited: boolean;
    filterDownloaded: boolean;
}

const settings: InteractionSettings = {
    filterLiked: false,
    filterFavorited: false,
    filterDownloaded: false
};

const relationCache = new Map<string, { fav: boolean, like: boolean } | null>();
let observer: MutationObserver | null = null;
let scanTimeout: number | undefined;

function applyFilter(card: HTMLElement) {
    // 寻找 BV 号
    let bvid: string | null = null;
    
    // 1. 从链接寻找
    const links = card.querySelectorAll<HTMLAnchorElement>('a[href*="/video/BV"], a[href*="bvid=BV"]');
    for (const link of links) {
        const found = extractBvid(link.href) || extractBvid(link.getAttribute('href'));
        if (found) {
            bvid = found;
            break;
        }
    }

    // 2. 从 data-key 寻找 (稍后再玩列表)
    if (!bvid) {
        const withKey = card.querySelector('[data-key^="BV"]') as HTMLElement | null;
        if (withKey && withKey.dataset.key) {
            bvid = withKey.dataset.key;
        } else if (card.dataset.key?.startsWith('BV')) {
            bvid = card.dataset.key;
        }
    }

    // 3. 从 dataset.targetBvid 寻找 (PageScanner 标记过的话)
    if (!bvid && card.dataset.targetBvid) {
        bvid = card.dataset.targetBvid;
    }

    if (!bvid) return;

    const wrapper = findVideoCardWrapper(card);
    const history = DownloadHistoryService.getInstance();
    
    // 1. 已下载过滤
    if (settings.filterDownloaded && history.has(bvid)) {
        console.log(`[InteractionFilter] Hiding downloaded video: ${bvid}`);
        wrapper.style.setProperty('display', 'none', 'important');
        card.dataset.geminiInteractionFiltered = 'true';
        return;
    }

    // 2. 点赞/收藏过滤
    if (relationCache.has(bvid)) {
        const relation = relationCache.get(bvid);
        if (relation) {
            if ((settings.filterLiked && relation.like) || (settings.filterFavorited && relation.fav)) {
                console.log(`[InteractionFilter] Hiding liked/fav video: ${bvid}`, relation);
                wrapper.style.setProperty('display', 'none', 'important');
                card.dataset.geminiInteractionFiltered = 'true';
                return;
            }
        }
    } else if (settings.filterLiked || settings.filterFavorited) {
        // 标记为正在加载或已尝试，防止重复请求
        relationCache.set(bvid, null); 
        console.log(`[InteractionFilter] Fetching relation for: ${bvid}`);
        ApiService.getVideoRelation(bvid).then(res => {
            if (res) {
                relationCache.set(bvid, res);
                applyFilter(card);
            }
        });
    }

    // 恢复显示
    if (card.dataset.geminiInteractionFiltered === 'true') {
        wrapper.style.removeProperty('display');
        delete card.dataset.geminiInteractionFiltered;
    }
}

function scan() {
    const isAnyEnabled = settings.filterLiked || settings.filterFavorited || settings.filterDownloaded;
    if (!isAnyEnabled) return;

    const cards = document.querySelectorAll<HTMLElement>(CARD_SELECTORS.join(', '));
    console.log(`[InteractionFilter] Scanning ${cards.length} cards...`);
    cards.forEach(card => applyFilter(card));
}

function debouncedScan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = window.setTimeout(scan, 300);
}

function start() {
    if (observer) return;
    
    console.log('[InteractionFilter] Module starting...', settings);

    // 优先刷新下载历史控制
    DownloadHistoryService.getInstance().refresh().then(() => {
        console.log('[InteractionFilter] History refreshed, initial scan');
        scan();
    });

    observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) {
            debouncedScan();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // 定期补漏
    window.setInterval(scan, 5000);
}

function stop() {
    console.log('[InteractionFilter] Module stopping...');
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (scanTimeout) clearTimeout(scanTimeout);

    document.querySelectorAll<HTMLElement>('[data-gemini-interaction-filtered]').forEach(card => {
        const wrapper = findVideoCardWrapper(card);
        wrapper.style.removeProperty('display');
        delete card.dataset.geminiInteractionFiltered;
    });
}

function syncSettings() {
    const isAnyEnabled = settings.filterLiked || settings.filterFavorited || settings.filterDownloaded;
    if (isAnyEnabled) {
        start();
    } else {
        stop();
    }
}

export const InteractionFilterModule: Module = {
    init: () => {
        chrome.storage.sync.get([
            STORAGE_KEYS.FILTER_LIKED,
            STORAGE_KEYS.FILTER_FAVORITED,
            STORAGE_KEYS.FILTER_DOWNLOADED
        ], (result) => {
            settings.filterLiked = !!result[STORAGE_KEYS.FILTER_LIKED];
            settings.filterFavorited = !!result[STORAGE_KEYS.FILTER_FAVORITED];
            settings.filterDownloaded = !!result[STORAGE_KEYS.FILTER_DOWNLOADED];
            syncSettings();
        });

        chrome.storage.onChanged.addListener((changes) => {
            let changed = false;
            if (changes[STORAGE_KEYS.FILTER_LIKED]) {
                settings.filterLiked = !!changes[STORAGE_KEYS.FILTER_LIKED].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_FAVORITED]) {
                settings.filterFavorited = !!changes[STORAGE_KEYS.FILTER_FAVORITED].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_DOWNLOADED]) {
                settings.filterDownloaded = !!changes[STORAGE_KEYS.FILTER_DOWNLOADED].newValue;
                changed = true;
            }

            if (changed) syncSettings();
        });
    }
};
