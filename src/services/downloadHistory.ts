/**
 * 下载历史服务
 * 负责与本地下载器服务同步历史记录，并提供查询接口
 */

export class DownloadHistoryService {
    private static instance: DownloadHistoryService;
    private history: Set<string> = new Set();
    private listeners: Set<(history: Set<string>) => void> = new Set();

    private constructor() {
        this.loadFromCache();
    }

    public static getInstance(): DownloadHistoryService {
        if (!DownloadHistoryService.instance) {
            DownloadHistoryService.instance = new DownloadHistoryService();
        }
        return DownloadHistoryService.instance;
    }

    private loadFromCache() {
        chrome.storage.local.get(['download_history'], (cache) => {
            if (cache && Array.isArray(cache.download_history)) {
                this.history = new Set(cache.download_history as string[]);
                this.notify();
            }
        });
    }

    /**
     * 从本地服务强制刷新下载历史
     */
    public async refresh(): Promise<Set<string>> {
        if (!chrome.runtime?.id) return this.history;

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'fetchDownloadHistory' }, res => {
                    if (res && res.success && Array.isArray(res.data)) {
                        this.history = new Set(res.data);
                        this.notify();
                    } else if (res && res.cachedData) {
                        this.history = new Set(res.cachedData);
                        this.notify();
                    }
                    resolve(this.history);
                });
            } catch (e) {
                console.warn('[DownloadHistoryService] Context invalidated');
                resolve(this.history);
            }
        });
    }

    public has(bvid: string): boolean {
        return this.history.has(bvid);
    }

    public subscribe(callback: (history: Set<string>) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notify() {
        this.listeners.forEach(cb => cb(this.history));
    }
}
