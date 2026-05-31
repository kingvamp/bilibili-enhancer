/**
 * ChargingService
 * Handles Bilibili API calls for video charging status and manages sessionStorage caching.
 */

const CACHE_KEY = 'Gemini_Bvid_Cache';

interface StorageCache {
  safe: string[];
  charging: string[];
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

export class ChargingService {
  private static instance: ChargingService;
  private safeSet = new Set<string>();
  private chargingSet = new Set<string>();
  private isBlocked = false;
  private cooldownTimer: number | null = null;
  private saveCacheTimer: number | null = null;
  private onBlockListeners: (() => void)[] = [];

  private constructor() {
    this.loadCache();
  }

  public static getInstance(): ChargingService {
    if (!ChargingService.instance) {
      ChargingService.instance = new ChargingService();
    }
    return ChargingService.instance;
  }

  public onBlock(callback: () => void) {
    this.onBlockListeners.push(callback);
  }

  private triggerBlock() {
    if (this.isBlocked) return;
    this.isBlocked = true;
    console.warn('[ChargingService] Risk control triggered (412). Entering cooldown.');
    
    this.onBlockListeners.forEach(cb => cb());

    // 10 分钟后自动解除封号重试
    if (this.cooldownTimer) window.clearTimeout(this.cooldownTimer);
    this.cooldownTimer = window.setTimeout(() => {
      this.isBlocked = false;
      this.cooldownTimer = null;
      console.log('[ChargingService] Cooldown ended. Resuming API checks.');
    }, 10 * 60 * 1000);
  }

  public isCoolingDown(): boolean {
    return this.isBlocked;
  }

  private loadCache(): void {
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) {
        const data: StorageCache = JSON.parse(stored);
        this.safeSet = new Set(data.safe);
        this.chargingSet = new Set(data.charging);
      }
    } catch (e) {
      console.warn('[ChargingService] Failed to load cache', e);
    }
  }

  private saveCache(): void {
    try {
      const data: StorageCache = {
        safe: Array.from(this.safeSet),
        charging: Array.from(this.chargingSet)
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[ChargingService] Failed to save cache', e);
    }
  }

  // 防抖写入：避免每检测一个视频就全量序列化写入 sessionStorage
  private scheduleSaveCache(): void {
    if (this.saveCacheTimer) window.clearTimeout(this.saveCacheTimer);
    this.saveCacheTimer = window.setTimeout(() => {
      this.saveCache();
      this.saveCacheTimer = null;
    }, 1000);
  }

  public isKnownCharging(bvid: string): boolean {
    return this.chargingSet.has(bvid);
  }

  public isKnownSafe(bvid: string): boolean {
    return this.safeSet.has(bvid);
  }

  /**
   * Checks the charging status of a video from Bilibili API.
   * @returns true if the video is "Charging Exclusive", false otherwise.
   */
  public async checkChargingStatus(bvid: string): Promise<boolean> {
    if (this.isBlocked) return false;
    if (this.chargingSet.has(bvid)) return true;
    if (this.safeSet.has(bvid)) return false;

    try {
      const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
      
      if (res.status === 412) {
        this.triggerBlock();
        return false;
      }

      const text = await res.text();
      let json: BiliApiResponse;
      try {
        json = JSON.parse(text);
      } catch (e) {
        if (text.includes('<!DOCTYPE html>')) {
          this.triggerBlock();
        }
        return false;
      }

      if (json?.code === 0 && json.data) {
        const d = json.data;
        const isCharging =
          d.is_upower_exclusive === true ||
          d.is_upower_video === true ||
          d.rights?.elec_pay === 1 ||
          d.rights?.arc_pay === 1 ||
          d.badge === '充电专属';

        // 直接检查已知路径的 is_pay 字段，避免将整个响应对象序列化为字符串
        const hasHiddenPayFlag = (d.rights as any)?.is_pay === 1 || (d as any).is_pay === 1 || (d as any).is_pay === true;

        if (isCharging || hasHiddenPayFlag) {
          this.chargingSet.add(bvid);
          this.scheduleSaveCache();
          return true;
        } else {
          this.safeSet.add(bvid);
          this.scheduleSaveCache();
          return false;
        }
      }
      return false;
    } catch (e) {
      console.warn(`[ChargingService] Failed to check status for ${bvid}`, e);
      return false;
    }
  }
}
