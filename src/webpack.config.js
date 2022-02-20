const path = require("path");
const cssExtract = require("mini-css-extract-plugin");
const webpack = require("webpack");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');


module.exports = (env) => [
  {
    entry: "./client/index.tsx",
    output: {
      filename: "index.js",
      path: path.join(__dirname, "static"),
      publicPath: "/static/",
      chunkFilename: "[name]-[contenthash].js"
    },
    target: "web",
    mode: env.prod === "true" ? "production" : "development",
    devtool: env.prod === "true" ? undefined : "inline-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        path: require.resolve("path-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert")
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          options: {
            allowTsInNodeModules: true
          }
        },
        {
          test: /\.css$/,
          use: [
            {loader: cssExtract.loader},
            "css-loader"
          ]
        }
      ]
    },

    plugins: [
      new cssExtract({
        filename: `index.css`,
        chunkFilename: "[id]-[contenthash].css"
      }),
      new webpack.DefinePlugin({
        "process.env.CLIENT_VERSION": JSON.stringify(require("./package.json").version)
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      }),
      new MonacoWebpackPlugin({
        publicPath: "/static/"
      })
    ]
  },
  {
    entry: "./client/sw.ts",
    output: {
      filename: "sw.js",
      path: path.join(__dirname, "static"),
      publicPath: "/static/",
      chunkFilename: "[name]-[contenthash].js"
    },
    target: "web",
    mode: env.prod === "true" ? "production" : "development",
    devtool: env.prod === "true" ? undefined : "inline-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        path: require.resolve("path-browserify")
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          options: {
            allowTsInNodeModules: true
          }
        }
      ]
    }
  }
]
