/**
 * Data Validator - Ensures data quality before caching
 * Validates fetched data against previous values and sanity checks
 */

export class DataValidator {
  constructor() {
    // Minimum acceptable values for validation
    this.minimumValues = {
      market_cap: 10000, // $10k minimum market cap
      fdv: 10000,
      volume_24h: 0, // Volume can legitimately be 0
      current_price: 0.0001, // Minimum price $0.0001
      tvl: 0 // TVL can legitimately be 0 for some protocols
    };
    
    // Maximum acceptable percentage change (e.g., 95% drop is suspicious)
    this.maxDropPercentage = 95;
    this.maxIncreasePercentage = 1000; // 10x increase is suspicious
  }

  /**
   * Validate if data is acceptable to cache
   * @param {Object} newData - Newly fetched data
   * @param {Object} previousData - Previously cached data (can be null)
   * @param {string} dataType - Type of data (e.g., 'market-data', 'protocol-tvl')
   * @returns {Object} { isValid: boolean, reason: string, useStale: boolean }
   */
  validate(newData, previousData, dataType = 'default') {
    // If no new data or has error flag, reject immediately
    if (!newData || newData._unavailable || newData.error) {
      return {
        isValid: false,
        reason: 'Data unavailable or has error flag',
        useStale: true
      };
    }

    // Validate based on data type
    switch (dataType) {
      case 'market-data':
      case 'market-data-open-index':
        return this.validateMarketData(newData, previousData);
      
      case 'protocol-tvl':
        return this.validateTVLData(newData, previousData);
      
      case 'token-price':
        return this.validatePriceData(newData, previousData);
      
      default:
        // For unknown types, do basic validation
        return this.validateGeneric(newData, previousData);
    }
  }

  /**
   * Validate market data (CoinGecko)
   */
  validateMarketData(newData, previousData) {
    // Check if all critical fields are null/zero
    const hasCriticalData = newData.current_price || newData.market_cap || newData.fdv;
    if (!hasCriticalData) {
      return {
        isValid: false,
        reason: 'All critical market data fields are null/zero',
        useStale: true
      };
    }

    // Validate minimum values
    if (newData.market_cap !== null && newData.market_cap > 0 && 
        newData.market_cap < this.minimumValues.market_cap) {
      return {
        isValid: false,
        reason: `Market cap ${newData.market_cap} below minimum ${this.minimumValues.market_cap}`,
        useStale: true
      };
    }

    if (newData.current_price !== null && newData.current_price > 0 && 
        newData.current_price < this.minimumValues.current_price) {
      return {
        isValid: false,
        reason: `Price ${newData.current_price} below minimum ${this.minimumValues.current_price}`,
        useStale: true
      };
    }

    // If we have previous data, check for anomalies
    if (previousData && !previousData._stale) {
      // Check market cap change
      if (this.hasSuspiciousChange(previousData.market_cap, newData.market_cap, 'market_cap')) {
        return {
          isValid: false,
          reason: `Suspicious market cap change: ${previousData.market_cap} → ${newData.market_cap}`,
          useStale: true
        };
      }

      // Check price change
      if (this.hasSuspiciousChange(previousData.current_price, newData.current_price, 'price')) {
        return {
          isValid: false,
          reason: `Suspicious price change: ${previousData.current_price} → ${newData.current_price}`,
          useStale: true
        };
      }

      // Check FDV change
      if (this.hasSuspiciousChange(previousData.fdv, newData.fdv, 'fdv')) {
        return {
          isValid: false,
          reason: `Suspicious FDV change: ${previousData.fdv} → ${newData.fdv}`,
          useStale: true
        };
      }
    }

    return {
      isValid: true,
      reason: 'Market data passed validation'
    };
  }

