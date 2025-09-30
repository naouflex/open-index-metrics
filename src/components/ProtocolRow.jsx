import {
  Tr,
  Td,
  Text,
  Badge,
  Skeleton,
  HStack,
  VStack,
  Tooltip,
  useColorModeValue,
  Alert,
  AlertTitle,
  AlertIcon,
  Link
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

import { calculateYearsOnChain, formatNumber, formatPercentage, formatSupply } from '../config/protocols.js';
import {
  useCoinGeckoComplete,
  useDefiLlamaTVL,
  useCurveTVL,
  useCurve24hVolume,
  useUniswapTotalTVL,
  useUniswapTotalVolume24h,
  useBalancerTVL,
  useBalancer24hVolume,
  useSushiTotalTVL,
  useSushiTotalVolume24h,
  useFraxswapTVL,
  useFraxswap24hVolume,
  useTokenBalanceWithUSD
} from '../hooks/index.js';
import { getColorForMetric } from '../utils/colorHelpers.js';
import SpecialTreatmentBadge from './SpecialTreatmentBadge.jsx';

// ================= PROTOCOL ROW COMPONENT =================

export default function ProtocolRow({ protocol, shouldLoad = false }) {
  // Only load data if shouldLoad is true (staggered loading)
  const coinGeckoData = useCoinGeckoComplete(protocol.coingeckoId, { enabled: shouldLoad });
  const defiLlamaTVL = useDefiLlamaTVL(protocol.defiLlamaSlug, { enabled: shouldLoad });
  
  // DEX TVL hooks - also conditionally enabled
  const curveTVL = useCurveTVL(protocol.govContractAddress, { enabled: shouldLoad });
  const curveVolume = useCurve24hVolume(protocol.govContractAddress, { enabled: shouldLoad });
  const uniswapTVL = useUniswapTotalTVL(protocol.govContractAddress, { enabled: shouldLoad });
  const uniswapVolume = useUniswapTotalVolume24h(protocol.govContractAddress, { enabled: shouldLoad });
  // For FRAX protocol, use Fraxswap data instead of Balancer data
  const balancerTVL = useBalancerTVL(
    protocol.ticker !== 'FRAX' ? protocol.govContractAddress : null, 
    { enabled: shouldLoad && protocol.ticker !== 'FRAX' }
  );
  const balancerVolume = useBalancer24hVolume(
    protocol.ticker !== 'FRAX' ? protocol.govContractAddress : null, 
    { enabled: shouldLoad && protocol.ticker !== 'FRAX' }
  );
  
  // FRAX-specific Fraxswap data (to replace Balancer)
  const fraxswapTVLForFrax = useFraxswapTVL(
    protocol.ticker === 'FRAX' ? protocol.govContractAddress : null,
    { enabled: shouldLoad && protocol.ticker === 'FRAX' }
  );
  const fraxswapVolumeForFrax = useFraxswap24hVolume(
    protocol.ticker === 'FRAX' ? protocol.govContractAddress : null,
    { enabled: shouldLoad && protocol.ticker === 'FRAX' }
  );
  const sushiTVL = useSushiTotalTVL(protocol.govContractAddress, { enabled: shouldLoad });
  const sushiVolume = useSushiTotalVolume24h(protocol.govContractAddress, { enabled: shouldLoad });
  
  // Fraxswap for FRAX protocol
  const fraxswapTVL = useFraxswapTVL(protocol.govContractAddress, { enabled: shouldLoad && protocol.ticker === 'FRAX' });
  const fraxswapVolume = useFraxswap24hVolume(protocol.govContractAddress, { enabled: shouldLoad && protocol.ticker === 'FRAX' });
  
  // FXN protocol specific - get token balance from specific holder address for max supply fix
  const fxnHolderBalance = useTokenBalanceWithUSD(
    protocol.ticker === 'FXN' ? protocol.govContractAddress : null,
    protocol.ticker === 'FXN' ? '0xec6b8a3f3605b083f7044c0f31f2cac0caf1d469' : null,
    { enabled: shouldLoad && protocol.ticker === 'FXN' }
  );
  
  // INV protocol specific - get token balances for Uniswap TVL fix
  const invToken1Balance = useTokenBalanceWithUSD(
    protocol.ticker === 'INV' ? '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68' : null,
    protocol.ticker === 'INV' ? '0xbd1f921786e12a80f2184e4d6a5cacb25dc673c9' : null,
    { enabled: shouldLoad && protocol.ticker === 'INV' }
  );
  
  const invToken2Balance = useTokenBalanceWithUSD(
    protocol.ticker === 'INV' ? '0x865377367054516e17014ccded1e7d814edc9ce4' : null,
    protocol.ticker === 'INV' ? '0xbd1f921786e12a80f2184e4d6a5cacb25dc673c9' : null,
    { enabled: shouldLoad && protocol.ticker === 'INV' }
  );
  
  // ALCX protocol specific - get dead address balance to subtract from total supply
  const alcxDeadBalance = useTokenBalanceWithUSD(
    protocol.ticker === 'ALCX' ? '0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF' : null,
    protocol.ticker === 'ALCX' ? '0x000000000000000000000000000000000000dead' : null,
    { enabled: shouldLoad && protocol.ticker === 'ALCX' }
  );
  
  // If not loading yet, show skeleton
  if (!shouldLoad) {
    return (
      <Tr _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }} transition="background-color 0.2s">
                <Td
          textAlign="center"
          position="sticky"
          left={0}
          bg={useColorModeValue('white', 'gray.800')}
          zIndex={2}
          borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          minW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
          maxW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
          w={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
        >
          <Text textAlign="center" fontWeight="bold">
            {protocol.ticker}
          </Text>
        </Td>
        <Td>
          <Skeleton height="20px" width="90px" />
        </Td>
        <Td colSpan={29}>
          <Skeleton height="20px" />
        </Td>
      </Tr>
    );
  }
  
  // Calculate derived metrics
  const isLoading = coinGeckoData.isLoading || defiLlamaTVL.isLoading || 
    (protocol.ticker === 'FXN' && fxnHolderBalance.isLoading) ||
    (protocol.ticker === 'INV' && (invToken1Balance.isLoading || invToken2Balance.isLoading)) ||
    (protocol.ticker === 'ALCX' && alcxDeadBalance.isLoading) ||
    (protocol.ticker === 'FRAX' && (fraxswapTVLForFrax.isLoading || fraxswapVolumeForFrax.isLoading));
  const hasError = coinGeckoData.hasError || defiLlamaTVL.isError ||
    (protocol.ticker === 'FXN' && fxnHolderBalance.isError) ||
    (protocol.ticker === 'INV' && (invToken1Balance.isError || invToken2Balance.isError)) ||
    (protocol.ticker === 'ALCX' && alcxDeadBalance.isError) ||
    (protocol.ticker === 'FRAX' && (fraxswapTVLForFrax.isError || fraxswapVolumeForFrax.isError));
  
  // For FXN protocol, add veFXN balance USD to market cap
  const marketCap = protocol.ticker === 'FXN' 
    ? ((coinGeckoData.marketData?.data?.market_cap || 0) + (fxnHolderBalance.data?.balanceUSD || 0))
    : (coinGeckoData.marketData?.data?.market_cap || 0);
  const fdv = coinGeckoData.marketData?.data?.fdv || 0;
      const volume24h = coinGeckoData.marketData?.data?.volume_24h || 0;
  const volume30d = coinGeckoData.volume30d?.data || 0;
  const coinGeckoTVL = coinGeckoData.marketData?.data?.tvl || 0;
  
 
  const maxSupply = coinGeckoData.marketData?.data?.max_supply || 0;
    
  // For ALCX protocol, subtract dead address balance from total supply
  const totalSupply = protocol.ticker === 'ALCX' 
    ? ((coinGeckoData.marketData?.data?.total_supply || 0) - (alcxDeadBalance.data?.balance || 0))
    : (coinGeckoData.marketData?.data?.total_supply || 0);
  const circSupply = protocol.ticker === 'FXN'
    ? ((coinGeckoData.marketData?.data?.circulating_supply || 0) + (fxnHolderBalance.data?.balance || 0))
    : (coinGeckoData.marketData?.data?.circulating_supply || 0);
  const protocolTVL = defiLlamaTVL.data || 0;
  
  // DEX aggregation
  const dexTVLs = [
    curveTVL.data || 0,
    // For INV protocol, add missing pool balances to Uniswap TVL
    protocol.ticker === 'INV' 
      ? ((uniswapTVL.data || 0) + (invToken1Balance.data?.balanceUSD || 0) + (invToken2Balance.data?.balanceUSD || 0))
      : (uniswapTVL.data || 0),
    // For FRAX protocol, use Fraxswap data instead of Balancer data
    protocol.ticker === 'FRAX' 
      ? (fraxswapTVLForFrax.data || 0)
      : (balancerTVL.data || 0),
    sushiTVL.data || 0,
    // Separate Fraxswap column (disabled for FRAX to avoid double counting)
    0 // Removed to avoid double counting Fraxswap data for FRAX protocol
  ];
  
  const dexVolumes = [
    curveVolume.data || 0,
    uniswapVolume.data || 0,
    // For FRAX protocol, use Fraxswap data instead of Balancer data
    protocol.ticker === 'FRAX' 
      ? (fraxswapVolumeForFrax.data || 0)
      : (balancerVolume.data || 0),
    sushiVolume.data || 0,
    // Separate Fraxswap column (disabled for FRAX to avoid double counting)
    0 // Removed to avoid double counting Fraxswap data for FRAX protocol
  ];
  
  const totalDexTVL = dexTVLs.reduce((sum, tvl) => sum + tvl, 0);
  const totalDexVolume = dexVolumes.reduce((sum, vol) => sum + vol, 0);
  const liquidityTurnover = totalDexTVL > 0 ? totalDexVolume / totalDexTVL : 0;
  
  // Ratios
  const mcToFdv = fdv > 0 ? marketCap / fdv : 0;
  const mcToTvl = coinGeckoTVL > 0 ? marketCap / coinGeckoTVL : 0;
  const fdvToTvl = coinGeckoTVL > 0 ? fdv / coinGeckoTVL : 0;
  const circToTotal = totalSupply > 0 ? circSupply / totalSupply : 0;
  const nextReleasePercentage = circSupply > 0 ? protocol.nextEmissions / circSupply : 0;
  
  const yearsOnChain = calculateYearsOnChain(protocol.mainnetLaunch);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBgColor = useColorModeValue('blue.50', 'blue.900');
  const colorMode = useColorModeValue('light', 'dark');
  
  if (hasError) {
    return (
      <Tr _hover={{ bg: hoverBgColor }} transition="background-color 0.2s">
                <Td
          textAlign="center"
          position="sticky"
          left={0}
          bg={bgColor}
          zIndex={2}
          borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          minW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
          maxW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
          w={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
        >
          <Text textAlign="center" fontWeight="bold">
            {protocol.ticker}
          </Text>
        </Td>
        <Td>
          <Text fontSize="xs" color="gray.500">N/A</Text>
        </Td>
        <Td colSpan={29}>
          <Alert status="error" size="sm">
            <AlertIcon />
            <AlertTitle>Error loading data</AlertTitle>
          </Alert>
        </Td>
      </Tr>
    );
  }
  
  return (
    <Tr 
      bg={bgColor} 
      borderBottom="1px" 
      borderColor={borderColor}
      _hover={{ bg: hoverBgColor }}
      transition="background-color 0.2s"
      cursor="default"
    >
      {/* Basic Info */}
      <Td
        textAlign="center"
        position="sticky"
        left={0}
        bg={bgColor}
        zIndex={2}
                  borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          _hover={{ bg: hoverBgColor }}
        whiteSpace="nowrap"
        minW={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
        maxW={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
        w={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
      >
        <VStack align="center" spacing={{ base: 0, md: 2 }} justify="center" h="100%">
          <VStack align="center" spacing={0}>
            <Text 
              fontWeight="bold" 
              fontSize={{ base: "2xs", sm: "sm" }} 
              isTruncated
              textAlign="center"
            >
              {protocol.ticker}
            </Text>
            <Text 
              fontSize={{ base: "2xs", sm: "xs" }} 
              color="gray.500" 
              isTruncated
              display={{ base: "none", sm: "block" }}
              textAlign="center"
            >
              {protocol.name}
            </Text>
          </VStack>
        </VStack>
      </Td>
      
      {/* Links */}
      <Td 
        minW={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
        maxW={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
        w={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
      >
        <HStack spacing={1} wrap="wrap" justify="center" align="center">
          {protocol.govContractAddress && (
            <Tooltip label="View on Etherscan" hasArrow placement="top">
              <Link href={`https://etherscan.io/address/${protocol.govContractAddress}`} isExternal>
                <Badge 
                  colorScheme="blue" 
                  size="sm"
                  cursor="pointer" 
                  _hover={{ bg: 'blue.600', color: 'white' }}
                  p={2}
                  display="flex"
                  alignItems="center"
                  borderRadius="md"
                >
                  <ExternalLinkIcon boxSize={3} />
                </Badge>
              </Link>
            </Tooltip>
          )}
          {protocol.coingeckoId && (
            <Tooltip label="View on CoinGecko" hasArrow placement="top">
              <Link href={`https://www.coingecko.com/en/coins/${protocol.coingeckoId}`} isExternal>
                <Badge 
                  colorScheme="green" 
                  size="sm"
                  cursor="pointer" 
                  _hover={{ bg: 'green.600', color: 'white' }}
                  p={2}
                  display="flex"
                  alignItems="center"
                  borderRadius="md"
                >
                  <ExternalLinkIcon boxSize={3} />
                </Badge>
              </Link>
            </Tooltip>
          )}
          {protocol.defiLlamaSlug && (
            <Tooltip label="View on DeFiLlama" hasArrow placement="top">
              <Link href={`https://defillama.com/protocol/${protocol.defiLlamaSlug}`} isExternal>
                <Badge 
                  colorScheme="purple" 
                  size="sm"
                  cursor="pointer" 
                  _hover={{ bg: 'purple.600', color: 'white' }}
                  p={2}
                  display="flex"
                  alignItems="center"
                  borderRadius="md"
                >
                  <ExternalLinkIcon boxSize={3} />
                </Badge>
              </Link>
            </Tooltip>
          )}
        </HStack>
      </Td>
      
      {/* Blockchain */}
      <Td
        textAlign="center"
        minW={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
        maxW={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
        w={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
      >
        <Badge colorScheme="blue" size="sm">
          {protocol.blockchain?.toUpperCase()}
        </Badge>
      </Td>
      
      {/* V1 Protocol Mainnet Launch */}
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Text fontSize="xs">{protocol.mainnetLaunch}</Text>
      </Td>
      
      {/* Years Onchain */}
      <Td
        textAlign="center"
        minW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
        maxW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
        w={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
      >
        <Text fontSize="sm">{yearsOnChain}y</Text>
      </Td>
      
      {/* $OPEN Status */}
      <Td
        textAlign="center"
        minW={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
        maxW={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
        w={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
      >
        <Badge colorScheme={protocol.openStatus === 'current' ? 'green' : 'orange'} size="sm">
          {protocol.openStatus}
        </Badge>
      </Td>
      
      {/* Market Metrics */}
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm">{formatNumber(marketCap)}</Text>
            {protocol.ticker === 'FXN' && (
              <SpecialTreatmentBadge 
                explanation="Market cap includes veFXN contract balance (not included in CoinGecko)" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(fdv)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
        maxW={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
        w={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(coinGeckoData.marketData.data?.volume_24h || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
        maxW={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
        w={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(volume30d)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
        maxW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
        w={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm" color={coinGeckoTVL > 0 ? "blue.500" : "gray.400"} fontWeight={coinGeckoTVL > 0 ? "semibold" : "normal"}>
            {coinGeckoTVL > 0 ? formatNumber(coinGeckoTVL) : "N/A"}
          </Text>
        </Skeleton>
      </Td>
      
      {/* Ratios */}
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(mcToFdv * 100, 'mcToFdv', colorMode)}
          fontWeight="semibold"
        >
          {formatPercentage(mcToFdv)}
        </Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(mcToTvl * 100, 'mcToTvl', colorMode)}
          fontWeight="semibold"
        >
          {formatPercentage(mcToTvl)}
        </Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
        maxW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
        w={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(fdvToTvl * 100, 'fdvToTvl', colorMode)}
          fontWeight="semibold"
        >
          {formatPercentage(fdvToTvl)}
        </Text>
      </Td>
      
      {/* Supply Metrics */}
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatSupply(maxSupply)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm">{formatSupply(totalSupply)}</Text>
            {protocol.ticker === 'ALCX' && (
              <SpecialTreatmentBadge 
                explanation="Total supply subtracts burned tokens from dead address" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm">{formatSupply(circSupply)}</Text>
            {protocol.ticker === 'FXN' && (
              <SpecialTreatmentBadge 
                explanation="Circulating supply includes veFXN contract balance (tokens)" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
        maxW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
        w={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(circToTotal * 100, 'circToTotal', colorMode)}
          fontWeight="semibold"
        >
          {formatPercentage(circToTotal)}
        </Text>
      </Td>
      
      {/* Top 3 Exchanges */}
        <Td 
          minW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          maxW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          w={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          overflow="hidden"
        >
          <Skeleton isLoaded={!coinGeckoData.topExchanges?.isLoading}>
            <Text 
              fontSize="xs" 
              color="gray.600"
              whiteSpace="normal"
              wordBreak="break-word"
              overflowWrap="anywhere"
            >
              {(() => {
                const exchanges = coinGeckoData.topExchanges?.data?.exchanges;
                
                if (!exchanges || !Array.isArray(exchanges) || exchanges.length === 0) {
                  return 'N/A';
                }
                
                return exchanges
                  .slice(0, 3)
                  .filter(ex => ex && ex.name && ex.name !== 'Unknown' && ex.name !== 'undefined')
                  .map(ex => {
                    const name = ex.name || 'Unknown';
                    const volume = ex.volume_display || ex.volume_usd || '0';
                    return `${name} (${volume})`;
                  })
                  .join(', ');
              })()}
            </Text>
          </Skeleton>
        </Td>
      
      {/* DEX Data */}
      <Td
        textAlign="center"
        minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
        maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
        w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
      >
        <Skeleton isLoaded={!curveTVL.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
      >
        <Skeleton isLoaded={!curveVolume.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
      >
        <Skeleton isLoaded={!uniswapTVL.isLoading && (protocol.ticker !== 'INV' || (!invToken1Balance.isLoading && !invToken2Balance.isLoading))}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm" color="orange.600">{
              formatNumber(
                protocol.ticker === 'INV' 
                  ? ((uniswapTVL.data || 0) + (invToken1Balance.data?.balanceUSD || 0) + (invToken2Balance.data?.balanceUSD || 0))
                  : (uniswapTVL.data || 0)
              )
            }</Text>
            {protocol.ticker === 'INV' && (
              <SpecialTreatmentBadge 
                explanation="TVL includes pools not indexed by Uniswap subgraph" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Skeleton isLoaded={!uniswapVolume.isLoading}>
          <Text fontSize="sm" color="orange.600">{formatNumber(uniswapVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
        w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
      >
        <Skeleton isLoaded={protocol.ticker === 'FRAX' ? !fraxswapTVLForFrax.isLoading : !balancerTVL.isLoading}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm" color="green.600">{
              formatNumber(
                protocol.ticker === 'FRAX' 
                  ? (fraxswapTVLForFrax.data || 0)
                  : (balancerTVL.data || 0)
              )
            }</Text>
            {protocol.ticker === 'FRAX' && (
              <SpecialTreatmentBadge 
                explanation="Uses Fraxswap data instead of Balancer data for FRAX protocol" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Skeleton isLoaded={protocol.ticker === 'FRAX' ? !fraxswapVolumeForFrax.isLoading : !balancerVolume.isLoading}>
          <HStack spacing={1} justify="center">
            <Text fontSize="sm" color="green.600">{
              formatNumber(
                protocol.ticker === 'FRAX' 
                  ? (fraxswapVolumeForFrax.data || 0)
                  : (balancerVolume.data || 0)
              )
            }</Text>
            {protocol.ticker === 'FRAX' && (
              <SpecialTreatmentBadge 
                explanation="Uses Fraxswap data instead of Balancer data for FRAX protocol" 
                protocolTicker={protocol.ticker}
              />
            )}
          </HStack>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
        maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
        w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
      >
        <Skeleton isLoaded={!sushiTVL.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
        maxW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
        w={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
      >
        <Skeleton isLoaded={!sushiVolume.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
        w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
      >
        <Text fontSize="sm" fontWeight="bold" color="blue.600">{formatNumber(totalDexTVL)}</Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
      >
        <Text fontSize="sm" fontWeight="semibold" color="blue.600">{formatNumber(totalDexVolume)}</Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
        w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(liquidityTurnover, 'liquidityTurnover', colorMode)}
          fontWeight="semibold"
        >
          {liquidityTurnover.toFixed(2)}x
        </Text>
      </Td>
      
      {/* Emissions */}
      <Td 
        textAlign="center"
        minW={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
        maxW={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
        w={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
      >
        <Text fontSize="sm">{formatSupply(protocol.nextEmissions)}</Text>
      </Td>
      
      <Td 
        textAlign="center"
        minW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
        maxW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
        w={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
      >
        <Text 
          fontSize="sm" 
          color={getColorForMetric(nextReleasePercentage * 100, 'nextReleasePercentage', colorMode)}
          fontWeight="semibold"
        >
          {formatPercentage(nextReleasePercentage)}
        </Text>
      </Td>
      
      {/* Emissions Catalyst */}
      <Td 
          minW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          maxW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          w={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
          overflow="hidden"
      >
        <Text 
          fontSize="xs" 
          color="gray.600"
          whiteSpace="normal"
          wordBreak="break-word"
          overflowWrap="anywhere"
        >
          {protocol.emissionsCatalyst || 'N/A'}
        </Text>
      </Td>
      
      {/* Protocol TVL */}
      <Td
        textAlign="center"
        minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
        w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
      >
        <Skeleton isLoaded={!defiLlamaTVL.isLoading}>
          <Text fontSize="sm" fontWeight="semibold">{formatNumber(protocolTVL)}</Text>
        </Skeleton>
      </Td>
    </Tr>
  );
} 