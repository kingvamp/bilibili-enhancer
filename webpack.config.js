const path = require('path');
const CopyPlugin = require("copy-webpack-plugin"); // 引入插件

module.exports = {
  mode: 'production',
  // 1. 修改 entry：变成多入口对象
  entry: {
    content: './src/content.ts',
    background: './src/background.ts',
    popup: './src/popup/popup.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    // 2. 修改 filename：使用 [name] 占位符，会自动生成 content.js 和 popup.js
    filename: '[name].js', 
    path: path.resolve(__dirname, 'dist'),
    clean: true, // 每次构建前清理 dist 目录
  },
  // 3. 添加插件配置
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/popup/popup.html", to: "popup.html" },
        { from: "src/popup/popup.css", to: "popup.css" },
        { from: "manifest.json", to: "manifest.json" },
        { from: "icons", to: "icons", noErrorOnMissing: true },
      ],
    }),
  ],
};