  /**
   * Validate TVL data (DefiLlama)
   */
  validateTVLData(newData, previousData) {
    // TVL can legitimately be 0 for new protocols, but check if it was non-zero before
    const newTvl = newData.tvl || 0;
    
    // If TVL is null or explicitly marked as unavailable, reject
    if (newData.tvl === null || newData._unavailable) {
      return {
        isValid: false,
        reason: 'TVL is null or unavailable',
        useStale: true
      };
    }

    // If we had a significant TVL before and now it's zero, that's suspicious
    if (previousData && previousData.tvl > 100000 && newTvl === 0) {
      return {
        isValid: false,
        reason: `TVL dropped from ${previousData.tvl} to 0 (suspicious)`,
        useStale: true
      };
    }

    // Check for massive changes
    if (previousData && previousData.tvl) {
      if (this.hasSuspiciousChange(previousData.tvl, newTvl, 'tvl')) {
        return {
          isValid: false,
          reason: `Suspicious TVL change: ${previousData.tvl} → ${newTvl}`,
          useStale: true
        };
      }
    }

    return {
      isValid: true,
      reason: 'TVL data passed validation'
    };
  }

  /**
   * Validate token price data
   */
  validatePriceData(newData, previousData) {
    const newPrice = newData.price;

    // Price must exist and be a number
    if (newPrice === null || newPrice === undefined || isNaN(newPrice)) {
      return {
        isValid: false,
        reason: 'Price is null, undefined, or NaN',
        useStale: true
      };
    }

    // Negative prices are invalid
    if (newPrice < 0) {
      return {
        isValid: false,
        reason: 'Price is negative',
        useStale: true
      };
    }

    // Check for suspicious changes
    if (previousData && previousData.price) {
      if (this.hasSuspiciousChange(previousData.price, newPrice, 'price')) {
        return {
          isValid: false,
          reason: `Suspicious price change: ${previousData.price} → ${newPrice}`,
          useStale: true
        };
      }
    }

    return {
      isValid: true,
      reason: 'Price data passed validation'
    };
  }

  /**
   * Generic validation for unknown data types
   */
  validateGeneric(newData, previousData) {
    // Just check for error flags
    if (newData._unavailable || newData.error) {
      return {
        isValid: false,
        reason: 'Data has error flag',
        useStale: true
      };
    }

    return {
      isValid: true,
      reason: 'Generic validation passed'
    };
  }

  /**
   * Check if a value change is suspicious
   * @param {number} oldValue 
   * @param {number} newValue 
   * @param {string} fieldName - For logging
   * @returns {boolean}
   */
  hasSuspiciousChange(oldValue, newValue, fieldName) {
    // If either value is null/undefined, can't compare
    if (oldValue == null || newValue == null) {
      return false;
    }

    // If old value was 0, any new value is acceptable
    if (oldValue === 0) {
      return false;
    }

    // Calculate percentage change
    const change = ((newValue - oldValue) / oldValue) * 100;
    const absChange = Math.abs(change);

    // Check for massive drops (likely a data error)
    if (change < -this.maxDropPercentage) {
      console.warn(`Suspicious ${fieldName} drop: ${change.toFixed(2)}% (${oldValue} → ${newValue})`);
      return true;
    }

    // Check for massive increases (likely a data error)
    if (change > this.maxIncreasePercentage) {
      console.warn(`Suspicious ${fieldName} increase: ${change.toFixed(2)}% (${oldValue} → ${newValue})`);
      return true;
    }

    return false;
  }

  /**
   * Merge new data with stale data, preferring non-zero values
   * @param {Object} newData 
   * @param {Object} staleData 
   * @returns {Object}
   */
  mergeWithStaleData(newData, staleData) {
    if (!staleData) return newData;

    const merged = { ...newData };

    // For each numeric field, prefer non-zero values
    const numericFields = ['market_cap', 'fdv', 'volume_24h', 'current_price', 'tvl', 'price'];
    
    for (const field of numericFields) {
      if (staleData[field] != null && staleData[field] !== 0) {
        // If new data has zero/null but stale has a value, use stale
        if (merged[field] == null || merged[field] === 0) {
          merged[field] = staleData[field];
          merged[`_${field}_from_stale`] = true; // Mark for debugging
        }
      }
    }

    merged._merged_with_stale = true;
    merged._stale_data_timestamp = staleData._cached_at || staleData.fetched_at;

    return merged;
  }
}

