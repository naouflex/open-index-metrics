import { CurveFetcher } from './cache-service/services/curve-fetcher.js';

async function testCurve() {
  console.log('Testing Curve API fetcher...');
  
  const curveFetcher = new CurveFetcher();
  
  // Test with USDC - this should definitely have TVL and volume in Curve
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  
  console.log(`\nTesting with USDC: ${usdcAddress}`);
  
  try {
    // Test TVL
    console.log('\n=== Testing TVL ===');
    const tvlResult = await curveFetcher.fetchData('token_tvl', { tokenAddress: usdcAddress });
    console.log('TVL Result:', JSON.stringify(tvlResult, null, 2));
    
    // Test Volume
    console.log('\n=== Testing Volume ===');
    const volumeResult = await curveFetcher.fetchData('token_volume', { tokenAddress: usdcAddress });
    console.log('Volume Result:', JSON.stringify(volumeResult, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCurve(); 