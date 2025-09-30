import { calculateYearsOnChain } from '../config/protocols.js';

// ================= CSV EXPORT FUNCTION =================

export function exportToCSV(protocols, allCoinGeckoData, allDefiLlamaTVL, allFxnHolderBalances, allInvToken1Balances, allInvToken2Balances, allAlcxDeadBalances, allFraxswapTVLForFrax, allFraxswapVolumeForFrax, allCurveTVL, allCurveVolume, allUniswapTVL, allUniswapVolume, allBalancerTVL, allBalancerVolume, allSushiTVL, allSushiVolume, allStablePrices, allGovTokenPrices) {
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
    const circSupply = protocol.ticker === 'FXN'
      ? ((coinGeckoData?.marketData?.data?.circulating_supply || 0) + (fxnHolderBalance?.data?.balance || 0))
      : (coinGeckoData?.marketData?.data?.circulating_supply || 0);
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

    // Get stable and gov token prices
    const stablePrice = allStablePrices[index]?.data ? Number(allStablePrices[index].data) : null;
    const govTokenPrice = allGovTokenPrices[index]?.data ? Number(allGovTokenPrices[index].data) : null;
    
    // Current weight is only calculated for 'current' protocols
    const currentWeight = protocol.openStatus === 'current' ? protocol.sortValues?.currentWeight || 0 : 0;

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