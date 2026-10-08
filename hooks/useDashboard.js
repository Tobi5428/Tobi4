import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
  getCurrentUser,
  getPaymentStats,
  getTransactionHistory,
} from '../src/api';

export const useDashboard = () => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning('');
    try {
      const [userResult, statsResult, txResult, notifResult] = await Promise.allSettled([
        getCurrentUser(),
        getPaymentStats(),
        getTransactionHistory(),
        fetchNotifications(),
      ]);

      const failures = [userResult, statsResult, txResult, notifResult].filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setWarning('Some dashboard sections could not load. You can still use available features and retry.');
      }

      const userResponse = userResult.status === 'fulfilled' ? userResult.value : null;
      const statsResponse = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const txResponse = txResult.status === 'fulfilled' ? txResult.value : null;
      const notifResponse = notifResult.status === 'fulfilled' ? notifResult.value : null;

      const userData = userResponse?.user || userResponse || null;
      const statsData = statsResponse?.data || {};
      const transactionRows = Array.isArray(txResponse?.data) ? txResponse.data : [];
      const notificationRows = Array.isArray(notifResponse?.data) ? notifResponse.data : [];

      const normalizedTransactions = transactionRows.map((t) => ({
        id: t.transactionId || t.id || 'N/A',
        date: t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
        type: t.metadata?.source || 'payment',
        recipient: t.customerId || userData?.email || 'N/A',
        amount: Number(t.amount || 0),
        status:
          t.status === 'pending_manual_review'
            ? 'pending'
            : t.status === 'declined' || t.status === 'blocked'
            ? 'failed'
            : t.status || 'pending',
      }));

      const normalizedNotifications = notificationRows.map((n) => ({
        id: n.id,
        type: n.channel === 'email' ? 'transfer' : 'login',
        title: n.title || 'Notification',
        message: n.message || '',
        time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
      }));

      const totalAmount = Number(statsData.totalAmount || 0);
      const pendingCount = Number(statsData.pendingPayments || 0);
      const availableEstimate = Math.max(0, totalAmount - pendingCount * 1000);

      const balanceData = {
        available: availableEstimate,
        pending: pendingCount * 1000,
        monthlyIncome: totalAmount,
        monthlySpending: 0,
      };

      setUser(userData);
      setBalance(balanceData);
      setTransactions(normalizedTransactions);
      setNotifications(normalizedNotifications);

      setStats([
        { label: 'Total Balance', value: `₦${Number(balanceData.available).toLocaleString()}` },
        { label: 'Monthly Income', value: `₦${Number(balanceData.monthlyIncome ?? 0).toLocaleString()}` },
        { label: 'Monthly Spending', value: `₦${Number(balanceData.monthlySpending ?? 0).toLocaleString()}` },
        { label: 'Successful Transfers', value: normalizedTransactions.filter((t) => t.status === 'successful').length },
        { label: 'Pending Transactions', value: normalizedTransactions.filter((t) => t.status === 'pending').length },
        { label: 'Referral Earnings', value: `₦${Number(userData?.referralEarnings ?? 0).toLocaleString()}` },
      ]);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    user,
    balance,
    transactions,
    notifications,
    stats,
    loading,
    error,
    warning,
    refreshDashboard: loadDashboard,
  };
};