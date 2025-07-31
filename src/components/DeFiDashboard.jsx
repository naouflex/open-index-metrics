import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Skeleton,
  Container,
  HStack,
  VStack,
  Tooltip,
  useColorModeValue,
  Alert,
  AlertTitle,
  AlertDescription,
  Icon,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  Flex
} from '@chakra-ui/react';

import { AlertIcon, TriangleUpIcon, TriangleDownIcon, ExternalLinkIcon, InfoIcon, DownloadIcon } from '@chakra-ui/icons';
import { useState, useEffect, useMemo } from 'react';

import { protocols, calculateYearsOnChain, formatNumber, formatPercentage, formatSupply } from '../config/protocols.js';
import {
  useCoinGeckoMarketData,
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

// ================= COLOR SCALE HELPER =================

function getColorForMetric(value, metricType, colorMode = 'light') {
  if (value === 0 || value === null || value === undefined) {
    return 'gray.400';
  }

  // Define thresholds and color logic for each metric type
  const getColorScale = (value, thresholds, reversed = false) => {
    const { low, medium, high } = thresholds;
    let intensity;
    
    if (value <= low) {
      intensity = reversed ? 'green' : 'red';
    } else if (value <= medium) {
      intensity = 'yellow';
    } else if (value <= high) {
      intensity = reversed ? 'orange' : 'green';
    } else {
      intensity = reversed ? 'red' : 'green';
    }
    
    const colorMap = {
      green: colorMode === 'light' ? 'green.600' : 'green.400',
      yellow: colorMode === 'light' ? 'yellow.600' : 'yellow.400', 
      orange: colorMode === 'light' ? 'orange.600' : 'orange.400',
      red: colorMode === 'light' ? 'red.600' : 'red.400'
    };
    
    return colorMap[intensity];
  };

  switch (metricType) {
    case 'mcToFdv': // Higher is better (closer to 100%)
      return getColorScale(value, { low: 50, medium: 75, high: 90 }, false);
    
    case 'mcToTvl': // Lower is better (more efficient)
      return getColorScale(value, { low: 50, medium: 100, high: 200 }, true);
    
    case 'fdvToTvl': // Lower is better (more efficient) 
      return getColorScale(value, { low: 100, medium: 200, high: 500 }, true);
    
    case 'circToTotal': // Higher is better (more circulating)
      return getColorScale(value, { low: 30, medium: 60, high: 85 }, false);
    
    case 'liquidityTurnover': // Higher is better (more active)
      return getColorScale(value, { low: 0.5, medium: 1.5, high: 3 }, false);
    
    case 'nextReleasePercentage': // Lower is better (less dilution)
      return getColorScale(value, { low: 5, medium: 15, high: 30 }, true);
    
    default:
      return 'gray.600';
  }
}

// ================= PROTOCOL ROW COMPONENT =================

function ProtocolRow({ protocol, shouldLoad = false }) {
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
  const circSupply = coinGeckoData.marketData?.data?.circulating_supply || 0;
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
        minW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
        maxW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
        w={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
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
        minW={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
        maxW={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
        w={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
      >
        <HStack spacing={2} wrap="wrap" justify="center" align="center">
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
        minW={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
        maxW={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
        w={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
      >
        <Badge colorScheme="blue" size="sm">
          {protocol.blockchain?.toUpperCase()}
        </Badge>
      </Td>
      
      {/* V1 Protocol Mainnet Launch */}
      <Td
        textAlign="center"
        minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
      >
        <Text fontSize="xs">{protocol.mainnetLaunch}</Text>
      </Td>
      
      {/* Years Onchain */}
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
        maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
        w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
      >
        <Text fontSize="sm">{yearsOnChain}y</Text>
      </Td>
      
      {/* $OPEN Status */}
      <Td
        textAlign="center"
        minW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
        maxW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
        w={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
      >
        <Badge colorScheme={protocol.openStatus === 'current' ? 'green' : 'orange'} size="sm">
          {protocol.openStatus}
        </Badge>
      </Td>
      
      {/* Market Metrics */}
      <Td
        textAlign="center"
        minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
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
        minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(fdv)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(coinGeckoData.marketData.data?.volume_24h || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(volume30d)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
        maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
        w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
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
        minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
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
        minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
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
        minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
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
        minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatSupply(maxSupply)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
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
        minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
      >
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatSupply(circSupply)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
        w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
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
          minW={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
          maxW={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
          w={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
          overflow="hidden"
        >
          <Skeleton isLoaded={!coinGeckoData.topExchanges?.isLoading}>
            <Text 
              fontSize="xs" 
              color="gray.600"
              isTruncated
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
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
                  .join(', ') || 'N/A';
              })()}
            </Text>
          </Skeleton>
        </Td>
      
      {/* DEX Data */}
      <Td
        textAlign="center"
        minW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
        maxW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
        w={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
      >
        <Skeleton isLoaded={!curveTVL.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
      >
        <Skeleton isLoaded={!curveVolume.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
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
        minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
      >
        <Skeleton isLoaded={!uniswapVolume.isLoading}>
          <Text fontSize="sm" color="orange.600">{formatNumber(uniswapVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
        w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
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
        minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
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
        minW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
        maxW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
        w={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
      >
        <Skeleton isLoaded={!sushiTVL.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
        maxW={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
        w={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
      >
        <Skeleton isLoaded={!sushiVolume.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
        w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
      >
        <Text fontSize="sm" fontWeight="bold" color="blue.600">{formatNumber(totalDexTVL)}</Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
      >
        <Text fontSize="sm" fontWeight="semibold" color="blue.600">{formatNumber(totalDexVolume)}</Text>
      </Td>
      
      <Td
        textAlign="center"
        minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
        w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
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
        W={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
        maxW={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
        w={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
      >
        <Text fontSize="sm">{formatSupply(protocol.nextEmissions)}</Text>
      </Td>
      
      <Td 
        textAlign="center"
        minW={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
        maxW={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
        w={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
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
          minW={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
          maxW={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
          w={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
          overflow="hidden"
      >
        <Text 
          fontSize="xs" 
          color="gray.600"
          isTruncated
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {protocol.emissionsCatalyst || 'N/A'}
        </Text>
      </Td>
      
      {/* Protocol TVL */}
      <Td
        textAlign="center"
        minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
        w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
      >
        <Skeleton isLoaded={!defiLlamaTVL.isLoading}>
          <Text fontSize="sm" fontWeight="semibold">{formatNumber(protocolTVL)}</Text>
        </Skeleton>
      </Td>
    </Tr>
  );
}


// ================= DATA SOURCE BADGE COMPONENT =================

function DataSourceBadge({ source }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  if (!source) return null;
  
  const getColorScheme = (source) => {
    if (source.toLowerCase().includes('coingecko')) return 'green';
    if (source.toLowerCase().includes('defillama')) return 'purple';
    if (source.toLowerCase().includes('subgraph')) return 'orange';
    if (source.toLowerCase().includes('api')) return 'blue';
    if (source.toLowerCase().includes('calc')) return 'gray';
    if (source.toLowerCase().includes('verify')) return 'red';
    return 'gray';
  };

  return (
    <>
      {/* Desktop: Show tooltip on hover */}
      <Tooltip label={`Data Source: ${source}`} hasArrow placement="top" display={{ base: "none", md: "block" }}>
        <Badge 
          colorScheme={getColorScheme(source)} 
          size="xs" 
          fontSize="8px"
          px={1}
          py={0.5}
          ml={1}
          cursor="help"
          display={{ base: "none", md: "flex" }}
          alignItems="center"
        >
          <InfoIcon boxSize={2} />
        </Badge>
      </Tooltip>
      
      {/* Mobile: Show clickable badge that opens modal */}
      <Badge 
        colorScheme={getColorScheme(source)} 
        size="xs" 
        fontSize="8px"
        px={1}
        py={0.5}
        ml={1}
        cursor="pointer"
        display={{ base: "flex", md: "none" }}
        alignItems="center"
        onClick={onOpen}
      >
        <InfoIcon boxSize={2} />
      </Badge>
      
      {/* Modal for mobile */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, sm: 6 }}>
          <ModalHeader fontSize="lg">Data Source</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>{source}</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ================= SPECIAL TREATMENT BADGE COMPONENT =================

function SpecialTreatmentBadge({ explanation, protocolTicker }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  if (!explanation) return null;
  
  return (
    <>
      {/* Desktop: Show tooltip on hover */}
      <Tooltip label={explanation} hasArrow placement="top" display={{ base: "none", md: "block" }}>
        <Badge 
          colorScheme="yellow" 
          size="xs" 
          fontSize="7px"
          px={1}
          py={0.5}
          ml={1}
          cursor="help"
          display={{ base: "none", md: "flex" }}
          alignItems="center"
        >
          <InfoIcon boxSize={1.5} />
        </Badge>
      </Tooltip>
      
      {/* Mobile: Show clickable badge that opens modal */}
      <Badge 
        colorScheme="yellow" 
        size="xs" 
        fontSize="7px"
        px={1}
        py={0.5}
        ml={1}
        cursor="pointer"
        display={{ base: "flex", md: "none" }}
        alignItems="center"
        onClick={onOpen}
      >
        <InfoIcon boxSize={1.5} />
      </Badge>
      
      {/* Modal for mobile */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, sm: 6 }}>
          <ModalHeader fontSize="lg">Special Calculation - {protocolTicker}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>{explanation}</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// ================= SORTABLE HEADER COMPONENT =================

function SortableHeader({ column, currentSort, onSort, onReset, dataSource, children, centerVertically = false, ...props }) {
  const isActive = currentSort.column === column;
  const isAsc = isActive && currentSort.direction === 'asc';
  const isDesc = isActive && currentSort.direction === 'desc';
  
  return (
    <Th 
      cursor="pointer" 
      userSelect="none"
      _hover={{ bg: useColorModeValue('gray.200', 'gray.600') }}
      onClick={() => onSort(column)}
      onDoubleClick={() => isActive && onReset()}
      textAlign="center"
      {...props}
    >
      <Box 
        position="relative" 
        h="90px" 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent={centerVertically ? "center" : "flex-start"} 
        pt={centerVertically ? 0 : 2}
      >
        <HStack spacing={1} mb={centerVertically ? 0 : 2}>
          <Text>{children}</Text>
          {isActive && (
            <Icon as={isAsc ? TriangleUpIcon : TriangleDownIcon} boxSize={3} />
          )}
        </HStack>
        <Box position="absolute" bottom={1}>
          <DataSourceBadge source={dataSource} />
        </Box>
      </Box>
    </Th>
  );
}

// ================= MAIN DASHBOARD COMPONENT =================

export default function DeFiDashboard() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const tableHeaderBg = useColorModeValue('gray.100', 'gray.700');
  
  const [loadedProtocols, setLoadedProtocols] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'desc' });

  // All market data hooks for sorting (only load after protocols are loaded)
  const allProtocolsLoaded = loadedProtocols.size === protocols.length;
  
  // Load market data for all protocols once they're all loaded for sorting
  const allCoinGeckoData = protocols.map(protocol => 
    useCoinGeckoComplete(protocol.coingeckoId, { enabled: allProtocolsLoaded })
  );
  const allDefiLlamaTVL = protocols.map(protocol => 
    useDefiLlamaTVL(protocol.defiLlamaSlug, { enabled: allProtocolsLoaded })
  );
  
  // Load FXN holder balance for sorting (only for FXN protocol)
  const allFxnHolderBalances = protocols.map(protocol => 
    useTokenBalanceWithUSD(
      protocol.ticker === 'FXN' ? protocol.govContractAddress : null,
      protocol.ticker === 'FXN' ? '0xec6b8a3f3605b083f7044c0f31f2cac0caf1d469' : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'FXN' }
    )
  );

  // Load INV token balances for sorting (only for INV protocol)
  const allInvToken1Balances = protocols.map(protocol => 
    useTokenBalanceWithUSD(
      protocol.ticker === 'INV' ? '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68' : null,
      protocol.ticker === 'INV' ? '0xbd1f921786e12a80f2184e4d6a5cacb25dc673c9' : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'INV' }
    )
  );

  const allInvToken2Balances = protocols.map(protocol => 
    useTokenBalanceWithUSD(
      protocol.ticker === 'INV' ? '0x865377367054516e17014ccded1e7d814edc9ce4' : null,
      protocol.ticker === 'INV' ? '0xbd1f921786e12a80f2184e4d6a5cacb25dc673c9' : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'INV' }
    )
  );

  // Load ALCX dead address balance for sorting (only for ALCX protocol)
  const allAlcxDeadBalances = protocols.map(protocol => 
    useTokenBalanceWithUSD(
      protocol.ticker === 'ALCX' ? '0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF' : null,
      protocol.ticker === 'ALCX' ? '0x000000000000000000000000000000000000dead' : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'ALCX' }
    )
  );

  // Load FRAX Fraxswap data for sorting (only for FRAX protocol) 
  const allFraxswapTVLForFrax = protocols.map(protocol => 
    useFraxswapTVL(
      protocol.ticker === 'FRAX' ? protocol.govContractAddress : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'FRAX' }
    )
  );

  const allFraxswapVolumeForFrax = protocols.map(protocol => 
    useFraxswap24hVolume(
      protocol.ticker === 'FRAX' ? protocol.govContractAddress : null,
      { enabled: allProtocolsLoaded && protocol.ticker === 'FRAX' }
    )
  );

  // Load all DEX data for CSV export
  const allCurveTVL = protocols.map(protocol => 
    useCurveTVL(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );
  const allCurveVolume = protocols.map(protocol => 
    useCurve24hVolume(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );
  const allUniswapTVL = protocols.map(protocol => 
    useUniswapTotalTVL(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );
  const allUniswapVolume = protocols.map(protocol => 
    useUniswapTotalVolume24h(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );
  const allBalancerTVL = protocols.map(protocol => 
    useBalancerTVL(
      protocol.ticker !== 'FRAX' ? protocol.govContractAddress : null, 
      { enabled: allProtocolsLoaded && protocol.ticker !== 'FRAX' }
    )
  );
  const allBalancerVolume = protocols.map(protocol => 
    useBalancer24hVolume(
      protocol.ticker !== 'FRAX' ? protocol.govContractAddress : null, 
      { enabled: allProtocolsLoaded && protocol.ticker !== 'FRAX' }
    )
  );
  const allSushiTVL = protocols.map(protocol => 
    useSushiTotalTVL(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );
  const allSushiVolume = protocols.map(protocol => 
    useSushiTotalVolume24h(protocol.govContractAddress, { enabled: allProtocolsLoaded })
  );

  useEffect(() => {
    // Load protocols one by one with short delays (Pro API can handle faster loading)
    const loadProtocolsSequentially = async () => {
      for (let i = 0; i < protocols.length; i++) {
        setLoadedProtocols(prev => new Set([...prev, i]));
        if (i < protocols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay for Pro API
        }
      }
    };

    loadProtocolsSequentially();
  }, []);

  // Create enhanced protocols data with sorting values
  const protocolsWithData = useMemo(() => {
    return protocols.map((protocol, index) => {
      const coinGeckoData = allCoinGeckoData[index];
      const defiLlamaTVL = allDefiLlamaTVL[index];
      const fxnHolderBalance = allFxnHolderBalances[index];
      const invToken1Balance = allInvToken1Balances[index];
      const invToken2Balance = allInvToken2Balances[index];
      const alcxDeadBalance = allAlcxDeadBalances[index];
      const fraxswapTVLForFrax = allFraxswapTVLForFrax[index];
      const fraxswapVolumeForFrax = allFraxswapVolumeForFrax[index];
      
      // For FXN protocol, add holder balance USD to market cap
      const marketCap = protocol.ticker === 'FXN' 
        ? ((coinGeckoData?.marketData?.data?.market_cap || 0) + (fxnHolderBalance?.data?.balanceUSD || 0))
        : (coinGeckoData?.marketData?.data?.market_cap || 0);
      const fdv = coinGeckoData?.marketData?.data?.fdv || 0;
      const volume24h = coinGeckoData?.marketData?.data?.volume_24h || 0;
      const volume30d = coinGeckoData?.volume30d?.data || 0;
      const coinGeckoTVL = coinGeckoData?.marketData?.data?.tvl || 0;
      
      // Keep max supply as tokens for all protocols
      const maxSupply = coinGeckoData?.marketData?.data?.max_supply || 0;
 
        
      // For ALCX protocol, subtract dead address balance from total supply
      const totalSupply = protocol.ticker === 'ALCX' 
        ? ((coinGeckoData?.marketData?.data?.total_supply || 0) - (alcxDeadBalance?.data?.balance || 0))
        : (coinGeckoData?.marketData?.data?.total_supply || 0);
      const circSupply = coinGeckoData?.marketData?.data?.circulating_supply || 0;
      const protocolTVL = defiLlamaTVL?.data || 0;
      
      const yearsOnChain = calculateYearsOnChain(protocol.mainnetLaunch);
      const mcToFdv = fdv > 0 ? marketCap / fdv : 0;
      const mcToTvl = coinGeckoTVL > 0 ? marketCap / coinGeckoTVL : 0;
      const fdvToTvl = coinGeckoTVL > 0 ? fdv / coinGeckoTVL : 0;
      const circToTotal = totalSupply > 0 ? circSupply / totalSupply : 0;
      const nextReleasePercentage = circSupply > 0 ? protocol.nextEmissions / circSupply : 0;
      
      return {
        ...protocol,
        originalIndex: index,
        sortValues: {
          protocol: protocol.ticker,
          status: protocol.openStatus,
          years: yearsOnChain,
          marketCap,
          fdv,
          volume24h,
          volume30d,
          tvlCG: coinGeckoTVL,
          mcToFdv,
          mcToTvl,
          fdvToTvl,
          maxSupply,
          totalSupply,
          circSupply,
          circToTotal,
          nextEmissions: protocol.nextEmissions,
          nextReleasePercentage,
          protocolTVL
        }
      };
    });
  }, [allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allAlcxDeadBalances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax]);

  // Sort protocols based on current sort configuration
  const sortedProtocols = useMemo(() => {
    if (!sortConfig.column) return protocolsWithData;
    
    return [...protocolsWithData].sort((a, b) => {
      const aValue = a.sortValues[sortConfig.column] || 0;
      const bValue = b.sortValues[sortConfig.column] || 0;
      
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortConfig.direction === 'asc' 
        ? aValue - bValue 
        : bValue - aValue;
    });
  }, [protocolsWithData, sortConfig]);

  const handleSort = (column) => {
    setSortConfig(prevConfig => ({
      column,
      direction: prevConfig.column === column && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleReset = () => {
    setSortConfig({ column: null, direction: 'desc' });
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    exportToCSV(
      sortedProtocols, 
      allCoinGeckoData, 
      allDefiLlamaTVL, 
      allFxnHolderBalances, 
      allInvToken1Balances, 
      allInvToken2Balances, 
      allAlcxDeadBalances, 
      allFraxswapTVLForFrax, 
      allFraxswapVolumeForFrax,
      allCurveTVL,
      allCurveVolume,
      allUniswapTVL,
      allUniswapVolume,
      allBalancerTVL,
      allBalancerVolume,
      allSushiTVL,
      allSushiVolume
    );
  };

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      h={{ 
        base: "calc(100vh - 145px)", // Slightly less space to push content down
        sm: "calc(100vh - 145px)",   // Slightly less space to push content down
        md: "calc(100vh - 145px)"    // Slightly less space to push content down
      }}
      w="100vw"
      maxW="100vw"
      py={{ base: 1, sm: 2, md: 3 }}
      px={{ base: 1, sm: 2, md: 3 }}
    >
      {/* Export Button */}
      <Flex 
        justify="flex-end" 
        align="center" 
        mb={2}
        px={2}
      >
        <Button
          leftIcon={<DownloadIcon />}
          colorScheme="blue"
          size="sm"
          onClick={handleExportCSV}
          isDisabled={!allProtocolsLoaded}
          _hover={{ bg: 'blue.600' }}
        >
          Export to CSV
        </Button>
      </Flex>
      <Box 
        flex="1"
        overflowX="auto" 
        overflowY="auto"
        border="1px solid" 
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="md"
        position="relative"
        w="100%"
        maxW="100%"
        css={{
          '& > table': {
            marginBottom: '0px !important'
          },
          '& table': {
            marginBottom: '0px !important'
          },
          paddingBottom: '0px'
        }}
      >
        <Table 
          size={{ base: "xs", sm: "sm" }} 
          variant="simple"
          w="100%"
          sx={{ 
            '& td:first-child, & th:first-child': { position: 'sticky !important', left: 0 },
            tableLayout: 'auto',
            width: '100%',
            minWidth: '100%',
            borderSpacing: 0,
            borderCollapse: 'collapse',
            '& tbody tr:last-child td': {
              borderBottom: 'none',
              paddingBottom: 0
            }
          }}
        >
          <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={3}>
            <Tr>
              {/* Basic Info */}
              <SortableHeader 
                column="protocol" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource=""
                fontSize={{ base: "2xs", sm: "xs" }}
                position="sticky"
                left={0}
                bg={tableHeaderBg}
                zIndex={4}
                borderRight="2px solid"
                borderRightColor={useColorModeValue('gray.300', 'gray.600')}
                boxShadow="2px 0 4px rgba(0,0,0,0.1)"
                minW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
                maxW={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
                w={{ base: "100px", sm: "130px", md: "170px", lg: "200px" }}
                textAlign="center"
                centerVertically={true}
              >
                Protocol
              </SortableHeader>
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
                maxW={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
                w={{ base: "150px", sm: "150px", md: "150px", lg: "150px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Links</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="External Links" />
                  </Box>
                </Box>
              </Th>
              <SortableHeader 
                column="blockchain" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="Required" 
                fontSize="xs"
                minW={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
                maxW={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
                w={{ base: "70px", sm: "80px", md: "90px", lg: "100px" }}
              >
                Blockchain
              </SortableHeader>
              <SortableHeader 
                column="mainnetLaunch" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="docs" 
                fontSize="xs"
                minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
              >
                V1 Protocol Mainnet
              </SortableHeader>
              <SortableHeader 
                column="years" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="calc" 
                fontSize="xs"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
              >
                Years Onchain
              </SortableHeader>
              <SortableHeader 
                column="status" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="Manual" 
                fontSize="xs"
                minW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
                maxW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
                w={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
              >
                $OPEN Status
              </SortableHeader>
              
              {/* Market Metrics */}
              <SortableHeader 
                column="marketCap" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
              >
                Market Cap
              </SortableHeader>
              <SortableHeader 
                column="fdv" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
              >
                FDV
              </SortableHeader>
              <SortableHeader 
                column="volume24h" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
              >
                Volume (24hr)
              </SortableHeader>
              <SortableHeader 
                column="volume30d" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
              >
                Volume (30d avg)
              </SortableHeader>
              <SortableHeader 
                column="tvlCG" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs" 
                color="blue.500"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
              >
                TVL
              </SortableHeader>
              
              {/* Ratios */}
              <SortableHeader 
                column="mcToFdv" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="calc" 
                fontSize="xs"
                minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
              >
                Market Cap / FDV (%)
              </SortableHeader>
              <SortableHeader 
                column="mcToTvl" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="calc" 
                fontSize="xs"
                minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
              >
                Market Cap / TVL (%)
              </SortableHeader>
              <SortableHeader 
                column="fdvToTvl" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="calc" 
                fontSize="xs"
                minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
              >
                FDV / TVL (%)
              </SortableHeader>
              
              {/* Supply */}
              <SortableHeader 
                column="maxSupply" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
              >
                Max Supply<br/>(theoretical max)
              </SortableHeader>
              <SortableHeader 
                column="totalSupply" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
              >
                Total Supply<br/>(onchain supply minus burned)
              </SortableHeader>
              <SortableHeader 
                column="circSupply" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
              >
                Circ Supply<br/>(public tokens, incl ve)
              </SortableHeader>
              <SortableHeader 
                column="circToTotal" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="calc" 
                fontSize="xs"
                minW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                maxW={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
                w={{ base: "120px", sm: "140px", md: "160px", lg: "180px" }}
              >
                Circ Supply % of Total
              </SortableHeader>
              
              {/* Exchanges */}
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
                maxW={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
                w={{ base: "300px", sm: "400px", md: "450px", lg: "500px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Top 3 Exchanges<br/>(24hr combined volume)</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="CoinGecko API" />
                  </Box>
                </Box>
              </Th>
              
              {/* DEX Data */}
              <Th 
                fontSize={{ base: "2xs", sm: "xs" }} 
                color="red.600"
                textAlign="center"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Curve TVL</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Curve API" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="red.600"
                textAlign="center"
                minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Curve 24hr Vol</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Curve API" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="orange.600"
                textAlign="center"
                minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Uniswap TVL</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Uniswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="orange.600"
                textAlign="center"
                minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Uniswap 24hr Vol</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Uniswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="green.600"
                textAlign="center"
                minW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                maxW={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
                w={{ base: "90px", sm: "100px", md: "120px", lg: "140px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Balancer TVL</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Balancer & Fraxswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="green.600"
                textAlign="center"
                minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Balancer 24hr Vol</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Balancer & Fraxswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="purple.600"
                textAlign="center"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "120px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Sushi TVL</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Sushiswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="purple.600"
                textAlign="center"
                minW={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
                maxW={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
                w={{ base: "100px", sm: "110px", md: "130px", lg: "150px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Sushi 24hr Vol</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="Sushiswap Subgraph" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="blue.600" 
                fontWeight="bold"
                textAlign="center"
                minW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                maxW={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
                w={{ base: "110px", sm: "120px", md: "140px", lg: "160px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Mainnet DEX TVL</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="calc" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs" 
                color="blue.600"
                textAlign="center"
                minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>24hr DEX volume</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="calc" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                maxW={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
                w={{ base: "130px", sm: "150px", md: "170px", lg: "190px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>DEX Liquidity Turnover</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="calc" />
                  </Box>
                </Box>
              </Th>
              
              {/* Emissions */}
              <SortableHeader 
                textAlign="center"
                column="nextEmissions" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="Protocol team" 
                fontSize="xs" 
                minW={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
                maxW={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
                w={{ base: "150px", sm: "160px", md: "170px", lg: "180px" }}
              >
                Next 12 mo Emissions / Unlocks
              </SortableHeader>
              <SortableHeader 
                textAlign="center"
                column="nextReleasePercentage" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="Protocol team" 
                fontSize="xs" 
                minW={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
                maxW={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
                w={{ base: "130px", sm: "140px", md: "145px", lg: "150px" }}
              >
                Next 12 month release %
              </SortableHeader>
              <SortableHeader 
                textAlign="center"
                column="emissionsCatalyst" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="Protocol team" 
                fontSize="xs" 
                minW={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
                maxW={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
                w={{ base: "300px", sm: "350px", md: "375px", lg: "400px" }}
              >
                Emissions, unlocks catalyst
              </SortableHeader>
              
              {/* Protocol TVL */}
              <SortableHeader 
                column="protocolTVL" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="DeFiLlama API" 
                fontSize="xs"
                minW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                maxW={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
                w={{ base: "110px", sm: "130px", md: "150px", lg: "170px" }}
              >
                Protocol TVL<br/>(exclude staking)
              </SortableHeader>
            </Tr>
          </Thead>
          <Tbody>
            {sortedProtocols.map((protocol) => (
              <ProtocolRow
                key={protocol.ticker}
                protocol={protocol}
                shouldLoad={loadedProtocols.has(protocol.originalIndex)}
              />
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

// ================= CSV EXPORT FUNCTION =================

function exportToCSV(protocols, allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allAlcxDeadBalances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax, allCurveTVL, allCurveVolume, allUniswapTVL, allUniswapVolume, allBalancerTVL, allBalancerVolume, allSushiTVL, allSushiVolume) {
  const headers = [
    'Protocol',
    'Name',
    'Blockchain',
    'Mainnet Launch',
    'Years Onchain',
    'OPEN Status',
    'Market Cap',
    'FDV',
    'Volume 24h',
    'Volume 30d Avg',
    'TVL',
    'Market Cap / FDV (%)',
    'Market Cap / TVL (%)',
    'FDV / TVL (%)',
    'Max Supply',
    'Total Supply',
    'Circulating Supply',
    'Circulating / Total (%)',
    'Top 3 Exchanges',
    'Curve TVL',
    'Curve 24h Volume',
    'Uniswap TVL',
    'Uniswap 24h Volume',
    'Balancer TVL',
    'Balancer 24h Volume',
    'Sushi TVL',
    'Sushi 24h Volume',
    'Total DEX TVL',
    'Total DEX Volume',
    'DEX Liquidity Turnover',
    'Next 12mo Emissions',
    'Next 12mo Release %',
    'Emissions Catalyst',
    'Protocol TVL'
  ];

  const csvContent = [headers];

  protocols.forEach((protocol, index) => {
    const coinGeckoData = allCoinGeckoData[index];
    const defiLlamaTVL = allDefiLlamaTVL[index];
    const fxnHolderBalance = allFxnHolderBalances[index];
    const invToken1Balance = allInvToken1Balances[index];
    const invToken2Balance = allInvToken2Balances[index];
    const alcxDeadBalance = allAlcxDeadBalances[index];
    const fraxswapTVLForFrax = allFraxswapTVLForFrax[index];
    const fraxswapVolumeForFrax = allFraxswapVolumeForFrax[index];

    // Calculate derived values (same logic as in component)
    const marketCap = protocol.ticker === 'FXN' 
      ? ((coinGeckoData?.marketData?.data?.market_cap || 0) + (fxnHolderBalance?.data?.balanceUSD || 0))
      : (coinGeckoData?.marketData?.data?.market_cap || 0);
    const fdv = coinGeckoData?.marketData?.data?.fdv || 0;
    const volume24h = coinGeckoData?.marketData?.data?.volume_24h || 0;
    const volume30d = coinGeckoData?.volume30d?.data || 0;
    const coinGeckoTVL = coinGeckoData?.marketData?.data?.tvl || 0;
    const maxSupply = coinGeckoData?.marketData?.data?.max_supply || 0;
    const totalSupply = protocol.ticker === 'ALCX' 
      ? ((coinGeckoData?.marketData?.data?.total_supply || 0) - (alcxDeadBalance?.data?.balance || 0))
      : (coinGeckoData?.marketData?.data?.total_supply || 0);
    const circSupply = coinGeckoData?.marketData?.data?.circulating_supply || 0;
    const protocolTVL = defiLlamaTVL?.data || 0;
    
    const yearsOnChain = calculateYearsOnChain(protocol.mainnetLaunch);
    const mcToFdv = fdv > 0 ? (marketCap / fdv) * 100 : 0;
    const mcToTvl = coinGeckoTVL > 0 ? (marketCap / coinGeckoTVL) * 100 : 0;
    const fdvToTvl = coinGeckoTVL > 0 ? (fdv / coinGeckoTVL) * 100 : 0;
    const circToTotal = totalSupply > 0 ? (circSupply / totalSupply) * 100 : 0;
    const nextReleasePercentage = circSupply > 0 ? (protocol.nextEmissions / circSupply) * 100 : 0;

    // Get exchange info
    const exchanges = coinGeckoData?.topExchanges?.data?.exchanges;
    const topExchanges = exchanges && Array.isArray(exchanges) && exchanges.length > 0
      ? exchanges
          .slice(0, 3)
          .filter(ex => ex && ex.name && ex.name !== 'Unknown' && ex.name !== 'undefined')
          .map(ex => `${ex.name} (${ex.volume_display || ex.volume_usd || '0'})`)
          .join(', ')
      : 'N/A';

    // DEX data from hooks
    const curveTVL = allCurveTVL[index]?.data || 0;
    const curveVolume = allCurveVolume[index]?.data || 0;
    const uniswapTVL = protocol.ticker === 'INV' 
      ? ((allUniswapTVL[index]?.data || 0) + (invToken1Balance?.data?.balanceUSD || 0) + (invToken2Balance?.data?.balanceUSD || 0))
      : (allUniswapTVL[index]?.data || 0);
    const uniswapVolume = allUniswapVolume[index]?.data || 0;
    const balancerTVL = protocol.ticker === 'FRAX' 
      ? (fraxswapTVLForFrax?.data || 0)
      : (allBalancerTVL[index]?.data || 0);
    const balancerVolume = protocol.ticker === 'FRAX' 
      ? (fraxswapVolumeForFrax?.data || 0)
      : (allBalancerVolume[index]?.data || 0);
    const sushiTVL = allSushiTVL[index]?.data || 0;
    const sushiVolume = allSushiVolume[index]?.data || 0;
    
    const totalDexTVL = curveTVL + uniswapTVL + balancerTVL + sushiTVL;
    const totalDexVolume = curveVolume + uniswapVolume + balancerVolume + sushiVolume;
    const liquidityTurnover = totalDexTVL > 0 ? totalDexVolume / totalDexTVL : 0;

    const row = [
      protocol.ticker,
      protocol.name,
      protocol.blockchain?.toUpperCase() || '',
      protocol.mainnetLaunch,
      `${yearsOnChain}y`,
      protocol.openStatus,
      marketCap,
      fdv,
      volume24h,
      volume30d,
      coinGeckoTVL,
      mcToFdv.toFixed(2),
      mcToTvl.toFixed(2),
      fdvToTvl.toFixed(2),
      maxSupply,
      totalSupply,
      circSupply,
      circToTotal.toFixed(2),
      topExchanges,
      curveTVL,
      curveVolume,
      uniswapTVL,
      uniswapVolume,
      balancerTVL,
      balancerVolume,
      sushiTVL,
      sushiVolume,
      totalDexTVL,
      totalDexVolume,
      liquidityTurnover.toFixed(2),
      protocol.nextEmissions,
      nextReleasePercentage.toFixed(2),
      protocol.emissionsCatalyst || 'N/A',
      protocolTVL
    ];

    csvContent.push(row);
  });

  // Convert to CSV string
  const csvString = csvContent.map(row => 
    row.map(field => {
      // Handle fields that might contain commas or quotes
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    }).join(',')
  ).join('\n');

  // Create and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `defi-dashboard-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}