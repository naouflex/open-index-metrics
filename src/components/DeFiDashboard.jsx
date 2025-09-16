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