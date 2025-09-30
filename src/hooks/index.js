// ================= HOOKS INDEX =================
// Central export file for all data fetching hooks

// Balancer hooks
export {
  useBalancerTVL,
  useBalancer24hVolume,
  useBalancerTokenData
} from './useBalancer.js';

// CoinGecko hooks
export {
  useCoinGeckoMarketData,
  useCoinGecko30dVolume,
  useTopExchanges24h,
  useAllMetricsRaw,
  useMarketCap,
  useFdv,
  useVolume24h,
  useVolume30d,
  useTvl,
  useMaxSupply,
  useTotalSupply,
  useCirculatingSupply,
  useCoinGeckoComplete
} from './useCoinGecko.js';

// Curve hooks
export {
  useCurveTVL,
  useCurve24hVolume,
  useCurveTokenData
} from './useCurve.js';

// DeFiLlama hooks
export {
  useDefiLlamaTVL,
  useTokenPrice,
  useMultipleTokenPrices,
  useProtocolInfo,
  useAllProtocols,
  useProtocolTVLHistory,
  useProtocolTVLByChain,
  useDefiLlamaComplete,
  useProtocolSearch,
  useProtocolRevenue
} from './useDefiLlama.js';

// Fraxswap hooks
export {
  useFraxswapTVL,
  useFraxswap24hVolume,
  useFraxswapPairsForToken,
  useFraxswapTVLOptimized,
  useFraxswapVolumeOptimized,
  useFraxswapTokenData,
  useFraxswapTokenDataOptimized,
  useFraxswapMultiTimeframeVolume,
  useFraxswapDetailedPairs
} from './useFraxswap.js';

// SushiSwap hooks
export {
  // V3 hooks
  useSushiV3TVL,
  useSushiV3Volume,
  useSushiV3TokenInfo,
  useSushiV3TokenData,
  // V2 hooks
  useSushiV2TVL,
  useSushiV2Volume24h,
  useSushiV2PairsForToken,
  useSushiV2TVLOptimized,
  useSushiV2TokenData,
  useSushiV2TokenDataOptimized,
  useSushiV2DetailedPairs,
  // Combined hooks
  useSushiTotalTVL,
  useSushiTotalVolume24h,
  useSushiTokenData,
  useSushiComplete
} from './useSushiSwap.js';

// Uniswap hooks
export {
  // V3 hooks
  useUniswapV3TVL,
  useUniswapV3Volume24h,
  useUniswapV3TokenInfo,
  useUniswapV3PoolsForToken,
  useUniswapV3TokenData,
  useUniswapV3DetailedPools,
  // V2 hooks
  useUniswapV2TVL,
  useUniswapV2Volume24h,
  useUniswapV2PairsForToken,
  useUniswapV2TVLOptimized,
  useUniswapV2TokenData,
  useUniswapV2TokenDataOptimized,
  useUniswapV2DetailedPairs,
  // Combined hooks
  useUniswapTotalTVL,
  useUniswapTotalVolume24h,
  useUniswapTokenData,
  useUniswapComplete
} from './useUniswap.js';

// Ethereum on-chain hooks
export {
  useTokenBalance,
  useTokenBalanceFormatted,
  useTokenBalanceWithUSD,
  useTokenDecimals,
  useTokenName,
  useTokenSymbol,
  useTokenTotalSupply, // Renamed to avoid conflict with CoinGecko's useTotalSupply
  useAllowance,
  useTokenInfo,
  useCurrentBlock,
  useGasPrice,
  useMultipleTokenBalances,
  useMultipleTokenBalancesWithUSD,
  usePortfolioValue,
  useEthereumUtils
} from './useEthereum.js';

