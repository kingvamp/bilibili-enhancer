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
        this.checkPendingMode();
    },

    /**
     * 检查是否有待处理的动态模式切换（用于跨页面跳转后自动触发）
     */
    checkPendingMode() {
        const pending = sessionStorage.getItem('bili_enhanced_pending_dynamic');
        if (pending) {
            sessionStorage.removeItem('bili_enhanced_pending_dynamic');
            // 等待侧边栏项注入后点击它
            const timer = setInterval(() => {
                const dynamicItem = document.querySelector('.bili-enhanced-dynamic-tag') as HTMLElement;
                if (dynamicItem) {
                    clearInterval(timer);
                    this.switchToDynamicMode(dynamicItem);
                }
            }, 100);
            setTimeout(() => clearInterval(timer), 5000); // 超时清理
        }
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

        // 尝试从缓存中预填数量统计，让用户进页面就能看到
        const mid = extractUid(location.href);
        if (mid) {
            const cached = DynamicVideoService.getInstance().loadStateFromSession(mid);
            if (cached && cached.videos.length > 0) {
                this.updateTabCount(dynamicItem, cached.videos.length);
            }
        }

        // 监听整个导航容器的点击，使用捕获模式确保优先处理
        navContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.item, .side-nav-item, .contribution-side-item, .side-nav__item');
            
            if (item && !item.classList.contains('bili-enhanced-dynamic-tag')) {
                // 如果点击的是原生项，且当前处于动态模式
                if (this.private.isDynamicMode) {
                    this.private.isDynamicMode = false;
                    
                    // 移除我们的激活状态
                    dynamicItem.classList.remove('active', SELECTORS.SPACE.ACTIVE_CLASS);
                    this.toggleNativeElements(true);
                }
            }
        }, true);
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
        // 如果当前不是在投稿页的视频子项中，先跳转过去
        const isVideoPage = location.href.includes('/upload/video') || (location.href.endsWith('/video') && !location.href.includes('/upload'));
        if (!isVideoPage) {
            const mid = extractUid(location.href);
            if (mid) {
                sessionStorage.setItem('bili_enhanced_pending_dynamic', '1');
                location.href = `https://space.bilibili.com/${mid}/upload/video`;
                return;
            }
        }

        this.private.isDynamicMode = true;
        const sidebar = this.findSidebar();
        if (sidebar) {
            sidebar.querySelectorAll('.item, .side-nav-item, .contribution-side-item, .side-nav__item').forEach(item => {
                item.classList.remove(SELECTORS.SPACE.ACTIVE_CLASS, 'active', 'on', 'is-active');
            });
        }
        activeItem.classList.add('active', SELECTORS.SPACE.ACTIVE_CLASS);

        // 等待原生容器加载完成
        let nativeContainer = this.findVideoContainer();
        if (!nativeContainer) {
            const containerTimer = setInterval(() => {
                nativeContainer = this.findVideoContainer();
                if (nativeContainer) {
                    clearInterval(containerTimer);
                    this.executeSwitchToDynamicMode(activeItem, nativeContainer);
                }
            }, 100);
            setTimeout(() => clearInterval(containerTimer), 5000);
            return;
        }

        this.executeSwitchToDynamicMode(activeItem, nativeContainer);
    },

    /**
     * 执行真正的切换逻辑（确保容器已就绪）
     */
    async executeSwitchToDynamicMode(activeItem: HTMLElement, nativeContainer: HTMLElement) {
        // 隐藏原生分页和原生内容
        this.toggleNativeElements(false);
        nativeContainer.style.display = 'none';
        
        // 创建或获取我们的专用容器
        let dynamicContainer = document.getElementById('bili-enhanced-dynamic-container');
        if (!dynamicContainer) {
            dynamicContainer = document.createElement('div');
            dynamicContainer.id = 'bili-enhanced-dynamic-container';
            // 复制所有属性以确保 B 站的 Scoped CSS (data-v-*) 能生效
            for (const attr of nativeContainer.attributes) {
                if (attr.name !== 'id' && attr.name !== 'style') {
                    dynamicContainer.setAttribute(attr.name, attr.value);
                }
            }
            dynamicContainer.classList.add('bili-enhanced-dynamic-mode'); 
            nativeContainer.after(dynamicContainer);
        }
        
        dynamicContainer.style.display = '';

        const mid = extractUid(location.href);
        if (!mid) {
            dynamicContainer.innerHTML = '<div style="text-align: center; color: red;">未识别到 UID</div>';
            return;
        }

        const service = DynamicVideoService.getInstance();

        // 优先从 sessionStorage 恢复缓存（解决跨子页面跳转后内容消失的问题）
        const cached = service.loadStateFromSession(mid);
        if (cached && cached.videos.length > 0) {
            this.updateTabCount(activeItem, cached.videos.length);
            this.renderVideos(dynamicContainer, cached.videos);
            this.renderLoadMore(dynamicContainer, mid);
            return;
        }

        // 如果容器里已经有内存中的内容了（当前页面内切换），直接显示
        if (dynamicContainer.querySelector('.upload-video-card')) {
            const totalCount = dynamicContainer.querySelectorAll('.upload-video-card').length;
            this.updateTabCount(activeItem, totalCount);
            return;
        }

        dynamicContainer.innerHTML = '<div class="loading-state" style="text-align: center; padding: 20px;">正在加载动态视频...</div>';

        try {
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
            
            // 保存到缓存
            service.saveStateToSession(mid, allVideos);

            // 更新标签上的数量显示
            this.updateTabCount(activeItem, allVideos.length);

            this.renderVideos(dynamicContainer, allVideos);
            this.renderLoadMore(dynamicContainer, mid);
        } catch (error) {
            dynamicContainer.innerHTML = '<div style="text-align: center; color: red;">获取动态视频失败</div>';
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
        const nativePagination = document.querySelector('.be-pager, .pager, .v-pager, .base-pagination-container, .video-footer, .video-pagination, .vui_pagenation');
        if (nativePagination) {
            (nativePagination as HTMLElement).style.display = show ? '' : 'none';
        }
        
        // 如果是切换回原生，则显示原生容器并隐藏我们的
        const nativeContainer = this.findVideoContainer();
        const dynamicContainer = document.getElementById('bili-enhanced-dynamic-container');
        if (show) {
            if (nativeContainer) nativeContainer.style.display = '';
            if (dynamicContainer) dynamicContainer.style.display = 'none';
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
                        
                        // 更新缓存
                        const currentVideos = this.getVideosFromDOM(container);
                        service.saveStateToSession(mid, currentVideos);

                        // 更新数量
                        const dynamicTag = document.querySelector('.bili-enhanced-dynamic-tag') as HTMLElement;
                        if (dynamicTag) {
                            this.updateTabCount(dynamicTag, currentVideos.length);
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
    },

    /**
     * 从 DOM 中提取视频数据（用于更新缓存）
     */
    getVideosFromDOM(container: HTMLElement): BiliDynamicVideo[] {
        const cards = container.querySelectorAll('.upload-video-card');
        const videos: BiliDynamicVideo[] = [];
        
        cards.forEach(card => {
            const link = card.querySelector('.bili-cover-card') as HTMLAnchorElement;
            const bvid = link?.dataset.targetBvid || '';
            const title = card.querySelector('.bili-video-card__title a')?.textContent || '';
            const cover = card.querySelector('img')?.src.split('@')[0] || '';
            const duration = card.querySelector('.bili-cover-card__stat span:last-child')?.textContent || '';
            const playCount = card.querySelector('.bili-cover-card__stat:first-child span')?.textContent || '0';
            const danmakuCount = card.querySelector('.bili-cover-card__stat:nth-child(2) span')?.textContent || '0';
            const pubDateStr = card.querySelector('.bili-video-card__subtitle span')?.textContent || '';
            
            videos.push({
                bvid,
                title,
                cover,
                duration,
                playCount,
                danmakuCount,
                pubDate: 0, // 日期在缓存中主要是显示，这里由于是反向提取，暂设为0，主要依靠 DOM 显示
                author: ''
            });
        });
        
        return videos;
    }
};
