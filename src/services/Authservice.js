import api from './api';

export const getCurrentUser = async () => {
  try {
    const { data } = await api.get('/auth/user');
    return data.user;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not load user profile.');
  }
};