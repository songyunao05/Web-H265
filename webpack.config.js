/*
 * @Author: HRC
 * @Date: 2021-09-22 15:06:35
 * @LastEditors: HRC
 * @LastEditTime: 2021-09-22 15:48:35
 * @Description: file content
 * @FilePath: \265player\newDemo\webpack.config.js
 */
const path = require('path');

const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'h265Player': './src/index.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: './dist',
    hot: true
  },

  module: {
    rules: [
      {
        test: /\.worker\.js$/, // 以.worker.js结尾的文件将被worker-loader加载
        use: { loader: 'worker-loader' }
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      //选择html模板
      inject: "body",
      template: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [{
        from: __dirname + '/public',
        to: __dirname + '/dist'
      }]
    })
  ],
}