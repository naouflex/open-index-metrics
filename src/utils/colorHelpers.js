// ================= COLOR SCALE HELPER =================

export function getColorForMetric(value, metricType, colorMode = 'light') {
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
    
    case 'tvlToMc': // Higher is better (more TVL backing)
      return getColorScale(value, { low: 50, medium: 100, high: 200 }, false);
    
    case 'tvlToFdv': // Higher is better (more TVL relative to valuation) 
      return getColorScale(value, { low: 20, medium: 50, high: 100 }, false);
    
    case 'circToTotal': // Higher is better (more circulating)
      return getColorScale(value, { low: 30, medium: 60, high: 85 }, false);
    
    case 'liquidityTurnover': // Higher is better (more active)
      return getColorScale(value, { low: 0.5, medium: 1.5, high: 3 }, false);
    
    case 'nextReleasePercentage': // Lower is better (less dilution)
      return getColorScale(value, { low: 5, medium: 15, high: 30 }, true);
    
    case 'tvlGrowth12m': // Higher is better (growth)
      // For 12-month TVL growth: <0% is bad, 0-50% is ok, 50-100% is good, >100% is excellent
      if (value < 0) {
        return colorMode === 'light' ? 'red.600' : 'red.400';
      }
      return getColorScale(value, { low: 20, medium: 50, high: 100 }, false);
    
    case 'tvlGrowthMonthlyAvg': // Higher is better (monthly growth rate)
      // For monthly average: <0% is bad, 0-3% is ok, 3-7% is good, >7% is excellent
      if (value < 0) {
        return colorMode === 'light' ? 'red.600' : 'red.400';
      }
      return getColorScale(value, { low: 2, medium: 5, high: 10 }, false);
    
    case 'revenueToMarketCap': // Higher is better (revenue yield)
      // For revenue/MC: <5% is low, 5-15% is ok, 15-30% is good, >30% is excellent
      return getColorScale(value, { low: 5, medium: 15, high: 30 }, false);
    
    case 'revenueToTVL': // Higher is better (capital efficiency)
      // For revenue/TVL: <2% is low, 2-5% is ok, 5-10% is good, >10% is excellent
      return getColorScale(value, { low: 2, medium: 5, high: 10 }, false);
    
    default:
      return 'gray.600';
  }
} 