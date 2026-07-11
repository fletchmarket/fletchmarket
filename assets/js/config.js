/* ============================================================
   FLETCHMARKET — global configuration
   Robinhood Chain (mainnet) - official parameters from
   https://docs.robinhood.com/chain
   ============================================================ */
const CHAIN_ID = 4663;
const CHAIN_ID_HEX = '0x1237';
const RPC  = 'https://rpc.mainnet.chain.robinhood.com';
const SCAN = 'https://robinhoodchain.blockscout.com';
const COINGECKO = 'https://api.coingecko.com/api/v3';
const MARKET_REFRESH_MS = 45000;       // CoinGecko poll interval
const CHAIN_TOKENS_REFRESH_MS = 90000; // Blockscout token-list poll (kept gentle to avoid rate-limits)
