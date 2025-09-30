import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Text,
  useColorModeValue,
  Button,
  Flex,
  HStack,
  VStack,
  Badge
} from '@chakra-ui/react';

import { DownloadIcon } from '@chakra-ui/icons';
import { useState, useEffect, useMemo } from 'react';

import { protocols, calculateYearsOnChain} from '../config/protocols.js';
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
  useTokenBalanceWithUSD,
  useTokenPrice,
  useTokenBalance,
  useTokenDecimals,
  useTokenTotalSupply
} from '../hooks/index.js';

import ProtocolRow from './ProtocolRow.jsx';
import SortableHeader from './SortableHeader.jsx';
import DataSourceBadge from './DataSourceBadge.jsx';
import { exportToCSV } from '../utils/csvExport.js';



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

  // Load all stable prices from DeFiLlama
  // Prices are cached at the server level and client level with React Query
  const allStablePrices = protocols.map(protocol => 
    useTokenPrice(
      protocol.stableAddress,
      protocol.blockchain,
      { 
        enabled: allProtocolsLoaded && protocol.stableAddress !== null,
        staleTime: 1 * 60 * 1000, // 1 minute - prices change frequently
        cacheTime: 3 * 60 * 1000 // 3 minutes
      }
    )
  );

  // Load all governance token prices from DeFiLlama
  // Prices are cached at the server level and client level with React Query
  const allGovTokenPrices = protocols.map(protocol => 
    useTokenPrice(
      protocol.govContractAddress,
      protocol.blockchain,
      { 
        enabled: allProtocolsLoaded,
        staleTime: 1 * 60 * 1000, // 1 minute - prices change frequently
        cacheTime: 3 * 60 * 1000 // 3 minutes
      }
    )
  );

  // Load OPEN Stablecoin Index price
  const OPEN_TOKEN_ADDRESS = '0x323c03c48660fe31186fa82c289b0766d331ce21';
  const openIndexPrice = useTokenPrice(
    OPEN_TOKEN_ADDRESS,
    'ethereum',
    { 
      enabled: true,
      staleTime: 1 * 60 * 1000, // 1 minute - price changes frequently
      cacheTime: 3 * 60 * 1000 // 3 minutes
    }
  );

  // Get protocols with "current" status for theoretical price calculation
  const currentProtocols = useMemo(() => 
    protocols.filter(p => p.openStatus === 'current'),
    []
  );
  
  // Fetch token balances held in OPEN address for current protocols
  // Using longer cache times since these don't change rapidly
  const openHoldingsBalances = currentProtocols.map(protocol =>
    useTokenBalance(
      protocol.govContractAddress,
      OPEN_TOKEN_ADDRESS,
      { 
        enabled: allProtocolsLoaded,
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 5 * 60 * 1000 // 5 minutes
      }
    )
  );
  
  // Fetch decimals for current protocol tokens
  // Decimals never change, so cache for a long time
  const openHoldingsDecimals = currentProtocols.map(protocol =>
    useTokenDecimals(
      protocol.govContractAddress,
      { 
        enabled: allProtocolsLoaded,
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
        cacheTime: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    )
  );
  
  // Fetch prices for current protocol tokens (using existing allGovTokenPrices)
  // Map current protocols to their indices in the full protocols array
  const currentProtocolIndices = useMemo(() => 
    currentProtocols.map(cp => 
      protocols.findIndex(p => p.ticker === cp.ticker)
    ),
    [currentProtocols]
  );
  
  // Get OPEN token total supply and decimals
  // Cache these for longer since they don't change often
  const openTotalSupply = useTokenTotalSupply(
    OPEN_TOKEN_ADDRESS, 
    { 
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );
  const openDecimals = useTokenDecimals(
    OPEN_TOKEN_ADDRESS, 
    { 
      enabled: true,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      cacheTime: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  );
  
  // Calculate theoretical price (NAV - Net Asset Value)
  // Formula: Total Value of Holdings / Total Supply
  // 
  // Caching Strategy:
  // - Token balances: 2 min stale / 5 min cache (client) + 1 min (server)
  // - Token decimals: 24 hour stale / 7 day cache (never changes)
  // - Token prices: 1 min stale / 3 min cache (client) + 1 hour (server)
  // - Total supply: 5 min stale / 15 min cache (client) + 10 min (server)
  const theoreticalPrice = useMemo(() => {
    if (!allProtocolsLoaded) return null;
    
    let totalValue = 0;
    let allDataLoaded = true;
    
    currentProtocols.forEach((protocol, index) => {
      const balance = openHoldingsBalances[index];
      const decimals = openHoldingsDecimals[index];
      const protocolIndex = currentProtocolIndices[index];
      const price = allGovTokenPrices[protocolIndex];
      
      if (balance.isLoading || decimals.isLoading || price.isLoading) {
        allDataLoaded = false;
        return;
      }
      
      if (balance.data && decimals.data && price.data) {
        const formattedBalance = balance.data / Math.pow(10, decimals.data);
        const tokenValue = formattedBalance * Number(price.data);
        totalValue += tokenValue;
      }
    });
    
    if (!allDataLoaded || openTotalSupply.isLoading || openDecimals.isLoading) {
      return null;
    }
    
    if (openTotalSupply.data && openDecimals.data && openTotalSupply.data > 0) {
      const formattedSupply = openTotalSupply.data / Math.pow(10, openDecimals.data);
      return totalValue / formattedSupply;
    }
    
    return null;
  }, [
    allProtocolsLoaded, 
    openHoldingsBalances, 
    openHoldingsDecimals, 
    allGovTokenPrices, 
    currentProtocolIndices,
    openTotalSupply,
    openDecimals
  ]);

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
      const circSupply = protocol.ticker === 'FXN'
        ? ((coinGeckoData?.marketData?.data?.circulating_supply || 0) + (fxnHolderBalance?.data?.balance || 0))
        : (coinGeckoData?.marketData?.data?.circulating_supply || 0);
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
      allSushiVolume,
      allStablePrices,
      allGovTokenPrices
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
      {/* OPEN Index Price & Export Button */}
      <Flex 
        justify="space-between" 
        align="center" 
        mb={2}
        px={2}
        wrap="wrap"
        gap={2}
      >
        {/* OPEN Stablecoin Index Display */}
        <HStack spacing={3} wrap="wrap">
          <Box
            bg={useColorModeValue('blue.50', 'blue.900')}
            border="2px solid"
            borderColor={useColorModeValue('blue.300', 'blue.600')}
            borderRadius="lg"
            px={4}
            py={3}
            boxShadow="md"
          >
            <HStack spacing={4} divider={<Box w="1px" h="40px" bg={useColorModeValue('blue.300', 'blue.600')} />}>
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')} fontWeight="medium">
                  OPEN Index - Market Price
                </Text>
                <HStack spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('blue.700', 'blue.300')}>
                    {openIndexPrice.data ? `$${Number(openIndexPrice.data).toFixed(4)}` : 'Loading...'}
                  </Text>
                  <Badge colorScheme="blue" fontSize="xs">
                    Live
                  </Badge>
                </HStack>
              </VStack>
              
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')} fontWeight="medium">
                  Theoretical Price (NAV)
                </Text>
                <HStack spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('green.700', 'green.300')}>
                    {theoreticalPrice ? `$${theoreticalPrice.toFixed(4)}` : 'Calculating...'}
                  </Text>
                  <Badge colorScheme="green" fontSize="xs">
                    On-chain
                  </Badge>
                </HStack>
              </VStack>
              
              {theoreticalPrice && openIndexPrice.data && (
                <VStack align="flex-start" spacing={0}>
                  <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')} fontWeight="medium">
                    Premium/Discount
                  </Text>
                  <Text 
                    fontSize="xl" 
                    fontWeight="bold" 
                    color={
                      ((Number(openIndexPrice.data) / theoreticalPrice - 1) * 100) >= 0 
                        ? useColorModeValue('green.600', 'green.400')
                        : useColorModeValue('red.600', 'red.400')
                    }
                  >
                    {((Number(openIndexPrice.data) / theoreticalPrice - 1) * 100).toFixed(2)}%
                  </Text>
                </VStack>
              )}
            </HStack>
          </Box>
        </HStack>

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
            '& th, & td': {
              paddingTop: '6px',
              paddingBottom: '6px',
              paddingLeft: '2px',
              paddingRight: '2px'
            },
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
                minW={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
                maxW={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
                w={{ base: "75px", sm: "90px", md: "110px", lg: "130px" }}
                textAlign="center"
                centerVertically={true}
              >
                Protocol
              </SortableHeader>
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
                maxW={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
                w={{ base: "100px", sm: "110px", md: "120px", lg: "120px" }}
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
                minW={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
                maxW={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
                w={{ base: "55px", sm: "60px", md: "70px", lg: "75px" }}
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
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
                maxW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
                w={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
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
                minW={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
                maxW={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
                w={{ base: "70px", sm: "75px", md: "85px", lg: "90px" }}
              >
                $OPEN Status
              </SortableHeader>
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Stable Price</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="DeFiLlama API" />
                  </Box>
                </Box>
              </Th>
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
              >
                <Box position="relative" h="90px" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start" pt={2}>
                  <Text mb={2}>Gov Token Price</Text>
                  <Box position="absolute" bottom={1}>
                    <DataSourceBadge source="DeFiLlama API" />
                  </Box>
                </Box>
              </Th>
              
              {/* Market Metrics */}
              <SortableHeader 
                column="marketCap" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onReset={handleReset} 
                dataSource="CoinGecko API" 
                fontSize="xs"
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
                maxW={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
                w={{ base: "85px", sm: "95px", md: "110px", lg: "120px" }}
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
                minW={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
                maxW={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
                w={{ base: "95px", sm: "100px", md: "115px", lg: "130px" }}
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
                minW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
                maxW={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
                w={{ base: "60px", sm: "65px", md: "75px", lg: "80px" }}
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
                minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
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
                minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
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
                minW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                maxW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                w={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
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
                minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
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
                minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
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
                minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
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
                minW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                maxW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                w={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
              >
                Circ Supply % of Total
              </SortableHeader>
              
              {/* Exchanges */}
              <Th 
                fontSize="xs"
                textAlign="center"
                minW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
                maxW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
                w={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
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
                minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
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
                minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
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
                minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
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
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
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
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
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
                minW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
                maxW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
                w={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
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
                minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
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
                minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
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
                minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
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
                minW={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
                maxW={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
                w={{ base: "100px", sm: "110px", md: "120px", lg: "130px" }}
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
                minW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
                maxW={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
                w={{ base: "90px", sm: "100px", md: "110px", lg: "120px" }}
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
                minW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
                maxW={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
                w={{ base: "180px", sm: "210px", md: "240px", lg: "270px" }}
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
                minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
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