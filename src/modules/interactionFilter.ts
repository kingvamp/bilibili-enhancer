import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { VideoDataCenter } from '../services/DataCenter';
import { DownloadHistoryService } from '../services/downloadHistory';
import { FilterEngine } from '../services/FilterEngine';

/**
 * 互动状态过滤模块 (Refactored to use FilterEngine)
 */

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

function checkAndApply(card: HTMLElement, bvid: string | null) {
    if (!bvid) return;

    const isAnyEnabled = settings.filterLiked || settings.filterFavorited || settings.filterDownloaded;
    if (!isAnyEnabled) {
        FilterEngine.getInstance().apply(card, 'interaction', 'off');
        return;
    }

    const history = DownloadHistoryService.getInstance();
    
    // 1. 已下载过滤
    if (settings.filterDownloaded && history.has(bvid)) {
        FilterEngine.getInstance().apply(card, 'interaction', 'hide');
        return;
    }

    // 2. 点赞/收藏过滤
    VideoDataCenter.getVideoRelation(bvid).then(res => {
        if (res) {
            const isFiltered = (settings.filterLiked && res.like) || (settings.filterFavorited && res.fav);
            FilterEngine.getInstance().apply(card, 'interaction', isFiltered ? 'hide' : 'off');
        } else {
            FilterEngine.getInstance().apply(card, 'interaction', 'off');
        }
    });
}

function updateAll() {
    FilterEngine.getInstance().reprocess();
}

export const InteractionFilterModule: Module = {
    init: () => {
        FilterEngine.getInstance().onScan((card, bvid) => {
            checkAndApply(card, bvid);
        });

        chrome.storage.sync.get([
            STORAGE_KEYS.FILTER_LIKED,
            STORAGE_KEYS.FILTER_FAVORITED,
            STORAGE_KEYS.FILTER_DOWNLOADED
        ], (result) => {
            settings.filterLiked = !!result[STORAGE_KEYS.FILTER_LIKED];
            settings.filterFavorited = !!result[STORAGE_KEYS.FILTER_FAVORITED];
            settings.filterDownloaded = !!result[STORAGE_KEYS.FILTER_DOWNLOADED];
            
            if (settings.filterLiked || settings.filterFavorited || settings.filterDownloaded) {
                DownloadHistoryService.getInstance().refresh().then(() => {
                    updateAll();
                });
            }
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

            if (changed) updateAll();
        });
    }
};
