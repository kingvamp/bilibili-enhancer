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
`;

const WRAPPER_SELECTORS = [
  '.feed-card', '.bili-video-card__wrap', '.video-list-item', '.col_3', 
  '.col_4', '.card-box', '.upload-video-card', '.items__item', 
  '.floor-card', '.recommend-card', '.video-page-card-small', '.bili-dyn-list__item'
];

export class ChargingUI {
  private styleEl: HTMLStyleElement | null = null;

  public injectStyle() {
    if (document.getElementById('gemini-charging-style')) return;
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'gemini-charging-style';
    this.styleEl.textContent = MASK_CSS;
    document.head.appendChild(this.styleEl);
  }

  public removeStyle() {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }

  public getWrapper(card: HTMLElement): HTMLElement {
    const wrapper = card.closest(WRAPPER_SELECTORS.join(', ')) as HTMLElement | null;
    return (wrapper && wrapper !== document.body) ? wrapper : card;
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
