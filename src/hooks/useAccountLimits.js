import { useState, useEffect, useCallback } from 'react';
import accountLimitService from '../services/accountLimitService';

/**
 * Custom hook: useAccountLimits
 * Manages user's verification tier and account limits
 * Handles loading, caching, and error states
 */
export function useAccountLimits() {
  const [tier, setTier] = useState(null);
  const [allTiers, setAllTiers] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch tier and all limit configurations
  const fetchTier = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountLimitService.getTierAndLimits();
      setTier(data.userTier);
      setAllTiers(data.tiers);
    } catch (err) {
      setError(err.message || 'Failed to fetch tier');
      console.error('[useAccountLimits] Error fetching tier:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch remaining limits
  const fetchRemaining = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountLimitService.getRemainingLimits();
      setRemaining(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch remaining limits');
      console.error('[useAccountLimits] Error fetching remaining:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch both on mount
  useEffect(() => {
    fetchTier();
    fetchRemaining();
  }, [fetchTier, fetchRemaining]);

  // Validate a specific transaction amount
  const validateAmount = useCallback(
    async (amount, type = 'outgoing') => {
      return accountLimitService.validateTransactionAmount(amount, type);
    },
    []
  );

  // Refresh both tier and remaining limits
  const refresh = useCallback(async () => {
    accountLimitService.clearCache();
    await fetchTier();
    await fetchRemaining();
  }, [fetchTier, fetchRemaining]);

  return {
    tier,
    allTiers,
    remaining,
    loading,
    error,
    fetch: fetchTier,
    fetchRemaining,
    validateAmount,
    refresh,
  };
}

export default useAccountLimits;
