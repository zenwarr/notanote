const path = require("path");
const cssExtract = require("mini-css-extract-plugin");
const webpack = require("webpack");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');


module.exports = (env) => [
  {
    entry: "./client/index.tsx",
    output: {
      filename: "index.js",
      path: path.join(__dirname, "static"),
      publicPath: "/",
      chunkFilename: "[name]-[contenthash].js"
    },
    cache: {
      type: "filesystem"
    },
    target: "web",
    mode: env.prod === "true" ? "production" : "development",
    devtool: env.prod === "true" ? undefined : "inline-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        path: require.resolve("path-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert"),
        crypto: require.resolve("crypto-browserify")
      },
      plugins: [
        new TsconfigPathsPlugin({ configFile: "./client/tsconfig.json" })
      ]
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

    externals: {
      "fs": "fs"
    },

    plugins: [
      new cssExtract({
        filename: `index.css`,
        chunkFilename: "[id]-[contenthash].css"
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      }),
      new MonacoWebpackPlugin({
        publicPath: "/"
      })
    ]
  },
  {
    entry: "./client/sw.ts",
    output: {
      filename: "sw.js",
      path: path.join(__dirname, "static"),
      publicPath: "/",
      chunkFilename: "[name]-[contenthash].js"
    },
    target: "web",
    mode: env.prod === "true" ? "production" : "development",
    devtool: env.prod === "true" ? undefined : "inline-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        path: require.resolve("path-browserify")
      },
      plugins: [
        new TsconfigPathsPlugin({ configFile: "./client/tsconfig.json" })
      ]
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
  },
  {
    entry: "./client/background-worker.ts",
    output: {
      filename: "background-worker.js",
      path: path.join(__dirname, "static"),
      publicPath: "/",
      chunkFilename: "[name]-[contenthash].js"
    },
    target: "web",
    mode: env.prod === "true" ? "production" : "development",
    devtool: env.prod === "true" ? undefined : "inline-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      fallback: {
        path: require.resolve("path-browserify")
      },
      plugins: [
        new TsconfigPathsPlugin({ configFile: "./client/tsconfig.json" })
      ]
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
