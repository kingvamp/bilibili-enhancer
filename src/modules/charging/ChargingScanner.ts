/**
 * ChargingScanner
 * Coordinates DOM scanning using MutationObserver and manages the concurrent request queue.
 */
import { ChargingService } from './ChargingService';
import { ChargingUI } from './ChargingUI';
import { FilterEngine } from '../../services/FilterEngine';

const MAX_CONCURRENT = 4;
const KEYWORDS = ["充电专属"];

interface QueueItem {
  bvid: string;
  card: HTMLElement;
}

export class ChargingScanner {
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private observer: MutationObserver | null = null;
  private viewportObserver: IntersectionObserver | null = null;
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
    FilterEngine.getInstance().onScan((card, bvid) => {
        this.processCard(card, bvid);
    });
    FilterEngine.getInstance().start();

    // 初始化视口监听器
    this.viewportObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target as HTMLElement;
          const bvid = this.tryExtractBvid(card);
          if (bvid && !this.service.isCoolingDown()) {
            this.enqueueInfoCheck(card, bvid);
          }
          this.viewportObserver?.unobserve(card);
        }
      });
    }, { rootMargin: '100px' });
  }

  public stop() {
    if (this.viewportObserver) {
      this.viewportObserver.disconnect();
      this.viewportObserver = null;
    }
    this.queue = [];
  }

  private processCard(card: HTMLElement, bvid: string | null) {
      // 1. 关键字快速检查 (不耗费 API)
      const text = card.innerText || '';
      if (KEYWORDS.some(kw => text.includes(kw))) {
        if (this.mode === 'off') {
          this.ui.applyBadge(card);
        } else {
          this.ui.applyVisuals(card, this.mode);
        }
        return;
      }

      // 2. 只有当关键字没找到时，才考虑进入视口后请求 API
      if (bvid) {
        if (this.service.isKnownCharging(bvid)) {
          if (this.mode === 'off') {
            this.ui.applyBadge(card);
          } else {
            this.ui.applyVisuals(card, this.mode);
          }
        } else if (this.service.isKnownSafe(bvid)) {
          this.ui.markSafe(card);
        } else {
          // 标记为等待视口扫描，不直接请求 API
          if (!card.dataset.chargingStatus) {
              card.dataset.chargingStatus = 'pending_viewport';
              this.viewportObserver?.observe(card);
          }
        }
      }
  }

  private enqueueInfoCheck(card: HTMLElement, bvid: string) {
    if (card.dataset.chargingStatus === 'processing') return;
    card.dataset.chargingStatus = 'processing';
    this.queue.push({ bvid, card });
    this.processQueue();
  }

  private async processQueue() {
    // 如果服务处于冷却期，清空队列并停止请求
    if (this.service.isCoolingDown()) {
      this.queue.forEach(item => {
        delete item.card.dataset.chargingStatus;
      });
      this.queue = [];
      return;
    }

    while (this.activeRequests < MAX_CONCURRENT && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      this.activeRequests++;
      this.service.checkChargingStatus(item.bvid)
        .then((isCharging: boolean) => {
          if (isCharging) {
            if (this.mode === 'off') {
              this.ui.applyBadge(item.card);
            } else {
              this.ui.applyVisuals(item.card, this.mode);
            }
          } else {
            this.ui.markSafe(item.card);
          }
        })
        .catch(() => {
          delete item.card.dataset.chargingStatus;
        })
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }
  }

  private tryExtractBvid(card: HTMLElement): string | null {
    const link = card.querySelector<HTMLAnchorElement>('a[href*="/video/BV"]');
    if (link) {
      const match = link.href.match(/(BV[a-zA-Z0-9]+)/);
      if (match) return match[1];
    }
    return card.dataset.targetBvid || null;
  }
}
