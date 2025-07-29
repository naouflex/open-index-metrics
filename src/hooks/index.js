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
  useCurvePools,
  useCurveVolumes,
  useCurveTVL,
  useCurve24hVolume,
  useCurveTVLOptimized,
  useCurve24hVolumeOptimized,
  useCurveTokenData,
  useCurveTokenDataOptimized,
  useCurvePoolsForToken
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
  useProtocolSearch
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