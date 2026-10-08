import api from './api';

export const signupBusiness = async (formData) => {
  try {
    const { data } = await api.post('/api/business-auth/signup', formData);
    return data;
  } catch (error) {
    const message = error.response?.data?.message || 'Signup failed. Please try again.';
    throw new Error(message);
  }
};

export const loginBusiness = async (formData) => {
  try {
    const { data } = await api.post('/api/business-auth/login', formData);
    return data;
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed. Please try again.';
    throw new Error(message);
  }
};