const path = require('path');

module.exports = {
  mode: 'production', // 开发时可改为 'development' 方便调试
  entry: './src/content.ts', // 入口文件
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
    filename: 'content.js', // 打包输出的文件名
    path: path.resolve(__dirname, 'dist'), // 输出目录
  },
};