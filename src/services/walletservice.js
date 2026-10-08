import api from './api';

export const getWalletBalance = async () => {
  try {
    const { data } = await api.get('/wallet/balance');
    return data.balance;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not load wallet balance.');
  }
};