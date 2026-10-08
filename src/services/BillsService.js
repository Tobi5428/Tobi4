import api from './api';

export const payBill = async (payload) => {
  try {
    const { data } = await api.post('/bills/pay', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Bill payment failed.');
  }
};