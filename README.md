# Bilibili Enhancer (B站增强插件)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=flat&logo=webpack&logoColor=black)

基于 TypeScript 和 Manifest V3 开发的 Chrome 浏览器扩展，旨在提升 Bilibili 网页版的使用体验。

它不仅增强了**播放器**的功能（旋转、截图），还优化了**浏览列表**时的体验（封面预览）。

## ✨ 主要功能 (Features)

### 1. 📺 播放器增强
当你在观看视频时，播放器控制栏会增加以下功能：
* **视频旋转**：支持向左/向右 90° 旋转视频。
    * *场景：拯救那些由手机上传、方向错误的视频。*
* **快捷截图**：点击按钮或按快捷键 `Shift + S`。
    * *特性：自动生成文件名（视频标题 + BV号 + 当前时间），所见即所得。*
* **毫秒级时间**：在进度条时间旁显示精确到毫秒的时间戳。
    * *场景：方便进行逐帧分析或精确空降。*

### 2. 🖼️ 全局封面预览 (New!)
当你在浏览视频列表（如**稍后再看**、**个人空间**、**右侧推荐列表**）时：
* **鼠标悬停预览**：鼠标指向视频链接，自动在左侧浮现高清封面大图。
* **智能吸附**：预览图会自动吸附在列表左侧，整齐美观，避免遮挡视线。
* **支持多场景**：完美支持视频页右侧列表、UP主空间视频列表、收藏夹、稍后再看等页面。

## ⚙️ 设置与自定义

点击浏览器右上角的插件图标，打开设置面板：

* **封面预览大小**：提供 **小 (320px)** / **中 (480px)** / **大 (640px)** 三种尺寸，或选择 **关闭**。
* **显示毫秒时间**：开启/关闭播放器旁的毫秒显示。

## 🛠️ 安装与开发

### 安装方式
1.  下载本项目 Release 页面的 `zip` 包或克隆源码。
2.  打开 Chrome 扩展管理页 `chrome://extensions/`。
3.  开启右上角 **"开发者模式"**。
4.  点击 **"加载已解压的扩展程序"**，选择 `dist` 目录（如果是源码需先编译）。

### 本地开发
```bash
# 1. 克隆项目
git clone [https://github.com/你的用户名/bilibili-enhancer.git](https://github.com/你的用户名/bilibili-enhancer.git)

# 2. 安装依赖
npm install

# 3. 开启监听模式 (修改代码自动重新打包)
npm run watch

# 4. 构建生产版本
npm run build