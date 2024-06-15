/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: function (config, options) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };
    config.module.rules.push({
      test: /\.(hl|helios)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: "@hyperionbt/helios-loader",
          options: {
            emitTypes: true // must be true when importing Helios scripts in Typescript
          }
        }
      ]
    });
    return config;
  },
};
module.exports = nextConfig;