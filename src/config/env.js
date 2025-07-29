// Environment configuration
export const config = {
  // API Keys
  COINGECKO_API_KEY: import.meta.env.VITE_COINGECKO_API_KEY || '',
  THE_GRAPH_API_KEY: import.meta.env.VITE_THE_GRAPH_API_KEY || '',
  
  // Subgraph IDs
  UNISWAP_V3_SUBGRAPH_ID: import.meta.env.VITE_UNISWAP_V3_SUBGRAPH_ID || '',
  BALANCER_V2_SUBGRAPH_ID: import.meta.env.VITE_BALANCER_V2_SUBGRAPH_ID || '',
  SUSHI_SUBGRAPH_ID: import.meta.env.VITE_SUSHI_SUBGRAPH_ID || '',
  SUSHI_V2_SUBGRAPH_ID: import.meta.env.VITE_SUSHI_V2_SUBGRAPH_ID || '',
  UNISWAP_V2_SUBGRAPH_ID: import.meta.env.VITE_UNISWAP_V2_SUBGRAPH_ID || '',
  CURVE_SUBGRAPH_ID: import.meta.env.VITE_CURVE_SUBGRAPH_ID || '',
  FRAXSWAP_SUBGRAPH_ID: import.meta.env.VITE_FRAXSWAP_SUBGRAPH_ID || '',
  
  // RPC URLs
  ETH_RPC_URL: import.meta.env.VITE_ETH_RPC_URL || 'https://eth.llamarpc.com',
  ETH_RPC_URL_FALLBACK: import.meta.env.VITE_ETH_RPC_URL_FALLBACK || 'https://rpc.ankr.com/eth',
};

// The Graph endpoint builder
export const getTheGraphUrl = (subgraphId) => {
  return `https://gateway.thegraph.com/api/${config.THE_GRAPH_API_KEY}/subgraphs/id/${subgraphId}`;
}; 