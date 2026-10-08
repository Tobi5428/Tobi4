import api from './api';

export const getTransactions = async () => {
  try {
    const { data } = await api.get('/transactions');
    return data.transactions;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not load transactions.');
  }
};

export const sendTransfer = async (payload) => {
  try {
    const { data } = await api.post('/transfers', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Transfer failed.');
  }
};