import axios from 'axios';

export class EthereumFetcher {
  constructor() {
    this.primaryRpcUrl = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
    this.fallbackRpcUrl = process.env.ETH_RPC_URL_FALLBACK || 'https://rpc.ankr.com/eth';
  }

  async makeRpcCall(method, params = []) {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    };

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    };

    // Try primary RPC first
    try {
      const response = await axios.request({
        ...options,
        url: this.primaryRpcUrl,
        timeout: 8000
      });
      
      if (response.data.error) {
        throw new Error(`Primary RPC error: ${JSON.stringify(response.data.error)}`);
      }
      
      return response.data.result;
    } catch (error) {
      console.warn('Primary RPC failed, trying fallback:', error.message);
      
      // Try fallback RPC
      try {
        const response = await axios.request({
          ...options,
          url: this.fallbackRpcUrl,
          timeout: 8000
        });
        
        if (response.data.error) {
          throw new Error(`Fallback RPC error: ${JSON.stringify(response.data.error)}`);
        }
        
        return response.data.result;
      } catch (fallbackError) {
        console.error('Both RPC endpoints failed:', fallbackError.message);
        throw fallbackError;
      }
    }
  }

  // Public API methods (used by endpoints)
  async getTokenBalanceFormatted(tokenAddress, holderAddress) {
    try {
      const balance = await this.getTokenBalance(tokenAddress, holderAddress);
      return {
        tokenAddress,
        holderAddress,
        balance: balance.balance,
        balanceHex: balance.balanceHex,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching token balance:`, error.message);
      return {
        tokenAddress,
        holderAddress,
        balance: 0,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getTokenDecimalsFormatted(tokenAddress) {
    try {
      const decimals = await this.getTokenDecimals(tokenAddress);
      return {
        tokenAddress,
        decimals,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        tokenAddress,
        decimals: 18,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getTokenNameFormatted(tokenAddress) {
    try {
      const name = await this.getTokenName(tokenAddress);
      return {
        tokenAddress,
        name,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        tokenAddress,
        name: 'Unknown',
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getTokenSymbolFormatted(tokenAddress) {
    try {
      const symbol = await this.getTokenSymbol(tokenAddress);
      return {
        tokenAddress,
        symbol,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        tokenAddress,
        symbol: 'UNKNOWN',
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getTotalSupplyFormatted(tokenAddress) {
    try {
      const totalSupply = await this.getTokenTotalSupply(tokenAddress);
      return {
        tokenAddress,
        totalSupply,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        tokenAddress,
        totalSupply: 0,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async fetchData(method, params = {}) {
    try {
      console.log(`Fetching Ethereum ${method} data`);
      
      switch (method) {
        case 'currentBlock':
          return await this.getCurrentBlock();
        
        case 'gasPrice':
          return await this.getGasPrice();
        
        case 'tokenBalance':
          return await this.getTokenBalance(params.tokenAddress, params.walletAddress);
        
        case 'tokenInfo':
          return await this.getTokenInfo(params.tokenAddress);
        
        case 'ethBalance':
          return await this.getEthBalance(params.address);
        
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      console.error(`Error fetching Ethereum ${method} data:`, error.message);
      return {
        method,
        data: null,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getCurrentBlock() {
    const blockNumber = await this.makeRpcCall('eth_blockNumber');
    const blockNumberDecimal = parseInt(blockNumber, 16);
    
    return {
      method: 'currentBlock',
      blockNumber: blockNumberDecimal,
      blockNumberHex: blockNumber,
      fetched_at: new Date().toISOString()
    };
  }

  async getGasPrice() {
    const gasPrice = await this.makeRpcCall('eth_gasPrice');
    const gasPriceDecimal = parseInt(gasPrice, 16);
    const gasPriceGwei = gasPriceDecimal / 1e9;
    
    return {
      method: 'gasPrice',
      gasPrice: gasPriceDecimal,
      gasPriceGwei: gasPriceGwei,
      gasPriceHex: gasPrice,
      fetched_at: new Date().toISOString()
    };
  }

  async getEthBalance(address) {
    const balance = await this.makeRpcCall('eth_getBalance', [address, 'latest']);
    const balanceDecimal = parseInt(balance, 16);
    const balanceEth = balanceDecimal / 1e18;
    
    return {
      method: 'ethBalance',
      address: address,
      balance: balanceDecimal,
      balanceEth: balanceEth,
      balanceHex: balance,
      fetched_at: new Date().toISOString()
    };
  }

  async getTokenBalance(tokenAddress, walletAddress) {
    // ERC-20 balanceOf function signature: 0x70a08231
    const methodId = '0x70a08231';
    const paddedAddress = walletAddress.slice(2).padStart(64, '0');
    const data = methodId + paddedAddress;
    
    const result = await this.makeRpcCall('eth_call', [
      {
        to: tokenAddress,
        data: data
      },
      'latest'
    ]);
    
    const balance = parseInt(result, 16);
    
    return {
      method: 'tokenBalance',
      tokenAddress: tokenAddress,
      walletAddress: walletAddress,
      balance: balance,
      balanceHex: result,
      fetched_at: new Date().toISOString()
    };
  }

  async getTokenInfo(tokenAddress) {
    try {
      // Get token name, symbol, decimals, and total supply
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.getTokenName(tokenAddress),
        this.getTokenSymbol(tokenAddress),
        this.getTokenDecimals(tokenAddress),
        this.getTokenTotalSupply(tokenAddress)
      ]);

      return {
        method: 'tokenInfo',
        tokenAddress: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: decimals,
        totalSupply: totalSupply,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        method: 'tokenInfo',
        tokenAddress: tokenAddress,
        error: error.message,
        fetched_at: new Date().toISOString()
      };
    }
  }

  async getTokenName(tokenAddress) {
    // ERC-20 name() function signature: 0x06fdde03
    const data = '0x06fdde03';
    
    try {
      const result = await this.makeRpcCall('eth_call', [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]);
      
      return this.decodeString(result);
    } catch (error) {
      return 'Unknown';
    }
  }

  async getTokenSymbol(tokenAddress) {
    // ERC-20 symbol() function signature: 0x95d89b41
    const data = '0x95d89b41';
    
    try {
      const result = await this.makeRpcCall('eth_call', [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]);
      
      return this.decodeString(result);
    } catch (error) {
      return 'UNKNOWN';
    }
  }

  async getTokenDecimals(tokenAddress) {
    // ERC-20 decimals() function signature: 0x313ce567
    const data = '0x313ce567';
    
    try {
      const result = await this.makeRpcCall('eth_call', [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]);
      
      return parseInt(result, 16);
    } catch (error) {
      return 18; // Default decimals
    }
  }

  async getTokenTotalSupply(tokenAddress) {
    // ERC-20 totalSupply() function signature: 0x18160ddd
    const data = '0x18160ddd';
    
    try {
      const result = await this.makeRpcCall('eth_call', [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]);
      
      return parseInt(result, 16);
    } catch (error) {
      return 0;
    }
  }

  async getAllowance(tokenAddress, ownerAddress, spenderAddress) {
    // ERC-20 allowance(address,address) function signature: 0xdd62ed3e
    // First parameter (owner) - pad to 32 bytes
    const paddedOwner = ownerAddress.slice(2).padStart(64, '0');
    // Second parameter (spender) - pad to 32 bytes  
    const paddedSpender = spenderAddress.slice(2).padStart(64, '0');
    
    const data = '0xdd62ed3e' + paddedOwner + paddedSpender;
    
    try {
      const result = await this.makeRpcCall('eth_call', [
        {
          to: tokenAddress,
          data: data
        },
        'latest'
      ]);
      
      return parseInt(result, 16);
    } catch (error) {
      return 0;
    }
  }

  async getAllowanceFormatted(tokenAddress, ownerAddress, spenderAddress) {
    try {
      const [allowance, decimals] = await Promise.all([
        this.getAllowance(tokenAddress, ownerAddress, spenderAddress),
        this.getTokenDecimals(tokenAddress)
      ]);
      
      // Format allowance amount
      const allowanceFormatted = decimals > 0 ? (allowance / Math.pow(10, decimals)).toFixed(6) : allowance.toString();
      
      return {
        allowance: allowance.toString(),
        allowanceFormatted,
        decimals,
        tokenAddress,
        ownerAddress,
        spenderAddress
      };
    } catch (error) {
      throw new Error(`Failed to get allowance: ${error.message}`);
    }
  }

  decodeString(hexData) {
    if (!hexData || hexData === '0x') return '';
    
    // Remove 0x prefix
    const hex = hexData.slice(2);
    
    // Skip first 64 chars (offset) and next 64 chars (length), then get the string
    const offset = parseInt(hex.slice(0, 64), 16) * 2;
    const length = parseInt(hex.slice(offset, offset + 64), 16) * 2;
    const stringHex = hex.slice(offset + 64, offset + 64 + length);
    
    // Convert hex to string
    let result = '';
    for (let i = 0; i < stringHex.length; i += 2) {
      const charCode = parseInt(stringHex.slice(i, i + 2), 16);
      if (charCode !== 0) {
        result += String.fromCharCode(charCode);
      }
    }
    
    return result;
  }

  /**
   * Get exchange rate from Curve pool using get_dy function
   * @param {string} poolAddress - Curve pool address
   * @param {number} i - Index of input token
   * @param {number} j - Index of output token  
   * @param {string} dx - Amount of input token (in wei/smallest unit)
   * @returns {Promise<object>} - Exchange rate information
   */
  async getCurveGetDy(poolAddress, i, j, dx) {
    try {
      // Curve get_dy function signature: get_dy(uint256,uint256,uint256)
      // Function selector: 0x556d6e9f
      const methodId = '0x556d6e9f';
      
      // Encode parameters
      const iHex = i.toString(16).padStart(64, '0');
      const jHex = j.toString(16).padStart(64, '0');
      const dxHex = BigInt(dx).toString(16).padStart(64, '0');
      
      const data = methodId + iHex + jHex + dxHex;
      
      const result = await this.makeRpcCall('eth_call', [
        {
          to: poolAddress,
          data: data
        },
        'latest'
      ]);
      
      // Parse the result (uint256)
      const dy = BigInt(result);
      
      return {
        poolAddress,
        inputIndex: i,
        outputIndex: j,
        inputAmount: dx,
        outputAmount: dy.toString(),
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error calling get_dy on pool ${poolAddress}:`, error.message);
      throw error;
    }
  }
} 