Nuclear notes is a minimalistic note taking application for power users.
It can be used as a Web application, desktop app on Windows and Linux and as a mobile app on Android.
It is similar to Obsidian.md, but is open-source, self-hosted (in case you want to use a web version — a server is not required) and has sync.



## Plugin webpack config

```js
module.exports = {
  entry: "./src.jsx",
  output: {
    filename: "index.js",
    path: __dirname,
    library: {
      type: "commonjs-module"
    }
  },
  target: "web",
  mode: "development",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /nodeModules/,
        loader: "babel-loader",
        options: {
          presets: [
            "@babel/preset-env",
            "@babel/preset-react"
          ]
        }
      }
    ]
  },

  externalsType: "promise",
  externals: {
    "react": "nuclear.modules['react']",
    "mobx": "nuclear.modules['mobx']",
    "mobx-react-lite": "nuclear.modules['mobx-react-lite']",
    "date-fns": "nuclear.modules['date-fns']",
    "@mui/material": "nuclear.modules['@mui/material']",
    "csv": "nuclear.modules['csv']",
    "nuclear": "nuclear.modules['nuclear']",
    "@mui/x-date-pickers": "nuclear.modules['@mui/x-date-pickers']",
    "react-data-grid": "nuclear.modules['react-data-grid']",
  },
}
```
