/**
 * ChargingScanner
 * Coordinates DOM scanning using MutationObserver and manages the concurrent request queue.
 */
import { ChargingService } from './ChargingService';
import { ChargingUI } from './ChargingUI';

const MAX_CONCURRENT = 4;
const KEYWORDS = ["充电专属"];
const CARD_SELECTORS = [
  '.bili-video-card', '.small-item', '.video-page-card', '.rank-item', 
  '.feed-card', '.cube-list li', '.floor-card', '.recommend-card', 
  '.video-page-card-small', '.bili-dyn-card-video'
];

interface QueueItem {
  bvid: string;
  card: HTMLElement;
}

export class ChargingScanner {
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private observer: MutationObserver | null = null;
  private scanTimeout: number | undefined;
  
  constructor(
    private service: ChargingService,
    private ui: ChargingUI,
    private mode: string
  ) {}

  public updateMode(newMode: string) {
    this.mode = newMode;
  }

  public start() {
    if (this.observer) return;
    this.scan();
    this.observer = new MutationObserver((mutations) => {
      if (!chrome.runtime?.id) {
        this.stop();
        return;
      }
      if (mutations.some(m => m.addedNodes.length > 0)) {
        this.debouncedScan();
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  public stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    this.queue = [];
  }

  private debouncedScan() {
    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    this.scanTimeout = window.setTimeout(() => this.scan(), 150);
  }

  public scan() {
    if (this.mode === 'off') return;

    const selectorString = CARD_SELECTORS.join(', ');
    const cards = document.querySelectorAll<HTMLElement>(selectorString);

    cards.forEach((card) => {
      if (card.style.display === 'none' || card.dataset.hiddenByGemini) return;

      // 1. Keyword check (fast)
      if (KEYWORDS.some(kw => card.innerText.includes(kw))) {
        this.ui.applyVisuals(card, this.mode);
        return;
      }

      // 2. BVID API check
      const bvid = this.getBvid(card);
      if (bvid) {
        if (this.service.isKnownCharging(bvid)) {
          this.ui.applyVisuals(card, this.mode);
        } else if (this.service.isKnownSafe(bvid)) {
          this.ui.markSafe(card);
        } else {
          card.dataset.hiddenByGemini = 'processing';
          this.queue.push({ bvid, card });
          this.processQueue();
        }
      }
    });
  }

  private async processQueue() {
    while (this.activeRequests < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      this.activeRequests++;
      this.service.checkChargingStatus(item.bvid)
        .then((isCharging) => {
          if (isCharging) {
            this.ui.applyVisuals(item.card, this.mode);
          } else {
            this.ui.markSafe(item.card);
          }
        })
        .catch(() => {
          // Retry on next scan
          delete item.card.dataset.hiddenByGemini;
        })
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }
  }

  private getBvid(card: HTMLElement): string | null {
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
}
