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
  useTokenTotalSupply,
  useProtocolRevenue
} from '../hooks/index.js';

import ProtocolRow from './ProtocolRow.jsx';
import SortableHeader from './SortableHeader.jsx';
import DataSourceBadge from './DataSourceBadge.jsx';
import ColumnVisibilityMenu from './ColumnVisibilityMenu.jsx';
import ProtocolFilter from './ProtocolFilter.jsx';
import { exportToCSV } from '../utils/csvExport.js';

// ================= COLUMN DEFINITIONS =================
const COLUMN_DEFINITIONS = {
  protocol: 'Protocol',
  links: 'Links',
  blockchain: 'Blockchain',
  mainnetLaunch: 'V1 Protocol Mainnet',
  years: 'Years Onchain',
  status: '$OPEN Status',
  stablePrice: 'Stable Price',
  govTokenPrice: 'Gov Token Price',
  currentWeight: 'Current Weight %',
  marketCap: 'Market Cap',
  fdv: 'FDV',
  volume24h: 'Volume (24hr)',
  volume30d: 'Volume (30d avg)',
  tvlCG: 'TVL',
  mcToFdv: 'Market Cap / FDV (%)',
  mcToTvl: 'Market Cap / TVL (%)',
  tvlToFdv: 'TVL / FDV (%)',
  maxSupply: 'Max Supply',
  totalSupply: 'Total Supply',
  circSupply: 'Circ Supply',
  circToTotal: 'Circ Supply % of Total',
  topExchanges: 'Top 3 Exchanges',
  curveTVL: 'Curve TVL',
  curveVolume: 'Curve 24hr Vol',
  uniswapTVL: 'Uniswap TVL',
  uniswapVolume: 'Uniswap 24hr Vol',
  balancerTVL: 'Balancer TVL',
  balancerVolume: 'Balancer 24hr Vol',
  sushiTVL: 'Sushi TVL',
  sushiVolume: 'Sushi 24hr Vol',
  mainnetDexTVL: 'Mainnet DEX TVL',
  dexVolume24h: '24hr DEX volume',
  dexLiquidityTurnover: 'DEX Liquidity Turnover',
  nextEmissions: 'Next 12 mo Emissions / Unlocks',
  nextReleasePercentage: 'Next 12 month release %',
  emissionsCatalyst: 'Emissions, unlocks catalyst',
  protocolTVL: 'Protocol TVL',
  revenue24h: 'Revenue (24h)',
  revenue7d: 'Revenue (7d avg)',
  revenueAllTime: 'Revenue (All Time)',
  revenueAnnualized24h: 'Revenue (Annualized from 24h)',
  revenueAnnualized7d: 'Revenue (Annualized from 7d avg)',
  revenueToMarketCap24h: 'Revenue / Market Cap (%, 24h basis)',
  revenueToTVL24h: 'Revenue / TVL (%, 24h basis)',
  revenueToMarketCap7d: 'Revenue / Market Cap (%, 7d basis)',
  revenueToTVL7d: 'Revenue / TVL (%, 7d basis)'
};

// ================= MAIN DASHBOARD COMPONENT =================

