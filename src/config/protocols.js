// ================= PROTOCOLS CONFIGURATION =================

export const protocols = [
  {
    ticker: "FXN",
    name: "f(x) Protocol",
    govContractAddress: "0x365accfca291e7d3914637abf1f7635db165bb09",
    stableAddress: "0x085780639CC2cACd35E474e71f4d000e2405d8f6", // fxUSD
    stableName: "fxUSD",
    coingeckoId: "fxn-token",
    defiLlamaSlug: "fx-protocol",
    blockchain: "ethereum",
    mainnetLaunch: "2023-08-01",
    openStatus: "current",
    nextEmissions: 44100,
    emissionsCatalyst: "Gauge emissions"
  },
  {
    ticker: "ENA",
    name: "Ethena",
    govContractAddress: "0x57e114b691db790c35207b2e685d4a43181e6061",
    stableAddress: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3", // USDe
    stableName: "USDe",
    coingeckoId: "ethena",
    defiLlamaSlug: "ethena-usde",
    blockchain: "ethereum",
    mainnetLaunch: "2024-02-01",
    openStatus: "watchlist",
    nextEmissions: 1500000000,
    emissionsCatalyst: "Airdrop/team/investor vesting, ecosystem incentives"
  },
  {
    ticker: "OGN",
    name: "Origin Protocol",
    govContractAddress: "0x8207c1ffc5b6804f6024322ccf34f29c3541ae26",
    stableAddress: "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86", // OUSD
    stableName: "OUSD",
    coingeckoId: "origin-protocol",
    defiLlamaSlug: "origin-ether",
    blockchain: "ethereum",
    mainnetLaunch: "2018-10-01",
    openStatus: "current",
    nextEmissions: 241000000,
    emissionsCatalyst: "Team/investor vesting, ecosystem incentives"
  },
  {
    ticker: "RSR",
    name: "Reserve Protocol",
    govContractAddress: "0x320623b8e4ff03373931769a31fc52a4e78b5d70",
    stableAddress: "0xA0d69E286B938e21CBf7E51D71F6A4c8918f482F", // eUSD
    stableName: "eUSD",
    coingeckoId: "reserve-rights-token",
    defiLlamaSlug: "reserve-protocol",
    blockchain: "ethereum",
    mainnetLaunch: "2022-10-01",
    openStatus: "current",
    nextEmissions: 7884264122,
    emissionsCatalyst: "Slow wallet, ecosystem incentives"
  },
  {
    ticker: "CRV",
    name: "Curve Finance",
    govContractAddress: "0xd533a949740bb3306d119cc777fa900ba034cd52",
    stableAddress: "0xf939e0a03fb07f59a73314e73794be0e57ac1b4e", // crvUSD
    stableName: "crvUSD",
    coingeckoId: "curve-dao-token",
    defiLlamaSlug: "curve-dex",
    blockchain: "ethereum",
    mainnetLaunch: "2020-01-01",
    openStatus: "current",
    nextEmissions: 119678319,
    emissionsCatalyst: "Gauge emissions"
  },
  {
    ticker: "SKY",
    name: "Sky Ecosystem",
    govContractAddress: "0x56072c95faa701256059aa122697b133aded9279",
    stableAddress: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", // USDS
    stableName: "USDS",
    coingeckoId: "sky",
    defiLlamaSlug: "sky-lending",
    blockchain: "ethereum",
    mainnetLaunch: "2017-12-01",
    openStatus: "current",
    nextEmissions: 0,
    emissionsCatalyst: "Currently in MKR:SKY 24,000 swap phase"
  },
  {
    ticker: "ALCX",
    name: "Alchemix",
    govContractAddress: "0xdbdb4d16eda451d0503b854cf79d55697f90c8df",
    stableAddress: "0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9", // alUSD
    stableName: "alUSD",
    coingeckoId: "alchemix",
    defiLlamaSlug: "alchemix",
    blockchain: "ethereum",
    mainnetLaunch: "2021-02-01",
    openStatus: "current",
    nextEmissions: 114000,
    emissionsCatalyst: "Ecosystem incentives and team vesting"
  },
  {
    ticker: "SYRUP",
    name: "Maple Finance",
    govContractAddress: "0x643c4e15d7d62ad0abec4a9bd4b001aa3ef52d66",
    stableAddress: null, // Maple doesn't have a native stablecoin
    stableName: null,
    coingeckoId: "syrup",
    defiLlamaSlug: "maple",
    blockchain: "ethereum",
    mainnetLaunch: "2021-05-01",
    openStatus: "watchlist",
    nextEmissions: 500000,
    emissionsCatalyst: "emissions only set to last 3 years as well so won't be any more at the end of 2026"
  },
  {
    ticker: "FXS",
    name: "Frax Finance",
    govContractAddress: "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0",
    stableAddress: "0x853d955acef822db058eb8505911ed77f175b99e", // FRAX
    stableName: "FRAX",
    coingeckoId: "frax-share",
    defiLlamaSlug: "frax",
    blockchain: "ethereum",
    mainnetLaunch: "2020-12-01",
    openStatus: "current",
    nextEmissions: 8000000,
    emissionsCatalyst: "FXTL conversions, ecosystem and team incentives"
  },
  {
    ticker: "AAVE",
    name: "Aave",
    govContractAddress: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    stableAddress: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f", // GHO
    stableName: "GHO",
    coingeckoId: "aave",
    defiLlamaSlug: "aave-v3",
    blockchain: "ethereum",
    mainnetLaunch: "2020-01-01",
    openStatus: "current",
    nextEmissions: 0,
    emissionsCatalyst: "buybacks from protocol revenue"
  },
  {
    ticker: "INV",
    name: "Inverse Finance",
    govContractAddress: "0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68",
    stableAddress: "0x865377367054516e17014ccded1e7d814edc9ce4", // DOLA
    stableName: "DOLA",
    coingeckoId: "inverse-finance",
    defiLlamaSlug: "inverse-finance-firm",
    blockchain: "ethereum",
    mainnetLaunch: "2020-12-01",
    openStatus: "current",
    nextEmissions: 0,
    emissionsCatalyst: ""
  },
  {
    ticker: "LQTY",
    name: "Liquity Protocol",
    govContractAddress: "0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d",
    stableAddress: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0", // LUSD
    stableName: "LUSD",
    coingeckoId: "liquity",
    defiLlamaSlug: "liquity-v2",
    blockchain: "ethereum",
    mainnetLaunch: "2021-04-01",
    openStatus: "current",
    nextEmissions: 1937000,
    emissionsCatalyst: "Stability Pool issuance, since d1 til forever, halves every year."
  }
];

// Helper function to calculate years on chain
export function calculateYearsOnChain(launchDate) {
  const launch = new Date(launchDate);
  const now = new Date();
  return ((now - launch) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
}

// Helper function to format large numbers
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
}

// Helper function to format percentages
export function formatPercentage(ratio) {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return "N/A";
  return `${(ratio * 100).toFixed(1)}%`;
}

// Helper function to format supply numbers (non-currency)
export function formatSupply(num) {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  } else {
    return num.toLocaleString();
  }
} 