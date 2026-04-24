import { SELECTORS } from '../constants/selectors';
import { DynamicVideoService, BiliDynamicVideo } from '../services/DynamicVideoService';
import { extractUid } from '../utils/dom';

/**
 * 空间动态视频模块
 * 负责在个人空间投稿页注入“动态投稿”分类，并渲染内容。
 */
export const SpaceDynamicModule = {
    private: {
        isDynamicMode: false,
        containerMutationObserver: null as MutationObserver | null,
    },

    init() {
        if (!location.href.includes('space.bilibili.com')) return;
        this.startObserver();
    },

    startObserver() {
        const observer = new MutationObserver(() => {
            // 支持在 /upload 及其子目录下注入，不再局限于 /video
            if (location.href.includes('/upload') || location.href.includes('/video')) {
                this.injectSidebarItem();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        if (location.href.includes('/upload') || location.href.includes('/video')) {
            this.injectSidebarItem();
        }
    },

    /**
     * 注入侧边栏项
     */
    injectSidebarItem() {
        if (document.querySelector('.bili-enhanced-dynamic-tag')) return;

        const sidebar = this.findSidebar();
        if (!sidebar) return;

        const isNewLayout = sidebar.classList.contains('contribution-side-nav');
        const isContributionSide = sidebar.classList.contains('contribution-side');
        const isSidenav = sidebar.classList.contains('side-nav') || sidebar.querySelector('.side-nav__item');
        const navContainer = isSidenav ? (sidebar.classList.contains('side-nav') ? sidebar : sidebar.querySelector('.side-nav') || sidebar) : sidebar;

        let dynamicItem: HTMLElement;
        if (isSidenav) {
            dynamicItem = document.createElement('div');
            dynamicItem.className = 'side-nav__item bili-enhanced-dynamic-tag';
            dynamicItem.innerHTML = `
                <div class="side-nav__item__main">
                    <span class="side-nav__item__main-text">动态投稿</span>
                </div>
                <div class="side-nav__item__sub" style="display:none;"><span class="side-nav__item__sub-text">0</span></div>
            `;
        } else if (isContributionSide) {
            dynamicItem = document.createElement('div');
            dynamicItem.className = 'contribution-side-item bili-enhanced-dynamic-tag';
            dynamicItem.innerHTML = `
                <div class="side-item-label"><span>动态投稿</span></div>
                <div class="side-item-count" style="display:none;"><span>0</span></div>
            `;
        } else {
            dynamicItem = document.createElement('li');
            dynamicItem.className = isNewLayout ? 'side-nav-item bili-enhanced-dynamic-tag' : 'item bili-enhanced-dynamic-tag';
            dynamicItem.innerHTML = isNewLayout ? 
                `<a class="nav-item"><span class="text">动态投稿</span></a><span class="num" style="display:none;">0</span>` : 
                `<a class="t"><span class="num" style="display: none;">0</span><span class="text">动态投稿</span></a>`;
        }

        dynamicItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.switchToDynamicMode(dynamicItem);
        });

        // 插入到“视频”之后
        const firstItem = navContainer.querySelector('.item, .side-nav-item, .contribution-side-item, .side-nav__item') || navContainer.firstChild;
        if (firstItem) {
            firstItem.after(dynamicItem);
        } else {
            navContainer.appendChild(dynamicItem);
        }

        // 监听原生项点击，用于退出动态模式
        const nativeItems = navContainer.querySelectorAll('.item, .side-nav-item, .contribution-side-item, .side-nav__item');
        nativeItems.forEach(item => {
            if (!item.classList.contains('bili-enhanced-dynamic-tag')) {
                item.addEventListener('click', () => {
                    if (this.private.isDynamicMode) {
                        this.private.isDynamicMode = false;
                        dynamicItem.classList.remove('active', SELECTORS.SPACE.ACTIVE_CLASS);
                        this.toggleNativeElements(true);
                        // 如果在同一个 URL 下（比如原本就在投稿页），需要手动触发一次刷新或模拟 B 站的导航来恢复内容
                        // 最简单的办法是如果识别到还在投稿页，且内容被我们清空了，就 location.reload()
                        if (location.href.includes('/upload')) {
                           // 给 B 站一点点时间走原生的点击逻辑，如果内容没回来，我们再考虑干预
                           setTimeout(() => {
                               const container = this.findVideoContainer();
                               if (container && (container.querySelector('.loading-state') || container.querySelector('.empty-state'))) {
                                    location.reload(); 
                               }
                           }, 100);
                        }
                    }
                });
            }
        });
    },

    findSidebar(): HTMLElement | null {
        for (const selector of SELECTORS.SPACE.SIDEBAR_NAV) {
            const found = document.querySelector(selector);
            if (found) return found as HTMLElement;
        }
        return null;
    },

    /**
     * 切换到动态视频模式
     */
    async switchToDynamicMode(activeItem: HTMLElement) {
        this.private.isDynamicMode = true;
        const sidebar = this.findSidebar();
        if (sidebar) {
            sidebar.querySelectorAll('.item, .side-nav-item, .contribution-side-item, .side-nav__item').forEach(item => {
                item.classList.remove(SELECTORS.SPACE.ACTIVE_CLASS, 'active', 'on', 'is-active');
            });
        }
        activeItem.classList.add('active', SELECTORS.SPACE.ACTIVE_CLASS);

        const mainContainer = this.findVideoContainer();
        if (!mainContainer) return;
        
        // 隐藏原生分页和可能的空状态
        this.toggleNativeElements(false);
        
        mainContainer.innerHTML = '<div class="loading-state" style="text-align: center; padding: 20px;">正在加载动态视频...</div>';

        const mid = extractUid(location.href);
        if (!mid) {
            mainContainer.innerHTML = '<div style="text-align: center; color: red;">未识别到 UID</div>';
            return;
        }

        try {
            const service = DynamicVideoService.getInstance();
            
            // 初始循环抓取，直到凑够至少 18 个视频（或抓完 10 页）
            let allVideos: BiliDynamicVideo[] = [];
            let pagesFetched = 0;
            const MAX_INITIAL_PAGES = 10;

            while (allVideos.length < 18 && pagesFetched < MAX_INITIAL_PAGES) {
                const videos = await service.fetchDynamicVideos(mid, pagesFetched === 0);
                allVideos = [...allVideos, ...videos];
                pagesFetched++;
                if (!service.getStatus().hasMore) break;
            }
            
            // 更新标签上的数量显示
            this.updateTabCount(activeItem, allVideos.length);

            this.renderVideos(mainContainer, allVideos);
            this.renderLoadMore(mainContainer, mid);
        } catch (error) {
            mainContainer.innerHTML = '<div style="text-align: center; color: red;">获取动态视频失败</div>';
        }
    },

    /**
     * 更新标签上的统计数字
     */
    updateTabCount(activeItem: HTMLElement, count: number) {
        const countEl = activeItem.querySelector('.side-nav__item__sub-text, .side-item-count span, .num');
        const countWrapper = activeItem.querySelector('.side-nav__item__sub, .side-item-count');
        
        if (countEl) {
            countEl.textContent = count.toString();
        }
        if (countWrapper) {
            (countWrapper as HTMLElement).style.display = ''; // 确保显示
        }
    },

    /**
     * 隐藏/显示原生的分页等元素
     */
    toggleNativeElements(show: boolean) {
        const nativePagination = document.querySelector('.be-pager, .pager, .v-pager, .base-pagination-container');
        if (nativePagination) {
            (nativePagination as HTMLElement).style.display = show ? '' : 'none';
        }
    },

    /**
     * 渲染加载更多按钮
     */
    renderLoadMore(container: HTMLElement, mid: number) {
        // 先移除旧按钮
        const oldBtn = container.querySelector('.dynamic-load-more-btn');
        if (oldBtn) oldBtn.remove();

        const service = DynamicVideoService.getInstance();
        if (!service.getStatus().hasMore) return;

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'dynamic-load-more-btn';
        btnWrapper.style.cssText = 'text-align: center; padding: 30px 0; margin-top: 20px;';
        
        const btn = document.createElement('button');
        btn.innerText = '点击加载更多动态视频';
        btn.style.cssText = 'padding: 10px 30px; border-radius: 4px; border: 1px solid #00aeec; background: transparent; color: #00aeec; cursor: pointer; transition: all 0.3s;';
        
        btn.onmouseover = () => { btn.style.background = '#00aeec'; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#00aeec'; };

        btn.onclick = async () => {
            if ((this as any)._isLoadingMore) return;
            (this as any)._isLoadingMore = true;
            btn.innerText = '正在加载...';
            
            try {
                let fetchedVideos: BiliDynamicVideo[] = [];
                let pagesFetched = 0;
                const MAX_LOAD_MORE_PAGES = 10;
                const TARGET_COUNT = 18;

                while (fetchedVideos.length < TARGET_COUNT && pagesFetched < MAX_LOAD_MORE_PAGES) {
                    const moreVideos = await service.fetchDynamicVideos(mid, false);
                    if (moreVideos.length === 0 && !service.getStatus().hasMore) break;
                    
                    fetchedVideos = [...fetchedVideos, ...moreVideos];
                    pagesFetched++;
                    if (!service.getStatus().hasMore) break;
                }

                if (fetchedVideos.length > 0) {
                    this.appendVideos(container, fetchedVideos);
                    
                    // 更新数量
                    const dynamicTag = document.querySelector('.bili-enhanced-dynamic-tag') as HTMLElement;
                    if (dynamicTag) {
                        const totalCount = container.querySelectorAll('.upload-video-card').length;
                        this.updateTabCount(dynamicTag, totalCount);
                    }

                    this.renderLoadMore(container, mid); // 重新把按钮放到底部
                } else {
                    btn.innerText = '没有更多动态视频了';
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'default';
                }
            } catch (error) {
                btn.innerText = '加载失败，点击重试';
            } finally {
                (this as any)._isLoadingMore = false;
            }
        };

        btnWrapper.appendChild(btn);
        container.appendChild(btnWrapper);
    },

    findVideoContainer(): HTMLElement | null {
        for (const selector of SELECTORS.SPACE.VIDEO_LIST_CONTAINER) {
            const found = document.querySelector(selector);
            if (found) return found as HTMLElement;
        }
        return null;
    },

    /**
     * 渲染视频卡片列表
     */
    renderVideos(container: HTMLElement, videos: BiliDynamicVideo[]) {
        if (videos.length === 0) {
            container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 20px;">暂无动态视频内容</div>';
            return;
        }

        container.innerHTML = '';
        this.appendVideos(container, videos);
    },

    /**
     * 追加视频卡片
     */
    appendVideos(container: HTMLElement, videos: BiliDynamicVideo[]) {
        videos.forEach(v => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'upload-video-card grid-mode';
            cardWrapper.dataset.v3852264d = ''; 
            
            const pubDateStr = new Date(v.pubDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

            cardWrapper.innerHTML = `
                <div class="upload-video-card__left">
                    <div class="upload-video-card__main">
                        <div class="bili-video-card">
                            <div class="bili-video-card__wrap">
                                <div class="bili-video-card__cover">
                                    <a class="bili-cover-card" href="//www.bilibili.com/video/${v.bvid}" target="_blank" data-target-bvid="${v.bvid}">
                                        <div class="bili-cover-card__thumbnail">
                                            <img src="${v.cover}@672w_378h_1c.webp" class="b-img__inner" alt="${v.title}">
                                        </div>
                                        <div class="bili-cover-card__stats">
                                            <div class="bili-cover-card__stat">
                                                <i class="sic-BDC-playdata_square_line"></i>
                                                <span>${v.playCount}</span>
                                            </div>
                                            <div class="bili-cover-card__stat">
                                                <i class="sic-BDC-danmu_square_line"></i>
                                                <span>${v.danmakuCount}</span>
                                            </div>
                                            <div class="bili-cover-card__stat">
                                                <span>${v.duration}</span>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                                <div class="bili-video-card__details">
                                    <div class="bili-video-card__title" title="${v.title}">
                                        <a href="//www.bilibili.com/video/${v.bvid}" target="_blank">${v.title}</a>
                                    </div>
                                    <div class="bili-video-card__subtitle">
                                        <span>${pubDateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <span class="bili-enhanced-marker" style="display: none;"></span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(cardWrapper);
        });
    }
};
