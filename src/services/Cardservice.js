import api from './api';

export const getCards = async () => {
  try {
    const { data } = await api.get('/cards');
    return data.cards;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not load cards.');
  }
};