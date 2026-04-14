import { FilterEngine, FilterMode } from '../../services/FilterEngine';
import { findCoverInElement } from '../../utils/dom';

/**
 * ChargingUI (Refactored to use FilterEngine)
 * Handles CSS injection and badge decoration. Hiding logic is delegated to FilterEngine.
 */

const BADGE_STYLE = `
.gemini-toast {
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    background: #ff4d4f; color: white; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999;
    font-size: 14px; display: flex; align-items: center; gap: 10px;
    animation: gemini-fade-in 0.3s ease;
}
@keyframes gemini-fade-in { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
.gemini-charging-badge {
    position: absolute; top: 0; right: 0;
    background: #fb7299; color: #fff; padding: 2px 6px;
    border-top-right-radius: inherit;
    border-bottom-left-radius: 4px;
    font-size: 11px; font-weight: bold;
    z-index: 10; pointer-events: none; line-height: 1.2;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
`;

export class ChargingUI {
  private styleEl: HTMLStyleElement | null = null;

  public injectStyle() {
    if (document.getElementById('gemini-charging-style')) return;
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'gemini-charging-style';
    this.styleEl.textContent = BADGE_STYLE;
    document.head.appendChild(this.styleEl);
  }

  public showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'gemini-toast';
    toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  public removeStyle() {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }

  /**
   * Applies visual filtering via FilterEngine.
   */
  public applyVisuals(card: HTMLElement, mode: string): void {
    const filterMode = mode as FilterMode;
    FilterEngine.getInstance().apply(card, 'charging', filterMode);
  }

  /**
   * Adds a "Charging" badge to the cover.
   */
  public applyBadge(card: HTMLElement): void {
    const cover = findCoverInElement(card) || card;
    
    if (getComputedStyle(cover).position === 'static') {
      cover.style.position = 'relative';
    }

    let badge = cover.querySelector('.gemini-charging-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'gemini-charging-badge';
      badge.textContent = '充电专属';
      cover.appendChild(badge);
    }
  }

  public markSafe(card: HTMLElement): void {
    FilterEngine.getInstance().apply(card, 'charging', 'off');
  }

  public clearVisuals(): void {
    // FilterEngine will handle resetting its own state if needed,
    // but here we ensure the charging filter is turned off for all cards.
    document.querySelectorAll<HTMLElement>('[data-target-bvid], .bili-video-card').forEach(el => {
        FilterEngine.getInstance().apply(el, 'charging', 'off');
        const badge = el.querySelector('.gemini-charging-badge');
        if (badge) badge.remove();
    });
  }
}
