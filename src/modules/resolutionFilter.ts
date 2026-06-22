/**
 * 分辨率过滤模块
 * 根据用户在悬浮菜单中勾选的屏蔽分辨率，过滤对应的视频卡片。
 * 与 src/services/FilterEngine.ts, src/services/DataCenter.ts, src/constants.ts 有关联。
 */

import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { VideoDataCenter } from '../services/DataCenter';
import { FilterEngine } from '../services/FilterEngine';

interface ResolutionSettings {
    filter8k: boolean;
    filter4k: boolean;
    filter2k: boolean;
    filter1080p: boolean;
    filter720p: boolean;
    filterSd: boolean;
}

const settings: ResolutionSettings = {
    filter8k: false,
    filter4k: false,
    filter2k: false,
    filter1080p: false,
    filter720p: false,
    filterSd: false
};

/**
 * 检查并对视频卡片应用分辨率过滤
 */
function checkAndApply(card: HTMLElement, bvid: string | null) {
    if (!bvid) return;

    const isAnyEnabled = settings.filter8k || settings.filter4k || settings.filter2k || 
                         settings.filter1080p || settings.filter720p || settings.filterSd;
    
    // 如果没有启用任何分辨率的过滤，则清除此卡片的分辨率过滤状态
    if (!isAnyEnabled) {
        FilterEngine.getInstance().apply(card, 'resolution', 'off');
        return;
    }

    VideoDataCenter.getVideoInfo(bvid).then(res => {
        if (res && res.resolution) {
            const text = res.resolution.text.toUpperCase();
            let isFiltered = false;

            if (text === '8K' && settings.filter8k) isFiltered = true;
            else if (text === '4K' && settings.filter4k) isFiltered = true;
            else if (text === '2K' && settings.filter2k) isFiltered = true;
            else if (text === '1080P' && settings.filter1080p) isFiltered = true;
            else if (text === '720P' && settings.filter720p) isFiltered = true;
            else if (text === 'SD' && settings.filterSd) isFiltered = true;

            FilterEngine.getInstance().apply(card, 'resolution', isFiltered ? 'hide' : 'off');
        } else {
            FilterEngine.getInstance().apply(card, 'resolution', 'off');
        }
    }).catch(err => {
        console.error('[ResolutionFilter] Failed to fetch video info for:', bvid, err);
        FilterEngine.getInstance().apply(card, 'resolution', 'off');
    });
}

/**
 * 重新处理所有的视频卡片
 */
function updateAll() {
    FilterEngine.getInstance().reprocess();
}

export const ResolutionFilterModule: Module = {
    /**
     * 初始化分辨率过滤模块
     */
    init: () => {
        // 注册卡片扫描回调
        FilterEngine.getInstance().onScan((card, bvid) => {
            checkAndApply(card, bvid);
        });

        // 读取初始设置
        chrome.storage.sync.get([
            STORAGE_KEYS.FILTER_RESOLUTION_8K,
            STORAGE_KEYS.FILTER_RESOLUTION_4K,
            STORAGE_KEYS.FILTER_RESOLUTION_2K,
            STORAGE_KEYS.FILTER_RESOLUTION_1080P,
            STORAGE_KEYS.FILTER_RESOLUTION_720P,
            STORAGE_KEYS.FILTER_RESOLUTION_SD
        ], (result) => {
            settings.filter8k = !!result[STORAGE_KEYS.FILTER_RESOLUTION_8K];
            settings.filter4k = !!result[STORAGE_KEYS.FILTER_RESOLUTION_4K];
            settings.filter2k = !!result[STORAGE_KEYS.FILTER_RESOLUTION_2K];
            settings.filter1080p = !!result[STORAGE_KEYS.FILTER_RESOLUTION_1080P];
            settings.filter720p = !!result[STORAGE_KEYS.FILTER_RESOLUTION_720P];
            settings.filterSd = !!result[STORAGE_KEYS.FILTER_RESOLUTION_SD];

            const isAnyEnabled = settings.filter8k || settings.filter4k || settings.filter2k || 
                                 settings.filter1080p || settings.filter720p || settings.filterSd;
            
            if (isAnyEnabled) {
                FilterEngine.getInstance().start();
                updateAll();
            }
        });

        // 监听存储变化
        chrome.storage.onChanged.addListener((changes) => {
            let changed = false;
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_8K]) {
                settings.filter8k = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_8K].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_4K]) {
                settings.filter4k = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_4K].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_2K]) {
                settings.filter2k = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_2K].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_1080P]) {
                settings.filter1080p = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_1080P].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_720P]) {
                settings.filter720p = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_720P].newValue;
                changed = true;
            }
            if (changes[STORAGE_KEYS.FILTER_RESOLUTION_SD]) {
                settings.filterSd = !!changes[STORAGE_KEYS.FILTER_RESOLUTION_SD].newValue;
                changed = true;
            }

            if (changed) {
                const isAnyEnabled = settings.filter8k || settings.filter4k || settings.filter2k || 
                                     settings.filter1080p || settings.filter720p || settings.filterSd;
                if (isAnyEnabled) {
                    FilterEngine.getInstance().start();
                }
                updateAll();
            }
        });
    }
};
