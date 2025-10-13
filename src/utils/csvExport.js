import { calculateYearsOnChain } from '../config/protocols.js';

// ================= CSV EXPORT FUNCTION =================

export function exportToCSV(protocols, allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allAlcxDeadBalances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax, allCurveTVL, allCurveVolume, allUniswapTVL, allUniswapVolume, allBalancerTVL, allBalancerVolume, allSushiTVL, allSushiVolume, allStablePrices, allGovTokenPrices, allProtocolRevenue, allProtocolInfo) {
  const headers = [
    'Protocol',
    'Name',
    'Blockchain',
    'Mainnet Launch',
    'Years Onchain',
    'OPEN Status',
    'Stable Name',
    'Stable Price',
    'Gov Token Price',
    'Current Weight %',
    'Market Cap',
    'FDV',
    'Volume 24h',
    'Volume 30d Avg',
    'TVL',
    'Market Cap / FDV (%)',
    'TVL / Market Cap (%)',
    'TVL / FDV (%)',
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
    'Protocol TVL',
    'TVL Growth (12m %)',
    'Avg Monthly TVL Growth %',
    'Revenue (24h)',
    'Revenue (7d avg)',
    'Revenue (All Time)',
    'Revenue (Annualized from 24h)',
    'Revenue (Annualized from 7d avg)',
    'Revenue / Market Cap (%, 24h basis)',
    'Revenue / TVL (%, 24h basis)',
    'Revenue / Market Cap (%, 7d basis)',
    'Revenue / TVL (%, 7d basis)'
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
    const tvlToMc = marketCap > 0 ? (coinGeckoTVL / marketCap) * 100 : 0;
    const tvlToFdv = fdv > 0 ? (coinGeckoTVL / fdv) * 100 : 0;
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

    // Get stable and gov token prices
    const stablePrice = allStablePrices[index]?.data ? Number(allStablePrices[index].data) : null;
    const govTokenPrice = allGovTokenPrices[index]?.data ? Number(allGovTokenPrices[index].data) : null;
    
    // Current weight is only calculated for 'current' protocols
    const currentWeight = protocol.openStatus === 'current' ? protocol.sortValues?.currentWeight || 0 : 0;

    // Get revenue data
    const revenueData = allProtocolRevenue[index];
    const revenue24h = revenueData?.data?.total24h || 0;
    const revenue7d = revenueData?.data?.total7d ? revenueData.data.total7d / 7 : 0;
    const revenueAllTime = revenueData?.data?.totalAllTime || 0;
    const revenueAnnualized24h = revenue24h * 365;
    const revenueAnnualized7d = revenue7d * 365;
    
    // Calculate 12-month TVL growth and average monthly growth rate
    const protocolInfoData = allProtocolInfo[index];
    let tvlGrowth12m = 0;
    let tvlGrowthMonthlyAvg = 0;
    
    if (protocolInfoData?.data?.tvl && Array.isArray(protocolInfoData.data.tvl) && protocolTVL > 0) {
      const tvlHistory = protocolInfoData.data.tvl;
      
      if (tvlHistory.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        const twelveMonthsAgo = now - (365 * 24 * 60 * 60);
        
        let closestTvlPoint = null;
        let closestTimeDiff = Infinity;
        
        for (const point of tvlHistory) {
          const timeDiff = Math.abs(point.date - twelveMonthsAgo);
          if (timeDiff < closestTimeDiff) {
            closestTimeDiff = timeDiff;
            closestTvlPoint = point;
          }
        }
        
        if (closestTvlPoint && closestTvlPoint.totalLiquidityUSD > 0) {
          tvlGrowth12m = ((protocolTVL - closestTvlPoint.totalLiquidityUSD) / closestTvlPoint.totalLiquidityUSD) * 100;
          
          // Calculate average monthly growth rate over the last 12 months
          // Compound monthly growth rate: ((Current/12MonthsAgo)^(1/12) - 1) * 100
          tvlGrowthMonthlyAvg = (Math.pow(protocolTVL / closestTvlPoint.totalLiquidityUSD, 1 / 12) - 1) * 100;
        }
      }
    }
    
    // Calculate revenue ratios (both 24h and 7d basis)
    const revenueToMarketCap24h = marketCap > 0 ? (revenueAnnualized24h / marketCap) * 100 : 0;
    const revenueToTVL24h = protocolTVL > 0 ? (revenueAnnualized24h / protocolTVL) * 100 : 0;
    const revenueToMarketCap7d = marketCap > 0 ? (revenueAnnualized7d / marketCap) * 100 : 0;
    const revenueToTVL7d = protocolTVL > 0 ? (revenueAnnualized7d / protocolTVL) * 100 : 0;

    const row = [
      protocol.ticker,
      protocol.name,
      protocol.blockchain?.toUpperCase() || '',
      protocol.mainnetLaunch,
      `${yearsOnChain}y`,
      protocol.openStatus,
      protocol.stableName || 'N/A',
      stablePrice ? stablePrice.toFixed(4) : 'N/A',
      govTokenPrice ? govTokenPrice.toFixed(4) : 'N/A',
      protocol.openStatus === 'current' ? currentWeight.toFixed(2) : 'N/A',
      marketCap,
      fdv,
      volume24h,
      volume30d,
      coinGeckoTVL,
      mcToFdv.toFixed(2),
      tvlToMc.toFixed(2),
      tvlToFdv.toFixed(2),
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
      protocolTVL,
      tvlGrowth12m !== 0 ? tvlGrowth12m.toFixed(1) : 'N/A',
      tvlGrowthMonthlyAvg !== 0 ? tvlGrowthMonthlyAvg.toFixed(2) : 'N/A',
      revenue24h,
      revenue7d,
      revenueAllTime,
      revenueAnnualized24h,
      revenueAnnualized7d,
      revenueToMarketCap24h.toFixed(2),
      revenueToTVL24h.toFixed(2),
      revenueToMarketCap7d.toFixed(2),
      revenueToTVL7d.toFixed(2)
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