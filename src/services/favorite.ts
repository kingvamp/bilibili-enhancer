import { STORAGE_KEYS } from '../constants';
import { ApiService } from './api';

export class FavoriteService {
    private static instance: FavoriteService;
    private defaultFolderId: string | null = null;

    private constructor() {
        chrome.storage.local.get([STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID], (res) => {
            if (res[STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID]) {
                this.defaultFolderId = res[STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID] as string | null;
            }
        });
    }

    public static getInstance(): FavoriteService {
        if (!FavoriteService.instance) {
            FavoriteService.instance = new FavoriteService();
        }
        return FavoriteService.instance;
    }

    public getCsrf(): string | undefined {
        return (document.cookie.match(/bili_jct=([^;]+)/) || [])[1];
    }

    /**
     * 获取用户默认收藏夹 ID
     */
    public async getDefaultFolderId(): Promise<string | null> {
        if (this.defaultFolderId) return this.defaultFolderId;

        try {
            const navRes = await fetch('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' });
            const navData = await navRes.json();
            if (navData.code !== 0 || !navData.data || !navData.data.isLogin) {
                return null;
            }

            const upMid = navData.data.mid;
            const url = `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${upMid}&type=2`;
            const listRes = await fetch(url, { credentials: 'include' });
            const data = await listRes.json();

            if (data.code === 0 && data.data && data.data.list) {
                const defaultFolder = data.data.list.find((f: any) => f.title === '默认收藏夹') || data.data.list[0];
                if (defaultFolder) {
                    this.defaultFolderId = defaultFolder.id.toString();
                    chrome.storage.local.set({ [STORAGE_KEYS.DEFAULT_FAV_FOLDER_ID]: this.defaultFolderId });
                    return this.defaultFolderId;
                }
            }
            return null;
        } catch (err) {
            console.error('[FavoriteService] Failed to fetch folder:', err);
            return null;
        }
    }

    /**
     * 执行收藏操作
     */
    public async doFavorite(aid: string): Promise<boolean> {
        const folderId = await this.getDefaultFolderId();
        if (!folderId) throw new Error('无法获取收藏夹');

        const csrf = this.getCsrf();
        if (!csrf) throw new Error('未授权 (未登录或 CSRF 缺失)');

        const url = 'https://api.bilibili.com/x/v3/fav/resource/deal';
        const body = new URLSearchParams({
            rid: aid,
            type: '2',
            add_media_ids: folderId,
            csrf: csrf
        });

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://www.bilibili.com/'
            },
            body: body.toString(),
            credentials: 'include'
        });

        const data = await res.json();
        if (data.code === 0 || data.code === 11007) {
            return true;
        } else {
            throw new Error(data.message || `API错误(${data.code})`);
        }
    }

    /**
     * 检查是否已收藏 (复用 ApiService)
     */
    public async checkIsFavorited(bvid: string): Promise<boolean> {
        const relation = await ApiService.getVideoRelation(bvid);
        return !!relation?.fav;
    }
}
