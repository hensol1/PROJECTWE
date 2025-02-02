const { whenProd } = require('@craco/craco');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Optimize splitting specifically for mobile
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        minSize: 10000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `vendor.${packageName.replace('@', '')}`;
            },
            priority: -10,
            reuseExistingChunk: true,
          },
          common: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          }
        }
      };

      // Add module concatenation for better mobile performance
      webpackConfig.optimization.concatenateModules = true;

      // Enable module ids hash for better mobile caching
      webpackConfig.optimization.moduleIds = 'deterministic';

      return webpackConfig;
    },
    plugins: [
      ...whenProd(() => [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          algorithm: 'gzip',
          threshold: 10240,
        })
      ], [])
    ]
  }
};