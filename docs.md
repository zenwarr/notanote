## Shares

You can give everyone access to a read-only rendered versions of your files. Shares are defined in `.notes/shares.json`
file in the following form:

```json
{
  "public": [
    {
      "file": "README.md",
      "url": "/public/README.md"
    }
  ]
}
```

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
