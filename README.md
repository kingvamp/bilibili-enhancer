# Bilibili Enhancer (B站增强插件)

这是一个 Chrome 浏览器扩展，基于 TypeScript 和 Webpack 开发。
它可以为B站网页添加实用的增强功能。

## ✨ 功能特性

* **视频旋转**：支持向左/向右旋转视频 (解决某些手机上传的视频方向错误问题)。
* **快捷截图**：按 `Shift + S` 快速截图，文件名包含视频标题、BV号和当前时间。
* **毫秒级时间**：在进度条旁显示精确到毫秒的时间。

## 🛠️ 开发与构建

如果你想自己修改源码或编译插件，请按照以下步骤操作：

1.  **克隆仓库**
    ```bash
    git clone [https://github.com/你的用户名/bilibili-enhancer.git](https://github.com/你的用户名/bilibili-enhancer.git)
    cd bilibili-enhancer
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **开发模式 (监听文件变化)**
    ```bash
    npm run watch
    ```

4.  **构建生产版本**
    ```bash
    npm run build
    ```

## 📦 如何安装

1.  运行 `npm run build` 生成 `dist` 目录。
2.  打开 Chrome 浏览器，进入 `chrome://extensions/`。
3.  开启右上角的 **"开发者模式"**。
4.  点击 **"加载已解压的扩展程序"**，选择本项目根目录。

## 📝 License

MIT License