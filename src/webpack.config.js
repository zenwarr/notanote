const path = require("path");
const cssExtract = require("mini-css-extract-plugin");


module.exports = (env) => [
  {
    entry: "./client/index.tsx",
    output: {
      filename: "index.js",
      path: path.join(__dirname, "static"),
      publicPath: "/static",
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
      })
    ]
  },
  {
    entry: "./client/sw.ts",
    output: {
      filename: "sw.js",
      path: path.join(__dirname, "static"),
      publicPath: "/static",
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
