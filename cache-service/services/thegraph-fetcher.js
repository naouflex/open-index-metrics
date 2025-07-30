import axios from 'axios';

export class TheGraphFetcher {
  constructor() {
    this.apiKey = process.env.THE_GRAPH_API_KEY;
    this.baseUrl = 'https://gateway.thegraph.com/api';
    
    // Subgraph IDs - these should match your environment variables
    this.subgraphs = {
      uniswap_v3: process.env.UNISWAP_V3_SUBGRAPH_ID,
      uniswap_v2: process.env.UNISWAP_V2_SUBGRAPH_ID,
      sushi_v3: process.env.SUSHI_SUBGRAPH_ID,
      sushi_v2: process.env.SUSHI_V2_SUBGRAPH_ID,
      fraxswap: process.env.FRAXSWAP_SUBGRAPH_ID,
      balancer: process.env.BALANCER_V2_SUBGRAPH_ID
    };
  }

  getSubgraphUrl(subgraphId) {
    if (!this.apiKey) {
      throw new Error('THE_GRAPH_API_KEY environment variable is required');
    }
    return `${this.baseUrl}/${this.apiKey}/subgraphs/id/${subgraphId}`;
  }

  async fetchData(protocol, queryType, params = {}) {
    try {
      const subgraphId = this.subgraphs[protocol];

      const url = this.getSubgraphUrl(subgraphId);
      const query = this.buildQuery(protocol, queryType, params);
      
      console.log(`Fetching ${protocol} ${queryType} data from The Graph`);
      
      const response = await axios.post(url, {
        query: query
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });


      // Process data according to the working approach
      const processedData = this.processResponseData(protocol, queryType, response.data.data);

      return {
        protocol,
        queryType,
        data: processedData,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching ${protocol} ${queryType} data:`, error.message);
    }
  }

  processResponseData(protocol, queryType, data) {
    // Handle volume queries that need aggregation
    if (queryType === 'token_volume') {
      switch (protocol) {
        case 'uniswap_v3':
          // Sum up swaps and swaps1 arrays like working code
          let uniswapV3Volume = 0;
          if (data.swaps) {
            for (let i = 0; i < data.swaps.length; i++) {
              uniswapV3Volume += Number(data.swaps[i].amountUSD || 0);
            }
          }
          if (data.swaps1) {
            for (let i = 0; i < data.swaps1.length; i++) {
              uniswapV3Volume += Number(data.swaps1[i].amountUSD || 0);
            }
          }
          return uniswapV3Volume;
        
        case 'uniswap_v2':
          // Sum up swaps and swaps1 arrays like working code
          let uniswapV2Volume = 0;
          if (data.swaps) {
            for (let i = 0; i < data.swaps.length; i++) {
              uniswapV2Volume += Number(data.swaps[i].amountUSD || 0);
            }
          }
          if (data.swaps1) {
            for (let i = 0; i < data.swaps1.length; i++) {
              uniswapV2Volume += Number(data.swaps1[i].amountUSD || 0);
            }
          }
          return uniswapV2Volume;
        
        case 'sushi_v3':
          // Return volumeUSD directly from token
          return data.token ? Number(data.token.volumeUSD || 0) : 0;
        
        case 'sushi_v2':
          // Sum up swaps and swaps1 arrays like working code
          let sushiV2Volume = 0;
          if (data.swaps) {
            for (let i = 0; i < data.swaps.length; i++) {
              sushiV2Volume += Number(data.swaps[i].amountUSD || 0);
            }
          }
          if (data.swaps1) {
            for (let i = 0; i < data.swaps1.length; i++) {
              sushiV2Volume += Number(data.swaps1[i].amountUSD || 0);
            }
          }
          return sushiV2Volume;
        
        case 'fraxswap':
          // Sum up swaps array like working code
          let fraxswapVolume = 0;
          if (data.swaps) {
            for (let i = 0; i < data.swaps.length; i++) {
              fraxswapVolume += Number(data.swaps[i].amountUSD || 0);
            }
          }
          return fraxswapVolume;
        
        case 'balancer':
          // Sum up swaps and swaps1 arrays like working code
          let balancerVolume = 0;
          if (data.swaps) {
            for (let i = 0; i < data.swaps.length; i++) {
              balancerVolume += Number(data.swaps[i].valueUSD || 0);
            }
          }
          if (data.swaps1) {
            for (let i = 0; i < data.swaps1.length; i++) {
              balancerVolume += Number(data.swaps1[i].valueUSD || 0);
            }
          }
          return balancerVolume;
        
        default:
          return data;
      }
    }
    
    // Handle TVL queries that need aggregation
    if (queryType === 'token_tvl') {
      switch (protocol) {
        case 'sushi_v2':
          // Sum up pairs and pairs1 arrays like working code
          let sushiV2TVL = 0;
          if (data.pairs) {
            for (let i = 0; i < data.pairs.length; i++) {
              sushiV2TVL += Number(data.pairs[i].reserveUSD || 0);
            }
          }
          if (data.pairs1) {
            for (let i = 0; i < data.pairs1.length; i++) {
              sushiV2TVL += Number(data.pairs1[i].reserveUSD || 0);
            }
          }
          return sushiV2TVL;
        
        case 'fraxswap':
          // Sum up pairs array like working code
          let fraxswapTVL = 0;
          if (data.pairs) {
            for (let i = 0; i < data.pairs.length; i++) {
              fraxswapTVL += Number(data.pairs[i].reserveUSD || 0);
            }
          }
          return fraxswapTVL;
        
        case 'balancer':
          // Return totalBalanceUSD directly from token
          return data.token ? Number(data.token.totalBalanceUSD || 0) : 0;
        
        case 'sushi_v3':
          // Return totalValueLockedUSD directly from token
          return data.token ? Number(data.token.totalValueLockedUSD || 0) : 0;
        
        default:
          return data;
      }
    }
    
    // For all other cases, return data as-is
    return data;
  }

  buildQuery(protocol, queryType, params) {
    const { tokenAddress, poolAddress, first = 100 } = params;

    switch (queryType) {
      case 'token_tvl':
        return this.buildTokenTVLQuery(protocol, tokenAddress);
      
      case 'token_volume':
        return this.buildTokenVolumeQuery(protocol, tokenAddress);
      
      case 'pool_data':
        return this.buildPoolDataQuery(protocol, poolAddress);
      
      case 'token_pairs':
        return this.buildTokenPairsQuery(protocol, tokenAddress, first);
      
      case 'all_pools':
        return this.buildAllPoolsQuery(protocol, first);
      
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  buildTokenTVLQuery(protocol, tokenAddress) {
    const address = tokenAddress?.toLowerCase();
    
    switch (protocol) {
      case 'uniswap_v3':
        return `{
          token(id: "${address}") {
            id
            symbol
            name
            totalValueLockedUSD
            totalValueLocked
          }
        }`;
      
      case 'uniswap_v2':
        return `{
          pairs(where: {or: [
            {token0: "${address}"},
            {token1: "${address}"}
          ]}) {
            id
            reserveUSD
            totalSupply
          }
        }`;
      
      case 'sushi_v2':
        return `{
          pairs(where: {token0: "${address}"}) {
            reserveUSD
          }
          pairs1: pairs(where: {token1: "${address}"}) {
            reserveUSD
          }
        }`;
      
      case 'sushi_v3':
        return `{
          token(id: "${address}") {
            id
            symbol
            name
            totalValueLockedUSD
            totalValueLocked
          }
        }`;
      
      case 'curve':
        return `{
          pools(where: {coins_contains: ["${address}"]}) {
            id
            name
            totalValueLockedUSD
          }
        }`;
      
      case 'fraxswap':
        return `{
          pairs(where: {or: [
            {token0: "${address}"},
            {token1: "${address}"}
          ]}) {
            id
            reserveUSD
          }
        }`;
      
      case 'balancer':
        return `{
          token(id: "${address}") {
            totalBalanceUSD
          }
        }`;
      
      default:
        throw new Error(`TVL query not implemented for ${protocol}`);
    }
  }

  buildTokenVolumeQuery(protocol, tokenAddress) {
    const address = tokenAddress?.toLowerCase();
    const dayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    
    switch (protocol) {
      case 'uniswap_v3':
        return `{
          swaps(
            where: {
              token0: "${address}"
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
          swaps1: swaps(
            where: {
              token1: "${address}"
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
        }`;
      
      case 'uniswap_v2':
        return `{
          swaps(
            where: {
              pair_: { token0: "${address}" }
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
          swaps1: swaps(
            where: {
              pair_: { token1: "${address}" }
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
        }`;
      
      case 'sushi_v3':
        return `{
          token(id: "${address}") {
            volumeUSD
          }
        }`;
      
      case 'sushi_v2':
        return `{
          swaps(
            where: {
              pair_: { token0: "${address}" }
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
          swaps1: swaps(
            where: {
              pair_: { token1: "${address}" }
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
        }`;
      
      case 'curve':
        return `{
          pools(where: {coins_contains: ["${address}"]}) {
            id
            name
            volumeUSD
          }
        }`;
      
      case 'fraxswap':
        return `{
          swaps(
            where: {
              pair_: { 
                or: [
                  { token0: "${address}" },
                  { token1: "${address}" }
                ]
              }
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            amountUSD
          }
        }`;
      
      case 'balancer':
        return `{
          swaps(
            where: {
              tokenIn: "${address}"
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            valueUSD
          }
          swaps1: swaps(
            where: {
              tokenOut: "${address}"
              timestamp_gte: ${dayAgo}
            }
            first: 1000
          ) {
            valueUSD
          }
        }`;
      
      default:
        return this.buildTokenTVLQuery(protocol, tokenAddress); // Fallback to TVL query
    }
  }

  buildPoolDataQuery(protocol, poolAddress) {
    const address = poolAddress?.toLowerCase();
    
    switch (protocol) {
      case 'uniswap_v3':
        return `{
          pool(id: "${address}") {
            id
            token0 { id symbol name }
            token1 { id symbol name }
            totalValueLockedUSD
            volumeUSD
            feeTier
          }
        }`;
      
      case 'curve':
        return `{
          pool(id: "${address}") {
            id
            name
            totalValueLockedUSD
            volumeUSD
            coins
          }
        }`;
      
      default:
        throw new Error(`Pool query not implemented for ${protocol}`);
    }
  }

  buildTokenPairsQuery(protocol, tokenAddress, first) {
    const address = tokenAddress?.toLowerCase();
    
    switch (protocol) {
      case 'uniswap_v2':
      case 'sushi_v2':
      case 'fraxswap':
        return `{
          pairs(
            first: ${first}
            where: {or: [
              {token0: "${address}"},
              {token1: "${address}"}
            ]}
            orderBy: reserveUSD
            orderDirection: desc
          ) {
            id
            token0 { id symbol name }
            token1 { id symbol name }
            reserveUSD
            volumeUSD
            totalSupply
          }
        }`;
      
      default:
        throw new Error(`Pairs query not implemented for ${protocol}`);
    }
  }

  buildAllPoolsQuery(protocol, first) {
    switch (protocol) {
      case 'curve':
        return `{
          pools(
            first: ${first}
            orderBy: totalValueLockedUSD
            orderDirection: desc
          ) {
            id
            name
            totalValueLockedUSD
            volumeUSD
            coins
          }
        }`;
      
      default:
        throw new Error(`All pools query not implemented for ${protocol}`);
    }
  }
} 