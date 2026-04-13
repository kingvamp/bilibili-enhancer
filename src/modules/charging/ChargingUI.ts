import { SELECTORS } from '../../constants/selectors';
import { findVideoCardWrapper } from '../../utils/dom';

/**
 * ChargingUI
 * Handles CSS injection and visual manipulation (hiding/masking) of video cards.
 */

const MASK_CSS = `
.gemini-charging-mask {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(255, 255, 255, 0.85); z-index: 10;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px); border-radius: 6px;
    color: #fb7299; font-size: 13px; font-weight: bold;
    pointer-events: auto; cursor: not-allowed;
}
.gemini-toast {
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    background: #ff4d4f; color: white; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999;
    font-size: 14px; display: flex; align-items: center; gap: 10px;
    animation: gemini-fade-in 0.3s ease;
}
@keyframes gemini-fade-in { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
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
      // Ensure relative positioning for mask
      if (getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
      }

      let mask = wrapper.querySelector('.gemini-charging-mask');
      if (!mask) {
        mask = document.createElement('div');
        mask.className = 'gemini-charging-mask';
        mask.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:20px; margin-bottom:4px;">⚡</span>
              <span>充电专属</span>
          </div>
        `;
        wrapper.appendChild(mask);
      }
      wrapper.style.removeProperty('display');
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

      const mask = wrapper.querySelector('.gemini-charging-mask');
      if (mask) mask.remove();
    });

    document.querySelectorAll('[data-hidden-by-gemini="safe"]').forEach(el => {
        delete (el as HTMLElement).dataset.hiddenByGemini;
    });

    document.querySelectorAll('[data-hidden-by-gemini="processing"]').forEach(el => {
        delete (el as HTMLElement).dataset.hiddenByGemini;
    });
  }
}
