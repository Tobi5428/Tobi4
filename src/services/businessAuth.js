import axios from 'axios';

const resolvedBaseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '');

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
});

const BUSINESS_LOGIN_CHALLENGE_KEY = 'pendingLoginChallenge';

export const signupBusiness = async (formData, recaptchaToken) => {
  try {
    const payload = {
      businessName: String(formData.businessName || '').trim(),
      rcNumber: String(formData.rcNumber || '').trim(),
      businessEmail: String(formData.businessEmail || '').trim(),
      phone: String(formData.phone || '').replace(/\D/g, ''),
      businessType: String(formData.businessType || '').trim(),
      password: formData.password,
      accountType: 'business',
      recaptchaToken,
    };

    const response = await api.post('/auth/register', payload, { skipAuthRedirect: true });
    const data = response.data || {};
    
    return { success: true, message: data.message || 'Business account created successfully', accountType: 'business' };
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Business signup failed. Please try again.';
    throw new Error(message);
  }
};

export const loginBusiness = async (formData) => {
  try {
    const response = await api.post('/auth/login', {
      businessEmail: String(formData.businessEmail || '').trim(),
      password: formData.password,
    }, { skipAuthRedirect: true });

    const data = response.data || {};

    if (data.verificationRequired) {
      sessionStorage.setItem(BUSINESS_LOGIN_CHALLENGE_KEY, JSON.stringify(data));
      return data;
    }

    const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
    if (token) {
      localStorage.setItem('token', token);
      return { ...data, token };
    }

    const message = data.message || data.error || 'Business login failed. No token returned.';
    throw new Error(message);
  } catch (error) {
    let message;

    if (error.response?.status === 401) {
      message = 'Invalid email or password. Please try again.';
    } else {
      message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Business login failed. Please try again.';
    }

    throw new Error(message);
  }
};
