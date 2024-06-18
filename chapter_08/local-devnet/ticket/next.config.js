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
    async rewrites() {
      return [
        {
          source: '/api/v0/addresses/:address/transactions',
          destination: '/api/v0/transactions/:address', // blockfrost bridge
        },
        // Not redirecting, using /api/v0/accounts/ // blockfrost bridge
        //{
        //  source: '/api/v0/accounts/:reward_addr',
        //  destination: 'http://localhost:8080/api/v1/accounts/:reward_addr',  // yaci store
        //},
        //{
        //  source: '/api/v0/accounts/:reward_addr/addresses',
        //  destination: 'http://localhost:1442/matches/:reward_addr', // kupo
        //},
        {
          source: '/api/v0/accounts/:reward_addr/addresses',
          destination: '/api/v0/accounts/:reward_addr', // blockfrost bridge
        },
        {
          source: '/api/v0/addresses/:address',
          destination: '/api/v0/address/:address',     // blockfrost bridge
        },
        {
          source: '/api/v0/addresses/:address/extended',
          destination: '/api/v0/extended/:address',     // blockfrost bridge
        },
        //{
        //  source: '/api/v0/addresses/:address/utxos',
        //  destination: 'http://localhost:8080/api/v1/addresses/:address/utxos', // yaci store
        //},
        {
          source: '/api/v0/addresses/:address/utxos',
          destination: '/api/v0/utxos/:address', // yaci store
        },
        {
          source: '/api/v0/blocks/:block_hash_or_num',
          destination: 'http://localhost:8080/api/v1/blocks/:block_hash_or_num',  // yaci store
        },
        {
          source: '/api/v0/txs/:tx_hash',
          destination: 'http://localhost:8080/api/v1/txs/:tx_hash',  // yaci store
        },
        {
          source: '/api/v0/txs/:tx_hash/utxos',
          destination: 'http://localhost:8080/api/v1/txs/:tx_hash/utxos',  // yaci store
        },
        {
          source: '/api/v0/txs/:tx_hash/metadata',
          destination: 'http://localhost:8080/api/v1/txs/:tx_hash/metadata',  // yaci store
        },
        // Helios protocol parameters use special file
        //{
        //  source: '/api/v0/protocol-parameters',
        //  destination: '/api/v0/protocol-params',  // helios params format
        //},
        {
          source: '/api/v0/epochs/latest/parameters',
          destination: 'http://localhost:8080/api/v1/epochs/latest/parameters',  // yaci devkit
        },
        {
          source: '/api/v0/blocks/latest',
          destination: 'http://localhost:8080/api/v1/blocks/latest',  // yaci devkit
        },
        {
          source: '/api/v0/tx/submit',
          destination: 'http://localhost:8080/api/v1/tx/submit',  // yaci devkit
        },
        //{
        //  source: '/api/v0/assets/:asset',
        //  destination: '/api/v0/assets/:asset',  // 
        //},
      ]
    },
  };
  module.exports = nextConfig;