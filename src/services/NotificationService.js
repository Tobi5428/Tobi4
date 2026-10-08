import api from './api';

export const getNotifications = async () => {
  try {
    const { data } = await api.get('/notifications');
    return data.notifications;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not load notifications.');
  }
};