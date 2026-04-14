import { SELECTORS } from '../../constants/selectors';
import { findVideoCardWrapper, findCoverInElement } from '../../utils/dom';

/**
 * ChargingUI
 * Handles CSS injection and visual manipulation (hiding/masking) of video cards.
 */

const MASK_CSS = `
.gemini-charging-mask {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.65); z-index: 10;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(1px); border-radius: inherit;
    pointer-events: none;
}
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
    this.styleEl.textContent = MASK_CSS;
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

  public getWrapper(card: HTMLElement): HTMLElement {
    return findVideoCardWrapper(card);
  }

  /**
   * Applies visual filtering to a video item.
   */
  public applyVisuals(card: HTMLElement, mode: string): void {
    card.dataset.hiddenByGemini = 'true';
    const wrapper = this.getWrapper(card);

    if (mode === 'hide') {
      wrapper.style.setProperty('display', 'none', 'important');
    } else if (mode === 'mask') {
      const cover = findCoverInElement(card) || wrapper;
      
      // Ensure relative positioning for mask
      if (getComputedStyle(cover).position === 'static') {
        cover.style.position = 'relative';
      }

      let mask = cover.querySelector('.gemini-charging-mask');
      if (!mask) {
        mask = document.createElement('div');
        mask.className = 'gemini-charging-mask';
        mask.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:20px; margin-bottom:4px;">⚡</span>
              <span>充电专属</span>
          </div>
        `;
        cover.appendChild(mask);
      }
      wrapper.style.removeProperty('display');
    }
  }

  /**
   * Adds a "Charging" badge to the cover.
   */
  public applyBadge(card: HTMLElement): void {
    card.dataset.hiddenByGemini = 'true';
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
    card.dataset.hiddenByGemini = 'safe';
  }

  public clearVisuals(): void {
    document.querySelectorAll('[data-hidden-by-gemini="true"]').forEach(el => {
      const element = el as HTMLElement;
      const wrapper = this.getWrapper(element);
      wrapper.style.removeProperty('display');
      delete element.dataset.hiddenByGemini;

      // 清理遮罩和角标
      const mask = wrapper.querySelector('.gemini-charging-mask');
      if (mask) mask.remove();

      const badge = wrapper.querySelector('.gemini-charging-badge');
      if (badge) badge.remove();
    });

    document.querySelectorAll('[data-hidden-by-gemini="safe"]').forEach(el => {
        delete (el as HTMLElement).dataset.hiddenByGemini;
    });

    document.querySelectorAll('[data-hidden-by-gemini="processing"]').forEach(el => {
        delete (el as HTMLElement).dataset.hiddenByGemini;
    });
  }
}
