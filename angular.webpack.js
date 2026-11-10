// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const webpack = require('webpack');

/**
 * Custom angular webpack configuration
 */
module.exports = (config, options) => {
  config.plugins = [
    ...config.plugins,
    new webpack.IgnorePlugin({
      resourceRegExp: /config\/private\/Config/,
    })
  ];

  return config;
}
