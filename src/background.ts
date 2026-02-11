// src/background.ts

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. 获取视频详细信息 (复用 fetchCover 的逻辑，建议把 action 名字统一一下，或者兼容旧的)
    // 这里的 view 接口包含了：分辨率(dimension)、分P数(videos)、封面(pic)
    if (request.action === 'fetchVideoInfo' || request.action === 'fetchCover') {
        const url = `https://api.bilibili.com/x/web-interface/view?bvid=${request.bvid}`;
        fetch(url)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.toString() }));
        return true; 
    }

    // 2. 新增：获取关注列表请求 (代理 fetch)
    if (request.action === 'fetchFollowList') {
        const { vmid, page, pageSize } = request;
        const url = `https://api.bilibili.com/x/relation/followings?vmid=${vmid}&pn=${page}&ps=${pageSize}`;
        
        // 关键：credentials: 'include' 确保携带用户 Cookie (这样才能查看到私密的关注列表)
        fetch(url, { credentials: 'include' })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.toString() }));
        
        return true; // 异步响应
    }
    // 3. 新增：下载图片 (转为 Base64 返回，解决跨域下载问题)
    if (request.action === 'fetchImageBlob') {
        fetch(request.url)
            .then(response => response.blob())
            .then(blob => {
                // 将 Blob 转为 DataURL (Base64) 传回给 Content Script
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ success: true, data: reader.result });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.toString() });
            });
        return true; // 异步等待
    }

    // 2. 新增：获取视频互动状态 (点赞/收藏)
    if (request.action === 'fetchVideoRelation') {
        const url = `https://api.bilibili.com/x/web-interface/archive/relation?bvid=${request.bvid}`;
        // 关键：必须带 credentials 才能查到"我"的状态
        fetch(url, { credentials: 'include' })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.toString() }));
        return true;
    }
});