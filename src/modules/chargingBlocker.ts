import { Module } from '../types';
import { STORAGE_KEYS } from '../constants';

/**
 * Bilibili Charging Video Blocker
 * Refactored to Functional Module style.
 * 
 * Features:
 * - Hides "Charging Exclusive" (paid) videos.
 * - Uses caching (sessionStorage) to remember safe/blocked videos.
 * - Uses a concurrent queue for API checks to avoid rate limiting.
 * - Uses MutationObserver for dynamic content.
 */

const CACHE_KEY = 'Gemini_Bvid_Cache';
const MAX_CONCURRENT = 4;

const KEYWORDS = ["充电专属"];
const CARD_SELECTORS = ['.bili-video-card', '.small-item', '.video-page-card', '.rank-item', '.feed-card', '.cube-list li'];
const WRAPPER_SELECTORS = ['.feed-card', '.bili-video-card__wrap', '.video-list-item', '.col_3', '.col_4', '.card-box', '.upload-video-card'];

interface StorageCache {
  safe: string[];
  charging: string[];
}

interface QueueItem {
  bvid: string;
  card: HTMLElement;
  wrapper: HTMLElement;
}

interface BiliApiResponse {
  code: number;
  data?: {
    is_upower_exclusive?: boolean;
    is_upower_video?: boolean;
    rights?: {
      elec_pay?: number;
      arc_pay?: number;
    };
    badge?: string;
    [key: string]: any;
  };
}

// === State ===
let isEnabled = false;
let safeSet = new Set<string>();
let chargingSet = new Set<string>();
const queue: QueueItem[] = [];
let activeRequests = 0;
let scanTimeout: number | undefined;
let observer: MutationObserver | null = null;

// === Helper Functions ===

function loadCache(): void {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (stored) {
      const data: StorageCache = JSON.parse(stored);
      safeSet = new Set(data.safe);
      chargingSet = new Set(data.charging);
    }
  } catch (e) {
    console.warn('[ChargingBlocker] Failed to load cache', e);
  }
}

function saveCache(): void {
  try {
    const data: StorageCache = {
      safe: Array.from(safeSet),
      charging: Array.from(chargingSet)
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[ChargingBlocker] Failed to save cache', e);
  }
}

function getBvid(card: HTMLElement): string | null {
  let bvid = card.dataset.targetBvid || card.getAttribute('data-target-bvid');
  if (!bvid) {
    const link = card.querySelector<HTMLAnchorElement>('a[href*="/video/BV"]');
    if (link) {
      const match = link.href.match(/(BV[a-zA-Z0-9]+)/);
      if (match) bvid = match[1];
    }
  }
  return bvid || null;
}

function getWrapper(card: HTMLElement): HTMLElement {
  const wrapper = card.closest(WRAPPER_SELECTORS.join(', ')) as HTMLElement | null;
  return (wrapper && wrapper !== document.body) ? wrapper : card;
}

function hideItem(item: QueueItem): void {
  item.wrapper.style.display = 'none';
  item.card.dataset.hiddenByGemini = 'true';
}

function markSafe(item: QueueItem): void {
  item.card.dataset.hiddenByGemini = 'safe';
}

// === Logic ===

async function checkApi(item: QueueItem): Promise<void> {
  try {
    const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${item.bvid}`);
    const json: BiliApiResponse = await res.json();

    if (json?.code === 0 && json.data) {
      const d = json.data;
      const isCharging =
        d.is_upower_exclusive === true ||
        d.is_upower_video === true ||
        d.rights?.elec_pay === 1 ||
        d.rights?.arc_pay === 1 ||
        d.badge === '充电专属';

      const str = JSON.stringify(d);
      const hasHiddenPayFlag = str.includes('"is_pay":1') || str.includes('"is_pay":true');

      if (isCharging || hasHiddenPayFlag) {
        hideItem(item);
        chargingSet.add(item.bvid);
      } else {
        markSafe(item);
        safeSet.add(item.bvid);
      }
      saveCache();
    }
  } catch (e) {
    // Request failed, do not cache, retry next time
    delete item.card.dataset.hiddenByGemini;
  }
}

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    activeRequests++;
    checkApi(item).finally(() => {
      activeRequests--;
      processQueue();
    });
  }
}

function scan(): void {
  if (!isEnabled) return;
  const selectorString = CARD_SELECTORS.join(', ');
  const cards = document.querySelectorAll<HTMLElement>(selectorString);

  cards.forEach((card) => {
    if (card.style.display === 'none' || card.dataset.hiddenByGemini) return;

    const wrapper = getWrapper(card);

    // 1. Text check
    if (KEYWORDS.some(kw => card.innerText.includes(kw))) {
      hideItem({ bvid: '', card, wrapper });
      return;
    }

    // 2. BVID check
    const bvid = getBvid(card);
    if (bvid) {
      if (chargingSet.has(bvid)) {
        hideItem({ bvid, card, wrapper });
      } else if (safeSet.has(bvid)) {
        markSafe({ bvid, card, wrapper });
      } else {
        card.dataset.hiddenByGemini = 'processing';
        queue.push({ bvid, card, wrapper });
        processQueue();
      }
    }
  });
}

function debouncedScan(): void {
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = window.setTimeout(scan, 150);
}

function start(): void {
  if (observer) return;
  loadCache();
  scan();
  observer = new MutationObserver((mutations) => {
    const shouldCheck = mutations.some(m => m.addedNodes.length > 0);
    if (shouldCheck) debouncedScan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stop(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (scanTimeout) clearTimeout(scanTimeout);

  // Restore visibility
  document.querySelectorAll('[data-hidden-by-gemini="true"]').forEach(el => {
    const element = el as HTMLElement;
    const wrapper = getWrapper(element);
    wrapper.style.display = '';
    delete element.dataset.hiddenByGemini;
  });
}

export const ChargingBlockerModule: Module = {
  init: () => {
    // 1. Load setting
    chrome.storage.sync.get([STORAGE_KEYS.HIDE_CHARGING], (result) => {
      isEnabled = (result[STORAGE_KEYS.HIDE_CHARGING] ?? true) as boolean;
      if (isEnabled) start();
    });

    // 2. Listen for changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEYS.HIDE_CHARGING]) {
        isEnabled = changes[STORAGE_KEYS.HIDE_CHARGING].newValue as boolean;
        if (isEnabled) {
          start();
        } else {
          stop();
        }
      }
    });
  }
};