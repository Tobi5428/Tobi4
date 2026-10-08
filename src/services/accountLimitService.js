/**
 * Frontend Account Limits Service
 * Communicates with backend /account-limits endpoints
 * Backend is the authoritative source for limits
 */

import api from './api';

class AccountLimitService {
  constructor() {
    this.cacheKey = 'jegaAccountLimitsCache';
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get user's current tier and all tier limit configurations
   * Caches result for 5 minutes to reduce backend calls
   */
  async getTierAndLimits() {
    try {
      // Check cache
      const cached = this._getCache();
      if (cached && cached.type === 'tierAndLimits') {
        return cached.data;
      }

      const response = await api.get('/account-limits/tier');
      if (response.data?.ok) {
        this._setCache('tierAndLimits', response.data);
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch tier');
    } catch (err) {
      console.error('[AccountLimitService] Error fetching tier:', err);
      throw err;
    }
  }

  /**
   * Get user's remaining limits for today
   * Shows how much more user can spend/receive today
   */
  async getRemainingLimits() {
    try {
      const response = await api.get('/account-limits/remaining');
      if (response.data?.ok) {
        return response.data.limits;
      }
      throw new Error(response.data?.message || 'Failed to fetch remaining limits');
    } catch (err) {
      console.error('[AccountLimitService] Error fetching remaining limits:', err);
      throw err;
    }
  }

  /**
   * Pre-flight validation check (informational only)
   * Frontend shows warnings based on this, but backend will enforce again
   * Input: { amount, type: 'incoming' | 'outgoing' }
   */
  async validateTransactionAmount(amount, type = 'outgoing') {
    try {
      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          ok: false,
          validation: {
            allowed: false,
            reason: 'Invalid amount',
          },
        };
      }

      const response = await api.post('/account-limits/validate', {
        amount,
        type,
      });

      if (response.data?.ok) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Validation failed');
    } catch (err) {
      console.error('[AccountLimitService] Error validating amount:', err);
      // If validation fails, don't block UI - let backend handle it
      return {
        ok: false,
        validation: {
          allowed: false,
          reason: 'Unable to validate limits',
        },
      };
    }
  }

  /**
   * Clear cached tier/limits when user updates their profile or verifies
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (err) {
      console.warn('[AccountLimitService] Error clearing cache:', err);
    }
  }

  _getCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      if (now - parsed.timestamp > this.cacheTTL) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('[AccountLimitService] Error reading cache:', err);
      return null;
    }
  }

  _setCache(type, data) {
    try {
      const cacheData = {
        type,
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('[AccountLimitService] Error writing cache:', err);
    }
  }
}

export default new AccountLimitService();
