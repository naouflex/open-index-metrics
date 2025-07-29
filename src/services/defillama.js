import axios from 'axios';

// ================= DEFILLAMA SERVICE =================

/**
 * Fetch DeFiLlama TVL for a specific protocol using its slug
 * @param {string} protocolSlug - The DeFiLlama protocol slug (e.g., "curve-dex", "uniswap")
 * @returns {Promise<number>} - Total Value Locked in USD
 */
export async function fetchDefiLlamaTVLDirect(protocolSlug) {
  try {
    const tvlUrl = `https://api.llama.fi/protocol/${protocolSlug}`;
    const response = await axios.get(tvlUrl);
    const tvlData = response.data;
    
    // Get the current TVL from the latest entry in the historical data
    if (tvlData.tvl && Array.isArray(tvlData.tvl) && tvlData.tvl.length > 0) {
      // Get the latest TVL entry
      const latestTvl = tvlData.tvl[tvlData.tvl.length - 1];
      return latestTvl.totalLiquidityUSD || 0;
    }
    
    // Fallback to the current TVL if available (some protocols return a number directly)
    if (typeof tvlData.tvl === 'number') {
      return tvlData.tvl;
    }
    
    // Final fallback to currentChainTvls if available
    if (tvlData.currentChainTvls && tvlData.currentChainTvls.Ethereum) {
      return tvlData.currentChainTvls.Ethereum;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching DeFiLlama TVL for ${protocolSlug}:`, error.message);
    return 0;
  }
}

/**
 * Get token price from DeFiLlama
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Blockchain (defaults to 'ethereum')
 * @returns {Promise<number|null>} - Price in USD
 */
export async function getTokenPrice(tokenAddress, chain = 'ethereum') {
  try {
    const url = `https://coins.llama.fi/prices/current/${chain}:${tokenAddress.toLowerCase()}`;
    const response = await axios.get(url);
    const data = response.data;
    
    const key = `${chain}:${tokenAddress.toLowerCase()}`;
    if (data.coins && data.coins[key] && data.coins[key].price) {
      return data.coins[key].price;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching price for token ${tokenAddress}:`, error.message);
    return null;
  }
}

/**
 * Get multiple token prices in a single request (more efficient for multiple tokens)
 * @param {string[]} tokenAddresses - Array of token contract addresses
 * @param {string} chain - Blockchain (defaults to 'ethereum')
 * @returns {Promise<object>} - Object mapping token addresses to prices
 */
export async function getMultipleTokenPrices(tokenAddresses, chain = 'ethereum') {
  try {
    // Format tokens for the API
    const formattedTokens = tokenAddresses.map(addr => `${chain}:${addr.toLowerCase()}`);
    const tokensParam = formattedTokens.join(',');
    
    const url = `https://coins.llama.fi/prices/current/${tokensParam}`;
    const response = await axios.get(url);
    const data = response.data;
    
    // Map back to original addresses
    const priceMap = {};
    tokenAddresses.forEach(address => {
      const key = `${chain}:${address.toLowerCase()}`;
      if (data.coins && data.coins[key] && data.coins[key].price) {
        priceMap[address.toLowerCase()] = data.coins[key].price;
      } else {
        priceMap[address.toLowerCase()] = null;
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error fetching multiple token prices:', error.message);
    return {};
  }
}

/**
 * Get protocol information including TVL and other metadata
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @returns {Promise<object>} - Protocol information object
 */
export async function getProtocolInfo(protocolSlug) {
  try {
    const url = `https://api.llama.fi/protocol/${protocolSlug}`;
    const response = await axios.get(url);
    
    return {
      name: response.data.name,
      symbol: response.data.symbol,
      url: response.data.url,
      description: response.data.description,
      chain: response.data.chain,
      logo: response.data.logo,
      audits: response.data.audits,
      audit_note: response.data.audit_note,
      gecko_id: response.data.gecko_id,
      cmcId: response.data.cmcId,
      category: response.data.category,
      chains: response.data.chains,
      module: response.data.module,
      twitter: response.data.twitter,
      forkedFrom: response.data.forkedFrom,
      oracles: response.data.oracles,
      listedAt: response.data.listedAt,
      methodology: response.data.methodology,
      currentChainTvls: response.data.currentChainTvls,
      chainTvls: response.data.chainTvls,
      tvl: response.data.tvl
    };
  } catch (error) {
    console.error(`Error fetching protocol info for ${protocolSlug}:`, error.message);
    return null;
  }
}

/**
 * Get all protocols from DeFiLlama
 * @returns {Promise<Array>} - Array of all protocols
 */
export async function getAllProtocols() {
  try {
    const url = 'https://api.llama.fi/protocols';
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching all protocols:', error.message);
    return [];
  }
}

/**
 * Get historical TVL data for a protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @returns {Promise<Array>} - Array of historical TVL data points
 */
export async function getProtocolTVLHistory(protocolSlug) {
  try {
    const url = `https://api.llama.fi/protocol/${protocolSlug}`;
    const response = await axios.get(url);
    
    if (response.data.tvl && Array.isArray(response.data.tvl)) {
      return response.data.tvl.map(entry => ({
        date: new Date(entry.date * 1000),
        timestamp: entry.date,
        tvl: entry.totalLiquidityUSD
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching TVL history for ${protocolSlug}:`, error.message);
    return [];
  }
}

/**
 * Get current TVL across all chains for a protocol
 * @param {string} protocolSlug - The DeFiLlama protocol slug
 * @returns {Promise<object>} - Object mapping chain names to TVL values
 */
export async function getProtocolTVLByChain(protocolSlug) {
  try {
    const url = `https://api.llama.fi/protocol/${protocolSlug}`;
    const response = await axios.get(url);
    
    return response.data.currentChainTvls || {};
  } catch (error) {
    console.error(`Error fetching TVL by chain for ${protocolSlug}:`, error.message);
    return {};
  }
} 