/**
 * 下载历史服务
 * 负责与本地下载器服务同步历史记录，并提供查询接口
 */

export class DownloadHistoryService {
    private static instance: DownloadHistoryService;
    private history: Set<string> = new Set();
    public loadState: 'loading' | 'ready' | 'error' = 'loading';
    private listeners: Set<(history: Set<string>) => void> = new Set();

    private constructor() {
        this.loadFromCache();
        // 同步其他页面、下载完成和清空历史的存储变更。
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes.download_history) return;
            this.history = new Set(changes.download_history.newValue as string[] | undefined);
            this.loadState = 'ready';
            this.notify();
        });
    }

    public static getInstance(): DownloadHistoryService {
        if (!DownloadHistoryService.instance) {
            DownloadHistoryService.instance = new DownloadHistoryService();
        }
        return DownloadHistoryService.instance;
    }

    private loadFromCache() {
        chrome.storage.local.get(['download_history'], (cache) => {
            const error = chrome.runtime.lastError;
            // 后到达的初始读取不能覆盖已经收到的历史变更。
            if (this.loadState !== 'loading') return;
            if (error) {
                this.loadState = 'error';
                console.warn('[DownloadHistoryService] 读取下载历史失败:', error.message);
            } else {
                this.history = new Set(Array.isArray(cache.download_history) ? cache.download_history : []);
                this.loadState = 'ready';
            }
            this.notify();
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
                        this.loadState = 'ready';
                        this.notify();
                    } else if (res && res.cachedData) {
                        this.history = new Set(res.cachedData);
                        this.loadState = 'ready';
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
