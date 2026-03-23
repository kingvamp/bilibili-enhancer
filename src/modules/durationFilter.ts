import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

/**
 * Bilibili Video Duration Filter
 * Features:
 * - Filters videos by minimum/maximum duration.
 * - Supports 'hide' (display: none) or 'dim' (opacity: 0.2) modes.
 * - Works on Recommendation Feed, Search Results, and User Space.
 */

const CARD_SELECTORS = [
    '.bili-video-card', 
    '.small-item', 
    '.video-page-card', 
    '.rank-item', 
    '.feed-card', 
    '.cube-list li', 
    '.floor-card', 
    '.recommend-card', 
    '.video-page-card-small', 
    '.bili-dyn-card-video',
    '.item',
    '.v-card-single',
    '.video-card-common',
    '.upload-video-card',
    '.items__item'
];

const WRAPPER_SELECTORS = [
    '.feed-card', 
    '.bili-video-card__wrap', 
    '.video-list-item', 
    '.col_3', 
    '.col_4', 
    '.card-box', 
    '.upload-video-card', 
    '.items__item', 
    '.floor-card', 
    '.recommend-card', 
    '.video-page-card-small', 
    '.bili-dyn-list__item',
    '.small-item',
    '.item'
];

const DURATION_SELECTORS = [
    '.bili-video-card__stats__duration',
    '.length',
    '.duration',
    '.item-footer > span:first-child',
    '.bili-video-card__stats span:last-child',
    '.bili-video-card__info__duration',
    '.bili-cover-card__stats__duration',
    '.stats span.length'
];

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

let observer: MutationObserver | null = null;
let scanTimeout: number | undefined;
let periodicInterval: number | undefined;

function getWrapper(card: HTMLElement): HTMLElement {
    const wrapper = card.closest(WRAPPER_SELECTORS.join(', ')) as HTMLElement | null;
    return (wrapper && wrapper !== document.body) ? wrapper : card;
}

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

function applyFilter(card: HTMLElement, duration: number): void {
    const wrapper = getWrapper(card);
    const isFiltered = (settings.min > 0 && duration < settings.min) || 
                      (settings.max > 0 && duration > settings.max);

    if (isFiltered) {
        if (settings.mode === 'hide') {
            wrapper.style.setProperty('display', 'none', 'important');
        } else {
            wrapper.style.setProperty('opacity', '0.2', 'important');
            wrapper.style.removeProperty('display');
        }
        card.dataset.geminiDurationFiltered = 'true';
    } else {
        if (card.dataset.geminiDurationFiltered === 'true') {
            wrapper.style.removeProperty('display');
            wrapper.style.removeProperty('opacity');
            delete card.dataset.geminiDurationFiltered;
        }
    }
}

function scan(): void {
    if (!settings.enabled) return;

    const cards = document.querySelectorAll<HTMLElement>(CARD_SELECTORS.join(', '));
    cards.forEach(card => {
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
            if (seconds > 0 || durationText.includes(':')) {
                applyFilter(card, seconds);
            }
        }
    });
}

function debouncedScan(): void {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = window.setTimeout(scan, 200);
}

function start(): void {
    if (observer) return;
    setTimeout(scan, 500);
    observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) debouncedScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (!periodicInterval) {
        periodicInterval = window.setInterval(scan, 2000);
    }
}

function stop(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (scanTimeout) clearTimeout(scanTimeout);
    if (periodicInterval) {
        clearInterval(periodicInterval);
        periodicInterval = undefined;
    }

    document.querySelectorAll<HTMLElement>('[data-gemini-duration-filtered]').forEach(card => {
        const wrapper = getWrapper(card);
        wrapper.style.removeProperty('display');
        wrapper.style.removeProperty('opacity');
        delete card.dataset.geminiDurationFiltered;
    });
}

export const DurationFilterModule: Module = {
    init: () => {
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
                console.log('[Bilibili Enhancer] Duration filter started', settings);
                start();
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
                stop();
                if (settings.enabled) start();
            }
        });
    }
};
