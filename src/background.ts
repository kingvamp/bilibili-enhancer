// src/background.ts

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchCover') {
        const bvid = request.bvid;
        const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // 转发成功的数据
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                // 转发错误
                sendResponse({ success: false, error: error.toString() });
            });

        return true; // 告诉 Chrome 我们会异步发送响应
    }
});