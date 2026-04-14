import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';
import { SELECTORS } from '../constants/selectors';
import { FilterEngine } from '../services/FilterEngine';

/**
 * Bilibili Video Duration Filter (Refactored to use FilterEngine)
 */

const DURATION_SELECTORS = SELECTORS.VIDEO_CARD.DURATION;

interface FilterSettings {
    enabled: boolean;
    min: number; // seconds
    max: number; // seconds (0 means no limit)
    mode: 'hide' | 'dim';
}

let settings: FilterSettings = {
    enabled: false,
    min: 0,
    max: 0,
    mode: 'hide'
};

/**
 * Parses duration string (e.g., "05:20", "01:05:20") into seconds.
 */
function parseDuration(text: string): number {
    if (!text) return 0;
    const cleanText = text.replace(/[^\d:]/g, '').trim();
    if (!cleanText) return 0;

    const parts = cleanText.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    
    if (parts.length === 2) { // MM:SS
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) { // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] || 0;
}

function checkAndApply(card: HTMLElement): void {
    if (!settings.enabled) {
        FilterEngine.getInstance().apply(card, 'duration', 'off');
        return;
    }

    let durationText = '';
    for (const selector of DURATION_SELECTORS) {
        const el = card.querySelector(selector);
        if (el && el.textContent && el.textContent.trim()) {
            durationText = el.textContent.trim();
            break;
        }
    }

    // Regex fallback
    if (!durationText) {
        const spans = card.querySelectorAll('span');
        for (const span of Array.from(spans)) {
            const text = (span.textContent || '').trim();
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                durationText = text;
                break;
            }
        }
    }

    if (durationText) {
        const seconds = parseDuration(durationText);
        const isFiltered = (settings.min > 0 && seconds < settings.min) || 
                          (settings.max > 0 && seconds > settings.max);
        
        FilterEngine.getInstance().apply(card, 'duration', isFiltered ? settings.mode : 'off');
    }
}

function updateAll() {
    document.querySelectorAll<HTMLElement>(SELECTORS.VIDEO_CARD.ENTITY.join(', ')).forEach(checkAndApply);
}

export const DurationFilterModule: Module = {
    init: () => {
        FilterEngine.getInstance().onScan((card) => {
            checkAndApply(card);
        });

        chrome.storage.sync.get([
            STORAGE_KEYS.DURATION_FILTER_ENABLE,
            STORAGE_KEYS.DURATION_FILTER_MIN,
            STORAGE_KEYS.DURATION_FILTER_MAX,
            STORAGE_KEYS.DURATION_FILTER_MODE
        ], (result) => {
            settings.enabled = !!result[STORAGE_KEYS.DURATION_FILTER_ENABLE];
            settings.min = (result[STORAGE_KEYS.DURATION_FILTER_MIN] as number) || 0;
            settings.max = (result[STORAGE_KEYS.DURATION_FILTER_MAX] as number) || 0;
            settings.mode = (result[STORAGE_KEYS.DURATION_FILTER_MODE] as 'hide' | 'dim') || 'hide';

            if (settings.enabled) {
                FilterEngine.getInstance().start();
                updateAll();
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            let changed = false;
            if (changes[STORAGE_KEYS.DURATION_FILTER_ENABLE]) {
                settings.enabled = changes[STORAGE_KEYS.DURATION_FILTER_ENABLE].newValue as boolean;
                changed = true;
            }
            if (changes[STORAGE_KEYS.DURATION_FILTER_MIN]) {
                settings.min = (changes[STORAGE_KEYS.DURATION_FILTER_MIN].newValue as number) || 0;
                changed = true;
            }
            if (changes[STORAGE_KEYS.DURATION_FILTER_MAX]) {
                settings.max = (changes[STORAGE_KEYS.DURATION_FILTER_MAX].newValue as number) || 0;
                changed = true;
            }
            if (changes[STORAGE_KEYS.DURATION_FILTER_MODE]) {
                settings.mode = (changes[STORAGE_KEYS.DURATION_FILTER_MODE].newValue as 'hide' | 'dim') || 'hide';
                changed = true;
            }

            if (changed) {
                if (settings.enabled) FilterEngine.getInstance().start();
                updateAll();
            }
        });
    }
};