export default function DeFiDashboard() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const tableHeaderBg = useColorModeValue('gray.100', 'gray.700');
  
  const [loadedProtocols, setLoadedProtocols] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'desc' });
  
  // Column visibility state with localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('dashboardVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
      }
    }
    // Default: show all columns
    return Object.keys(COLUMN_DEFINITIONS).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
  });
  
  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem('dashboardVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  // Toggle column visibility
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };
  
  // Protocol visibility state with localStorage
  const [visibleProtocols, setVisibleProtocols] = useState(() => {
    const saved = localStorage.getItem('dashboardVisibleProtocols');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved protocol visibility:', e);
      }
    }
    // Default: show all protocols
    return protocols.reduce((acc, protocol) => {
      acc[protocol.ticker] = true;
      return acc;
    }, {});
  });
  
  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem('dashboardVisibleProtocols', JSON.stringify(visibleProtocols));
  }, [visibleProtocols]);
  
  // Toggle protocol visibility
  const toggleProtocol = (ticker) => {
    setVisibleProtocols(prev => ({
      ...prev,
      [ticker]: !prev[ticker]
    }));
  };

  // All market data hooks for sorting (only load after protocols are loaded)
  const allProtocolsLoaded = loadedProtocols.size === protocols.length;
  
  // Load market data for all protocols once they're all loaded for sorting
  const allCoinGeckoData = protocols.map(protocol => 
    useCoinGeckoComplete(protocol.coingeckoId, { enabled: allProtocolsLoaded })
  );
  const allDefiLlamaTVL = protocols.map(protocol => 
    useDefiLlamaTVL(protocol.defiLlamaSlug, { enabled: allProtocolsLoaded })
  );
  
  // Load revenue data for all protocols
  const allProtocolRevenue = protocols.map(protocol =>
    useProtocolRevenue(protocol.defiLlamaSlug, { enabled: allProtocolsLoaded })
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

  // Load OPEN Stablecoin Index price from CoinGecko (DeFiLlama doesn't have it)
  const OPEN_TOKEN_ADDRESS = '0x323c03c48660fe31186fa82c289b0766d331ce21';
  const OPEN_COINGECKO_ID = 'open-stablecoin-index';
  const openIndexPriceCG = useCoinGeckoMarketData(OPEN_COINGECKO_ID, { 
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1 minute - price changes frequently
    cacheTime: 3 * 60 * 1000 // 3 minutes
  });
  
  // Extract the price from CoinGecko market data
  const openIndexPrice = {
    data: openIndexPriceCG.data?.current_price || null,
    isLoading: openIndexPriceCG.isLoading,
    isError: openIndexPriceCG.isError,
    error: openIndexPriceCG.error
  };

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
  
  // Calculate theoretical price (NAV - Net Asset Value) and protocol weights
  // Formula: Total Value of Holdings / Total Supply
  // Weight = (Protocol Value / Total Value) * 100
  // 
  // Caching Strategy:
  // - Token balances: 2 min stale / 5 min cache (client) + 1 min (server)
  // - Token decimals: 24 hour stale / 7 day cache (never changes)
  // - Token prices: 1 min stale / 3 min cache (client) + 1 hour (server)
  // - Total supply: 5 min stale / 15 min cache (client) + 10 min (server)
  const { theoreticalPrice, protocolWeights } = useMemo(() => {
    if (!allProtocolsLoaded) return { theoreticalPrice: null, protocolWeights: {} };
    
    let totalValue = 0;
    let allDataLoaded = true;
    const weights = {};
    const protocolValues = {};
    
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
        protocolValues[protocol.ticker] = tokenValue;
        totalValue += tokenValue;
      }
    });
    
    if (!allDataLoaded || openTotalSupply.isLoading || openDecimals.isLoading) {
      return { theoreticalPrice: null, protocolWeights: {} };
    }
    
    // Calculate weights as percentages of total value
    if (totalValue > 0) {
      Object.keys(protocolValues).forEach(ticker => {
        weights[ticker] = (protocolValues[ticker] / totalValue) * 100;
      });
    }
    
    let price = null;
    if (openTotalSupply.data && openDecimals.data && openTotalSupply.data > 0) {
      const formattedSupply = openTotalSupply.data / Math.pow(10, openDecimals.data);
      price = totalValue / formattedSupply;
    }
    
    return { theoreticalPrice: price, protocolWeights: weights };
  }, [
    allProtocolsLoaded, 
    openHoldingsBalances, 
    openHoldingsDecimals, 
    allGovTokenPrices, 
    currentProtocolIndices,
    openTotalSupply,
    openDecimals,
    currentProtocols
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
      const tvlToFdv = fdv > 0 ? coinGeckoTVL / fdv : 0;
      const circToTotal = totalSupply > 0 ? circSupply / totalSupply : 0;
      const nextReleasePercentage = circSupply > 0 ? protocol.nextEmissions / circSupply : 0;
      
      // Get prices and weight for sorting
      const stablePrice = allStablePrices[index]?.data ? Number(allStablePrices[index].data) : 0;
      const govTokenPrice = allGovTokenPrices[index]?.data ? Number(allGovTokenPrices[index].data) : 0;
      const currentWeight = protocolWeights[protocol.ticker] || 0;
      
      // Get DEX data for sorting
      const curveTVL = allCurveTVL[index]?.data || 0;
      const curveVolume = allCurveVolume[index]?.data || 0;
      const uniswapTVL = allUniswapTVL[index]?.data || 0;
      const uniswapVolume = allUniswapVolume[index]?.data || 0;
      const balancerTVL = protocol.ticker === 'FRAX' 
        ? (fraxswapTVLForFrax?.data || 0)
        : (allBalancerTVL[index]?.data || 0);
      const balancerVolume = protocol.ticker === 'FRAX' 
        ? (fraxswapVolumeForFrax?.data || 0)
        : (allBalancerVolume[index]?.data || 0);
      const sushiTVL = allSushiTVL[index]?.data || 0;
      const sushiVolume = allSushiVolume[index]?.data || 0;
      
      const mainnetDexTVL = curveTVL + uniswapTVL + balancerTVL + sushiTVL;
      const dexVolume24h = curveVolume + uniswapVolume + balancerVolume + sushiVolume;
      const dexLiquidityTurnover = mainnetDexTVL > 0 ? dexVolume24h / mainnetDexTVL : 0;
      
      // Get revenue data
      const revenueData = allProtocolRevenue[index];
      const revenue24h = revenueData?.data?.total24h || 0;
      const revenue7d = revenueData?.data?.total7d ? revenueData.data.total7d / 7 : 0; // Convert to daily average
      const revenueAllTime = revenueData?.data?.totalAllTime || 0;
      const revenueAnnualized24h = revenue24h * 365;
      const revenueAnnualized7d = revenue7d * 365;
      
      // Calculate revenue ratios (both 24h and 7d basis)
      const revenueToMarketCap24h = marketCap > 0 ? revenueAnnualized24h / marketCap : 0;
      const revenueToTVL24h = protocolTVL > 0 ? revenueAnnualized24h / protocolTVL : 0;
      const revenueToMarketCap7d = marketCap > 0 ? revenueAnnualized7d / marketCap : 0;
      const revenueToTVL7d = protocolTVL > 0 ? revenueAnnualized7d / protocolTVL : 0;
      
      return {
        ...protocol,
        originalIndex: index,
        sortValues: {
          protocol: protocol.ticker,
          status: protocol.openStatus,
          years: yearsOnChain,
          stablePrice,
          govTokenPrice,
          currentWeight,
          marketCap,
          fdv,
          volume24h,
          volume30d,
          tvlCG: coinGeckoTVL,
          mcToFdv,
          mcToTvl,
          tvlToFdv,
          maxSupply,
          totalSupply,
          circSupply,
          circToTotal,
          curveTVL,
          curveVolume,
          uniswapTVL,
          uniswapVolume,
          balancerTVL,
          balancerVolume,
          sushiTVL,
          sushiVolume,
          mainnetDexTVL,
          dexVolume24h,
          dexLiquidityTurnover,
          nextEmissions: protocol.nextEmissions,
          nextReleasePercentage,
          protocolTVL,
          revenue24h,
          revenue7d,
          revenueAllTime,
          revenueAnnualized24h,
          revenueAnnualized7d,
          revenueToMarketCap24h,
          revenueToTVL24h,
          revenueToMarketCap7d,
          revenueToTVL7d
        }
      };
    });
  }, [allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allAlcxDeadBalances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax, allStablePrices, allGovTokenPrices, protocolWeights, allCurveTVL, allCurveVolume, allUniswapTVL, allUniswapVolume, allBalancerTVL, allBalancerVolume, allSushiTVL, allSushiVolume, allProtocolRevenue]);

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

  // Filter protocols based on visibility
  const filteredProtocols = useMemo(() => {
    return sortedProtocols.filter(protocol => visibleProtocols[protocol.ticker]);
  }, [sortedProtocols, visibleProtocols]);

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
      allGovTokenPrices,
      allProtocolRevenue
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
      pt={{ base: 1, sm: 2, md: 3 }}
      pb={{ base: 4, sm: 6, md: 8 }}
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
                    {openIndexPrice.isLoading ? 'Loading...' : 
                     openIndexPrice.isError ? 'Error' :
                     openIndexPrice.data ? `$${Number(openIndexPrice.data).toFixed(4)}` : 'N/A'}
                  </Text>
                  <Badge colorScheme={openIndexPrice.data ? "blue" : "gray"} fontSize="xs">
                    {openIndexPrice.data ? 'Live' : 'Unavailable'}
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

        <HStack spacing={2}>
          <ProtocolFilter
            visibleProtocols={visibleProtocols}
            onToggleProtocol={toggleProtocol}
            protocols={protocols}
          />
          <ColumnVisibilityMenu
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            columnDefinitions={COLUMN_DEFINITIONS}
          />
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
        </HStack>
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
              {visibleColumns.protocol && (
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
              )}
              {visibleColumns.links && (
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
              )}
              {visibleColumns.blockchain && (
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
              )}
              {visibleColumns.mainnetLaunch && (
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
              )}
              {visibleColumns.years && (
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
              )}
              {visibleColumns.status && (
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
              )}
              {visibleColumns.stablePrice && (
                <SortableHeader 
                  column="stablePrice" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  onReset={handleReset} 
                  dataSource="DeFiLlama API" 
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                >
                  Stable Price
                </SortableHeader>
              )}
              {visibleColumns.govTokenPrice && (
                <SortableHeader 
                  column="govTokenPrice" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  onReset={handleReset} 
                  dataSource="DeFiLlama API" 
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                >
                  Gov Token Price
                </SortableHeader>
              )}
              {visibleColumns.currentWeight && (
                <SortableHeader 
                  column="currentWeight" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  onReset={handleReset} 
                  dataSource="calc" 
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  maxW={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                  w={{ base: "80px", sm: "90px", md: "100px", lg: "110px" }}
                >
                  Current Weight %
                </SortableHeader>
              )}
              
              {/* Market Metrics */}
              {visibleColumns.marketCap && (
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
              )}
              {visibleColumns.fdv && (
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
              )}
              {visibleColumns.volume24h && (
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
              )}
              {visibleColumns.volume30d && (
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
              )}
              {visibleColumns.tvlCG && (
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
              )}
              
              {/* Ratios */}
              {visibleColumns.mcToFdv && (
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
              )}
              {visibleColumns.mcToTvl && (
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
              )}
              {visibleColumns.tvlToFdv && (
                <SortableHeader 
                  column="tvlToFdv" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  onReset={handleReset} 
                  dataSource="calc" 
                  fontSize="xs"
                  minW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                  maxW={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                  w={{ base: "80px", sm: "90px", md: "105px", lg: "115px" }}
                >
                  TVL / FDV (%)
                </SortableHeader>
              )}
              
              {/* Supply */}
              {visibleColumns.maxSupply && (
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
              )}
              {visibleColumns.totalSupply && (
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
              )}
              {visibleColumns.circSupply && (
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
              )}
              {visibleColumns.circToTotal && (
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
              )}
              
              {/* Exchanges */}
              {visibleColumns.topExchanges && (
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
              )}
              
              {/* DEX Data */}
              {visibleColumns.curveTVL && (
                <SortableHeader 
                  column="curveTVL"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Curve API"
                  fontSize={{ base: "2xs", sm: "xs" }} 
                  color="red.600"
                  textAlign="center"
                  minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                  maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                  w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                >
                  Curve TVL
                </SortableHeader>
              )}
              {visibleColumns.curveVolume && (
                <SortableHeader 
                  column="curveVolume"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Curve API"
                  fontSize="xs" 
                  color="red.600"
                  textAlign="center"
                  minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                >
                  Curve 24hr Vol
                </SortableHeader>
              )}
              {visibleColumns.uniswapTVL && (
                <SortableHeader 
                  column="uniswapTVL"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Uniswap Subgraph"
                  fontSize="xs" 
                  color="orange.600"
                  textAlign="center"
                  minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                >
                  Uniswap TVL
                </SortableHeader>
              )}
              {visibleColumns.uniswapVolume && (
                <SortableHeader 
                  column="uniswapVolume"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Uniswap Subgraph"
                  fontSize="xs" 
                  color="orange.600"
                  textAlign="center"
                  minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                >
                  Uniswap 24hr Vol
                </SortableHeader>
              )}
              {visibleColumns.balancerTVL && (
                <SortableHeader 
                  column="balancerTVL"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Balancer & Fraxswap Subgraph"
                  fontSize="xs" 
                  color="green.600"
                  textAlign="center"
                  minW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  maxW={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                  w={{ base: "65px", sm: "75px", md: "90px", lg: "100px" }}
                >
                  Balancer TVL
                </SortableHeader>
              )}
              {visibleColumns.balancerVolume && (
                <SortableHeader 
                  column="balancerVolume"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Balancer & Fraxswap Subgraph"
                  fontSize="xs" 
                  color="green.600"
                  textAlign="center"
                  minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                >
                  Balancer 24hr Vol
                </SortableHeader>
              )}
              {visibleColumns.sushiTVL && (
                <SortableHeader 
                  column="sushiTVL"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Sushiswap Subgraph"
                  fontSize="xs" 
                  color="purple.600"
                  textAlign="center"
                  minW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                  maxW={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                  w={{ base: "60px", sm: "65px", md: "75px", lg: "85px" }}
                >
                  Sushi TVL
                </SortableHeader>
              )}
              {visibleColumns.sushiVolume && (
                <SortableHeader 
                  column="sushiVolume"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="Sushiswap Subgraph"
                  fontSize="xs" 
                  color="purple.600"
                  textAlign="center"
                  minW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
                  maxW={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
                  w={{ base: "75px", sm: "85px", md: "95px", lg: "105px" }}
                >
                  Sushi 24hr Vol
                </SortableHeader>
              )}
              {visibleColumns.mainnetDexTVL && (
                <SortableHeader 
                  column="mainnetDexTVL"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  fontSize="xs" 
                  color="blue.600" 
                  fontWeight="bold"
                  textAlign="center"
                  minW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  maxW={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                  w={{ base: "75px", sm: "85px", md: "100px", lg: "110px" }}
                >
                  Mainnet DEX TVL
                </SortableHeader>
              )}
              {visibleColumns.dexVolume24h && (
                <SortableHeader 
                  column="dexVolume24h"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  fontSize="xs" 
                  color="blue.600"
                  textAlign="center"
                  minW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                  maxW={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                  w={{ base: "75px", sm: "90px", md: "105px", lg: "120px" }}
                >
                  24hr DEX volume
                </SortableHeader>
              )}
              {visibleColumns.dexLiquidityTurnover && (
                <SortableHeader 
                  column="dexLiquidityTurnover"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                  maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                  w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                >
                  DEX Liquidity Turnover
                </SortableHeader>
              )}
              
              {/* Emissions */}
              {visibleColumns.nextEmissions && (
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
              )}
              {visibleColumns.nextReleasePercentage && (
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
              )}
              {visibleColumns.emissionsCatalyst && (
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
              )}
              
              {/* Protocol TVL */}
              {visibleColumns.protocolTVL && (
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
              )}
              
              {/* Revenue */}
              {visibleColumns.revenue24h && (
                <SortableHeader 
                  column="revenue24h"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="DeFiLlama API"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                  maxW={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                  w={{ base: "80px", sm: "95px", md: "110px", lg: "120px" }}
                >
                  Revenue (24h)
                </SortableHeader>
              )}
              {visibleColumns.revenue7d && (
                <SortableHeader 
                  column="revenue7d"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="DeFiLlama API"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "90px", sm: "105px", md: "120px", lg: "130px" }}
                  maxW={{ base: "90px", sm: "105px", md: "120px", lg: "130px" }}
                  w={{ base: "90px", sm: "105px", md: "120px", lg: "130px" }}
                >
                  Revenue (7d avg)
                </SortableHeader>
              )}
              {visibleColumns.revenueAllTime && (
                <SortableHeader 
                  column="revenueAllTime"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="DeFiLlama API"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "95px", sm: "110px", md: "125px", lg: "140px" }}
                  maxW={{ base: "95px", sm: "110px", md: "125px", lg: "140px" }}
                  w={{ base: "95px", sm: "110px", md: "125px", lg: "140px" }}
                >
                  Revenue (All Time)
                </SortableHeader>
              )}
              {visibleColumns.revenueAnnualized24h && (
                <SortableHeader 
                  column="revenueAnnualized24h"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  color="green.600"
                  fontWeight="bold"
                  minW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  maxW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  w={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                >
                  Revenue (Annualized from 24h)
                </SortableHeader>
              )}
              {visibleColumns.revenueAnnualized7d && (
                <SortableHeader 
                  column="revenueAnnualized7d"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  color="green.600"
                  fontWeight="bold"
                  minW={{ base: "110px", sm: "125px", md: "140px", lg: "155px" }}
                  maxW={{ base: "110px", sm: "125px", md: "140px", lg: "155px" }}
                  w={{ base: "110px", sm: "125px", md: "140px", lg: "155px" }}
                >
                  Revenue (Annualized from 7d avg)
                </SortableHeader>
              )}
              {visibleColumns.revenueToMarketCap24h && (
                <SortableHeader 
                  column="revenueToMarketCap24h"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  maxW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  w={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                >
                  Revenue / Market Cap (%, 24h basis)
                </SortableHeader>
              )}
              {visibleColumns.revenueToTVL24h && (
                <SortableHeader 
                  column="revenueToTVL24h"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  maxW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  w={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                >
                  Revenue / TVL (%, 24h basis)
                </SortableHeader>
              )}
              {visibleColumns.revenueToMarketCap7d && (
                <SortableHeader 
                  column="revenueToMarketCap7d"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  maxW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  w={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                >
                  Revenue / Market Cap (%, 7d basis)
                </SortableHeader>
              )}
              {visibleColumns.revenueToTVL7d && (
                <SortableHeader 
                  column="revenueToTVL7d"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  onReset={handleReset}
                  dataSource="calc"
                  disclaimer="Revenue figures primarily include protocol fees and may not capture all income streams (e.g., off-chain revenue, token emissions value)"
                  fontSize="xs"
                  textAlign="center"
                  minW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  maxW={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                  w={{ base: "100px", sm: "115px", md: "130px", lg: "145px" }}
                >
                  Revenue / TVL (%, 7d basis)
                </SortableHeader>
              )}
            </Tr>
          </Thead>
          <Tbody>
            {filteredProtocols.map((protocol) => (
              <ProtocolRow
                key={protocol.ticker}
                protocol={protocol}
                shouldLoad={loadedProtocols.has(protocol.originalIndex)}
                currentWeight={protocolWeights[protocol.ticker]}
                visibleColumns={visibleColumns}
              />
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}