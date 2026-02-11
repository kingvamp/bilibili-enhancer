# Bilibili Enhancer (B站增强插件)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=flat&logo=webpack&logoColor=black)

基于 TypeScript 和 Manifest V3 开发的 Chrome 浏览器扩展，全方位提升 Bilibili 网页版的使用体验。

它集成了 **播放器增强**、**浏览体验优化** 以及 **社交关系辅助** 三大核心模块。

## ✨ 核心功能 (Features)

### 1. 📺 播放器增强
在视频播放页面，为播放器控制栏增加实用工具：
* **视频旋转**：支持向左/向右 90° 旋转视频，拯救方向错误的手机投稿。
* **快捷截图**：点击按钮或按 `Shift + S`，自动生成包含标题、BV号和时间戳的截图。
* **毫秒级时间**：在进度条旁显示精确到毫秒的时间（如 `03:14.159`），便于逐帧分析。

### 2. 🖼️ 封面大图预览
在浏览视频列表（推荐列表、稍后再看、个人空间、收藏夹）时：
* **鼠标悬停预览**：指向视频链接，左侧自动浮现高清封面大图。
* **智能吸附**：预览图紧贴列表左侧，不遮挡视线。
* **多尺寸支持**：可在设置中选择 **小/中/大** 三种尺寸，或关闭此功能。

### 3. 🌟 已关注UP主高亮
在评论区、推荐列表、动态等全站任意角落：
* **醒目高亮**：自动识别你已关注的 UP 主，将其名字显示为**玫红色粗体**。
* **快速识别**：让你在茫茫评论区中一眼认出“自己人”。
* **一键同步**：支持在插件面板中一键同步最新的关注列表（本地缓存，保护隐私）。

## ⚙️ 设置面板

点击浏览器右上角的插件图标，即可打开设置面板：

* **功能开关**：可独立开启/关闭毫秒时间、关注高亮等功能。
* **封面尺寸**：调整预览图的大小 (320px / 480px / 640px)。
* **数据同步**：手动点击“同步关注列表”以更新高亮数据。

## 🛠️ 安装与开发

### 安装方式
1.  下载本项目 Release 页面的 `zip` 包或克隆源码。
2.  打开 Chrome 扩展管理页 `chrome://extensions/`。
3.  开启右上角 **"开发者模式"**。
4.  点击 **"加载已解压的扩展程序"**，选择 `dist` 目录。

### 本地开发指南
```bash
# 1. 克隆项目
git clone [https://github.com/你的用户名/bilibili-enhancer.git](https://github.com/你的用户名/bilibili-enhancer.git)

# 2. 安装依赖
npm install

# 3. 开启监听模式 (开发时使用)
npm run watch

# 4. 构建生产版本
npm run build