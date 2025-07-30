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
  Heading,
  HStack,
  VStack,
  Tooltip,
  useColorModeValue,
  useColorMode,
  Alert,
  AlertTitle,
  AlertDescription,
  Icon,
  IconButton,
  Flex,
  Link
} from '@chakra-ui/react';

import { AlertIcon, TriangleUpIcon, TriangleDownIcon, SunIcon, MoonIcon, ExternalLinkIcon, InfoIcon } from '@chakra-ui/icons';
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
  
  // If not loading yet, show skeleton
  if (!shouldLoad) {
    return (
      <Tr _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }} transition="background-color 0.2s">
        <Td
          position="sticky"
          left={0}
          bg={useColorModeValue('white', 'gray.800')}
          zIndex={2}
          borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          minW="350px"
          maxW="350px"
          w="350px"
        >
          {protocol.ticker}
        </Td>
        <Td colSpan={30}>
          <Skeleton height="20px" />
        </Td>
      </Tr>
    );
  }
  
  // Calculate derived metrics
  const isLoading = coinGeckoData.isLoading || defiLlamaTVL.isLoading || 
    (protocol.ticker === 'FXN' && fxnHolderBalance.isLoading) ||
    (protocol.ticker === 'INV' && (invToken1Balance.isLoading || invToken2Balance.isLoading)) ||
    (protocol.ticker === 'FRAX' && (fraxswapTVLForFrax.isLoading || fraxswapVolumeForFrax.isLoading));
  const hasError = coinGeckoData.hasError || defiLlamaTVL.isError ||
    (protocol.ticker === 'FXN' && fxnHolderBalance.isError) ||
    (protocol.ticker === 'INV' && (invToken1Balance.isError || invToken2Balance.isError)) ||
    (protocol.ticker === 'FRAX' && (fraxswapTVLForFrax.isError || fraxswapVolumeForFrax.isError));
  
  // For FXN protocol, add holder balance USD to market cap
  const marketCap = protocol.ticker === 'FXN' 
    ? ((coinGeckoData.marketData?.data?.market_cap || 0) + (fxnHolderBalance.data?.balanceUSD || 0))
    : (coinGeckoData.marketData?.data?.market_cap || 0);
  const fdv = coinGeckoData.marketData?.data?.fdv || 0;
      const volume24h = coinGeckoData.marketData?.data?.volume_24h || 0;
  const volume30d = coinGeckoData.volume30d?.data || 0;
  const coinGeckoTVL = coinGeckoData.marketData?.data?.tvl || 0;
  
 
  const maxSupply = coinGeckoData.marketData?.data?.max_supply || 0;
    
  const totalSupply = coinGeckoData.marketData?.data?.total_supply || 0;
  const circSupply = coinGeckoData.marketData?.data?.circulating_supply || 0;
  const protocolTVL = defiLlamaTVL.data || 0;
  
  // DEX aggregation
  const dexTVLs = [
    curveTVL.data || 0,
    // For INV protocol, add token balances to Uniswap TVL
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
  
  if (hasError) {
    return (
      <Tr _hover={{ bg: hoverBgColor }} transition="background-color 0.2s">
        <Td
          position="sticky"
          left={0}
          bg={bgColor}
          zIndex={2}
          borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          minW="350px"
          maxW="350px"
          w="350px"
        >
          {protocol.ticker}
        </Td>
        <Td colSpan={30}>
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
        position="sticky"
        left={0}
        bg={bgColor}
        zIndex={2}
                  borderRight="2px solid"
          borderRightColor={useColorModeValue('gray.300', 'gray.600')}
          boxShadow="2px 0 4px rgba(0,0,0,0.1)"
          _hover={{ bg: hoverBgColor }}
        whiteSpace="nowrap"
      >
        <VStack align="start" spacing={2}>
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" fontSize="sm" isTruncated>{protocol.ticker}</Text>
            <Text fontSize="xs" color="gray.500" isTruncated>{protocol.name}</Text>
          </VStack>
          <HStack spacing={1} flexWrap="wrap">
            {protocol.govContractAddress && (
              <Link href={`https://etherscan.io/address/${protocol.govContractAddress}`} isExternal>
                <Badge 
                  colorScheme="blue" 
                  size="sm" 
                  cursor="pointer" 
                  _hover={{ bg: 'blue.600', color: 'white' }}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  Etherscan
                  <ExternalLinkIcon boxSize={2} />
                </Badge>
              </Link>
            )}
            {protocol.coingeckoId && (
              <Link href={`https://www.coingecko.com/en/coins/${protocol.coingeckoId}`} isExternal>
                <Badge 
                  colorScheme="green" 
                  size="sm" 
                  cursor="pointer" 
                  _hover={{ bg: 'green.600', color: 'white' }}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  CoinGecko
                  <ExternalLinkIcon boxSize={2} />
                </Badge>
              </Link>
            )}
            {protocol.defiLlamaSlug && (
              <Link href={`https://defillama.com/protocol/${protocol.defiLlamaSlug}`} isExternal>
                <Badge 
                  colorScheme="purple" 
                  size="sm" 
                  cursor="pointer" 
                  _hover={{ bg: 'purple.600', color: 'white' }}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  DeFiLlama
                  <ExternalLinkIcon boxSize={2} />
                </Badge>
              </Link>
            )}
          </HStack>
        </VStack>
      </Td>
      
      {/* Blockchain */}
      <Td>
        <Badge colorScheme="blue" size="sm">
          {protocol.blockchain?.toUpperCase()}
        </Badge>
      </Td>
      
      {/* V1 Protocol Mainnet Launch */}
      <Td>
        <Text fontSize="xs">{protocol.mainnetLaunch}</Text>
      </Td>
      
      {/* Years Onchain */}
      <Td>
        <Text fontSize="sm">{yearsOnChain}y</Text>
      </Td>
      
      {/* $OPEN Status */}
      <Td>
        <Badge colorScheme={protocol.openStatus === 'current' ? 'green' : 'orange'} size="sm">
          {protocol.openStatus}
        </Badge>
      </Td>
      
      {/* Market Metrics */}
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(marketCap)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(fdv)}</Text>
        </Skeleton>
      </Td>
      
              <Td>
          <Skeleton isLoaded={!isLoading}>
            <Text fontSize="sm">{formatNumber(coinGeckoData.marketData.data?.volume_24h || 0)}</Text>
          </Skeleton>
        </Td>
      
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatNumber(volume30d)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm" color={coinGeckoTVL > 0 ? "blue.500" : "gray.400"} fontWeight={coinGeckoTVL > 0 ? "semibold" : "normal"}>
            {coinGeckoTVL > 0 ? formatNumber(coinGeckoTVL) : "N/A"}
          </Text>
        </Skeleton>
      </Td>
      
      {/* Ratios */}
      <Td>
        <Text fontSize="sm">{formatPercentage(mcToFdv)}</Text>
      </Td>
      
      <Td>
        <Text fontSize="sm">{formatPercentage(mcToTvl)}</Text>
      </Td>
      
      <Td>
        <Text fontSize="sm">{formatPercentage(fdvToTvl)}</Text>
      </Td>
      
      {/* Supply Metrics */}
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{
            protocol.ticker === 'FXN' 
              ? formatNumber(maxSupply) // Use currency formatting for FXN USD values
              : formatSupply(maxSupply) // Use supply formatting for other protocols
          }</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatSupply(totalSupply)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!isLoading}>
          <Text fontSize="sm">{formatSupply(circSupply)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Text fontSize="sm">{formatPercentage(circToTotal)}</Text>
      </Td>
      
              {/* Top 3 Exchanges */}
        <Td>
          <Skeleton isLoaded={!coinGeckoData.topExchanges?.isLoading}>
            <Text fontSize="xs" color="gray.600">
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
      <Td>
        <Skeleton isLoaded={!curveTVL.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!curveVolume.isLoading}>
          <Text fontSize="sm" color="red.600">{formatNumber(curveVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!uniswapTVL.isLoading && (protocol.ticker !== 'INV' || (!invToken1Balance.isLoading && !invToken2Balance.isLoading))}>
          <Text fontSize="sm" color="orange.600">{
            formatNumber(
              protocol.ticker === 'INV' 
                ? ((uniswapTVL.data || 0) + (invToken1Balance.data?.balanceUSD || 0) + (invToken2Balance.data?.balanceUSD || 0))
                : (uniswapTVL.data || 0)
            )
          }</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!uniswapVolume.isLoading}>
          <Text fontSize="sm" color="orange.600">{formatNumber(uniswapVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={protocol.ticker === 'FRAX' ? !fraxswapTVLForFrax.isLoading : !balancerTVL.isLoading}>
          <Text fontSize="sm" color="green.600">{
            formatNumber(
              protocol.ticker === 'FRAX' 
                ? (fraxswapTVLForFrax.data || 0)
                : (balancerTVL.data || 0)
            )
          }</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={protocol.ticker === 'FRAX' ? !fraxswapVolumeForFrax.isLoading : !balancerVolume.isLoading}>
          <Text fontSize="sm" color="green.600">{
            formatNumber(
              protocol.ticker === 'FRAX' 
                ? (fraxswapVolumeForFrax.data || 0)
                : (balancerVolume.data || 0)
            )
          }</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!sushiTVL.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiTVL.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Skeleton isLoaded={!sushiVolume.isLoading}>
          <Text fontSize="sm" color="purple.600">{formatNumber(sushiVolume.data || 0)}</Text>
        </Skeleton>
      </Td>
      
      <Td>
        <Text fontSize="sm" fontWeight="bold" color="blue.600">{formatNumber(totalDexTVL)}</Text>
      </Td>
      
      <Td>
        <Text fontSize="sm" fontWeight="semibold" color="blue.600">{formatNumber(totalDexVolume)}</Text>
      </Td>
      
      <Td>
        <Text fontSize="sm">{liquidityTurnover.toFixed(2)}x</Text>
      </Td>
      
      {/* Emissions */}
      <Td>
        <Text fontSize="sm">{formatSupply(protocol.nextEmissions)}</Text>
      </Td>
      
      <Td>
        <Text fontSize="sm">{formatPercentage(nextReleasePercentage)}</Text>
      </Td>
      
      {/* Emissions Catalyst */}
      <Td>
        <Text fontSize="xs" color="gray.600">{protocol.emissionsCatalyst || 'N/A'}</Text>
      </Td>
      
      {/* Protocol TVL */}
      <Td>
        <Skeleton isLoaded={!defiLlamaTVL.isLoading}>
          <Text fontSize="sm" fontWeight="semibold">{formatNumber(protocolTVL)}</Text>
        </Skeleton>
      </Td>
    </Tr>
  );
}

// ================= COLOR MODE TOGGLE COMPONENT =================

function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`} hasArrow>
      <IconButton
        aria-label="Toggle color mode"
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        size="md"
        _hover={{
          bg: useColorModeValue('gray.200', 'gray.600')
        }}
      />
    </Tooltip>
  );
}

// ================= DATA SOURCE BADGE COMPONENT =================

function DataSourceBadge({ source }) {
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
    <Tooltip label={`Data Source: ${source}`} hasArrow placement="top">
      <Badge 
        colorScheme={getColorScheme(source)} 
        size="xs" 
        fontSize="8px"
        px={1}
        py={0.5}
        ml={1}
        cursor="help"
      >
        <InfoIcon boxSize={2} />
      </Badge>
    </Tooltip>
  );
}

// ================= SORTABLE HEADER COMPONENT =================

function SortableHeader({ column, currentSort, onSort, onReset, dataSource, children, ...props }) {
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
      {...props}
    >
      <VStack spacing={1} align="start">
        <HStack spacing={1}>
          <Text>{children}</Text>
          {isActive && (
            <Icon as={isAsc ? TriangleUpIcon : TriangleDownIcon} boxSize={3} />
          )}
          <DataSourceBadge source={dataSource} />
        </HStack>
      </VStack>
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
 
        
      const totalSupply = coinGeckoData?.marketData?.data?.total_supply || 0;
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
  }, [allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax]);

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

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="100%" py={8}>
        <VStack spacing={6} align="stretch">
          <Heading size="lg" textAlign="center">
            Metrics: $OPEN index (Constituents & Proposed)
          </Heading>
          
          {/* Centered theme toggle */}
          <Box display="flex" justifyContent="center">
            <ColorModeToggle />
          </Box>
          
        </VStack>

        <Box 
          overflowX="auto" 
          overflowY="auto"
          mt={8} 
          //maxH="80vh" 
          border="1px solid" 
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          borderRadius="md"
          position="relative"
        >
          <Table size="sm" variant="simple" sx={{ '& td:first-child, & th:first-child': { position: 'sticky !important', left: 0 } }}>
            <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={3}>
              <Tr>
                {/* Basic Info */}
                <SortableHeader 
                  column="protocol" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  onReset={handleReset} 
                  dataSource="CoinGecko"
                  fontSize="xs"
                  position="sticky"
                  left={0}
                  bg={tableHeaderBg}
                  zIndex={4}
                  borderRight="2px solid"
                  borderRightColor={useColorModeValue('gray.300', 'gray.600')}
                  boxShadow="2px 0 4px rgba(0,0,0,0.1)"
                  minW="350px"
                  maxW="350px"
                  w="350px"
                >
                  Protocol
                </SortableHeader>
                <SortableHeader column="blockchain" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="Required" fontSize="xs">Blockchain</SortableHeader>
                <SortableHeader column="mainnetLaunch" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="docs" fontSize="xs">V1 Protocol Mainnet</SortableHeader>
                <SortableHeader column="years" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="calc" fontSize="xs">Years Onchain</SortableHeader>
                <SortableHeader column="status" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="Manual" fontSize="xs">$OPEN Status</SortableHeader>
                
                {/* Market Metrics */}
                <SortableHeader column="marketCap" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Market Cap</SortableHeader>
                <SortableHeader column="fdv" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">FDV</SortableHeader>
                <SortableHeader column="volume24h" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Volume (24hr)</SortableHeader>
                <SortableHeader column="volume30d" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Volume (30d avg)</SortableHeader>
                <SortableHeader column="tvlCG" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs" color="blue.500">TVL</SortableHeader>
                
                {/* Ratios */}
                <SortableHeader column="mcToFdv" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="calc" fontSize="xs">Market Cap / FDV (%)</SortableHeader>
                <SortableHeader column="mcToTvl" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="calc" fontSize="xs">Market Cap / TVL (%)</SortableHeader>
                <SortableHeader column="fdvToTvl" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="calc" fontSize="xs">FDV / TVL (%)</SortableHeader>
                
                {/* Supply */}
                <SortableHeader column="maxSupply" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Max Supply<br/>(theoretical max)</SortableHeader>
                <SortableHeader column="totalSupply" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Total Supply<br/>(onchain supply minus burned)</SortableHeader>
                <SortableHeader column="circSupply" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="CoinGecko API" fontSize="xs">Circ Supply<br/>(public tokens, incl ve)</SortableHeader>
                <SortableHeader column="circToTotal" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="calc" fontSize="xs">Circ Supply % of Total</SortableHeader>
                
                {/* Exchanges */}
                <Th 
                  fontSize="xs"
                  minW="240px"
                >
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Top 3 Exchanges<br/>(24hr combined volume)</Text>
                      <DataSourceBadge source="CoinGecko API" />
                    </HStack>
                  </VStack>
                </Th>
                
                {/* DEX Data */}
                <Th fontSize="xs" color="red.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Curve TVL</Text>
                      <DataSourceBadge source="Curve API" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="red.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Curve 24hr Vol</Text>
                      <DataSourceBadge source="Curve API" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="orange.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Uniswap TVL</Text>
                      <DataSourceBadge source="Uniswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="orange.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Uniswap 24hr Vol</Text>
                      <DataSourceBadge source="Uniswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="green.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Balancer TVL</Text>
                      <DataSourceBadge source="Balancer & Fraxswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="green.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Balancer 24hr Vol</Text>
                      <DataSourceBadge source="Balancer & Fraxswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="purple.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Sushi TVL</Text>
                      <DataSourceBadge source="Sushiswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="purple.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Sushi 24hr Vol</Text>
                      <DataSourceBadge source="Sushiswap Subgraph" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="blue.600" fontWeight="bold">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>Mainnet DEX TVL</Text>
                      <DataSourceBadge source="calc" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs" color="blue.600">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>24hr DEX volume</Text>
                      <DataSourceBadge source="calc" />
                    </HStack>
                  </VStack>
                </Th>
                <Th fontSize="xs">
                  <VStack spacing={1} align="start">
                    <HStack spacing={1}>
                      <Text>DEX Liquidity Turnover</Text>
                      <DataSourceBadge source="calc" />
                    </HStack>
                  </VStack>
                </Th>
                
                {/* Emissions */}
                <SortableHeader column="nextEmissions" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="Protocol team" fontSize="xs">Next 12 mo Emissions / Unlocks</SortableHeader>
                <SortableHeader column="nextReleasePercentage" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="Protocol team" fontSize="xs">Next 12 month release %</SortableHeader>
                <SortableHeader column="emissionsCatalyst" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="Protocol team" fontSize="xs">Emissions, unlocks catalyst</SortableHeader>
                
                {/* Protocol TVL */}
                <SortableHeader column="protocolTVL" currentSort={sortConfig} onSort={handleSort} onReset={handleReset} dataSource="DeFiLlama API" fontSize="xs">Protocol TVL<br/>(exclude staking)</SortableHeader>
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
        
        {/* Footer Info */}
        <VStack spacing={4} mt={8} align="center">
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Data sources: CoinGecko, DeFiLlama, The Graph Protocol, Curve API
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Last updated: {new Date().toLocaleString()}
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Made with{' '}
            <Text as="span" color="blue.500">💙</Text>
            {' '}by{' '}
            <Link href="https://x.com/naouufel" isExternal color="blue.400" _hover={{ color: 'blue.300' }}>
              Naoufel
            </Link>
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}