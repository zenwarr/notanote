const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  "stories": [
    "../client/stories/**/*.stories.mdx",
    "../client/stories/**/*.stories.@(js|jsx|ts|tsx)"
  ],

  webpackFinal: (config) => {
    config.plugins.push(new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }));
    config.plugins.push(new MonacoWebpackPlugin());
    config.resolve.fallback = {
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert"),
      crypto: require.resolve("crypto-browserify")
    };
    return config;
  },

  core: {
    builder: "webpack5"
  }
}
