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

  private constructor() {
    this.loadCache();
  }

  public static getInstance(): ChargingService {
    if (!ChargingService.instance) {
      ChargingService.instance = new ChargingService();
    }
    return ChargingService.instance;
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
    if (this.chargingSet.has(bvid)) return true;
    if (this.safeSet.has(bvid)) return false;

    try {
      const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
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
          this.chargingSet.add(bvid);
          this.saveCache();
          return true;
        } else {
          this.safeSet.add(bvid);
          this.saveCache();
          return false;
        }
      }
      return false;
    } catch (e) {
      console.warn(`[ChargingService] Failed to check status for ${bvid}`, e);
      throw e; // Let the caller handle retries
    }
  }
}
