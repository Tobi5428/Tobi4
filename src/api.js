import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Add user-friendly error message for network errors
    if (!error.response) {
      error.networkError = true;
      error.message = 'Network error: Unable to reach the server. Please check your connection and ensure the backend server is running.';
    }
    
    return Promise.reject(error);
  }
);

// ==================== Authentication API Functions ====================

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.phone - User phone number
 * @returns {Promise} - Registration response
 */
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    let message;
    
    if (error.networkError) {
      message = error.message;
    } else if (error.response?.status === 409) {
      message = error.response?.data?.message || 'This email is already registered. Please use a different email.';
    } else {
      message = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        error.message ||
        'Registration failed. Please try again.';
    }
    
    throw new Error(message);
  }
};

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise} - Login response with token
 */
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const data = response.data || {};
    const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
    if (token) {
      localStorage.setItem('token', token);
      return { ...data, token };
    }

    const message = data.message || data.error || 'Login failed. No token returned.';
    throw new Error(message);
  } catch (error) {
    let message;
    
    if (error.networkError) {
      message = error.message;
    } else if (error.response?.status === 401) {
      message = 'Invalid email or password. Please try again.';
    } else {
      message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : undefined) ||
        error.message ||
        'Login failed. Please try again.';
    }
    
    throw new Error(message);
  }
};

/**
 * Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem('token');
};

/**
 * Get current user data
 * @returns {Promise} - User data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/user');
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch user data';
    throw new Error(message);
  }
};

// ==================== Payment API Functions ====================

/**
 * Initiate a Flutterwave payment
 * @param {Object} paymentData - Payment details
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.firstName - Customer first name
 * @param {string} paymentData.lastName - Customer last name
 * @param {string} paymentData.phone - Customer phone number
 * @param {string} paymentData.orderId - Optional order ID
 * @returns {Promise} - Payment response with link
 */
export const initiatePayment = async (paymentData) => {
  try {
    const response = await api.post('/payment/initiate', paymentData);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const respData = error.response?.data;

    const baseMessage =
      respData?.message ||
      respData?.error ||
      (typeof respData === 'string' ? respData : null) ||
      error.message ||
      'Failed to initiate payment';

    let message = status ? `Request failed with status ${status}: ${baseMessage}` : baseMessage;
    try {
      if (respData && typeof respData === 'object') {
        message += ` | serverResponse=${JSON.stringify(respData)}`;
      }
    } catch (e) {
      // ignore JSON stringify errors
    }

    throw new Error(message);
  }
};

/**
 * Verify a completed payment
 * @param {string} transactionId - Flutterwave transaction ID
 * @returns {Promise} - Verification response
 */
export const verifyPayment = async (transactionId) => {
  try {
    const response = await api.post('/payment/verify', { transactionId });
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to verify payment';
    throw new Error(message);
  }
};

/**
 * Get payment transaction history
 * @returns {Promise} - List of transactions
 */
export const getTransactionHistory = async () => {
  try {
    const response = await api.get('/payment/transactions');
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch transaction history';
    throw new Error(message);
  }
};

/**
 * Get payment statistics
 * @returns {Promise} - Payment stats
 */
export const getPaymentStats = async () => {
  try {
    const response = await api.get('/payment/stats');
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch payment statistics';
    throw new Error(message);
  }
};

// ==================== Transfer API Functions ====================

/**
 * Send local transfer
 * @param {Object} transferData - Transfer details
 * @param {string} transferData.name - Recipient name
 * @param {string} transferData.bankCode - Bank code
 * @param {string} transferData.accountNumber - Account number
 * @param {number} transferData.amount - Transfer amount
 * @param {string} transferData.currency - Currency (default: NGN)
 * @param {string} transferData.narration - Optional transfer description
 * @returns {Promise} - Transfer response
 */
export const sendLocalTransfer = async (transferData) => {
  try {
    const response = await api.post('/transfer/local', transferData);
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to send local transfer';
    throw new Error(message);
  }
};

/**
 * Send international transfer
 * @param {Object} transferData - Transfer details
 * @param {string} transferData.name - Recipient name
 * @param {string} transferData.bankCode - Bank code
 * @param {string} transferData.accountNumber - Account number
 * @param {number} transferData.amount - Transfer amount
 * @param {string} transferData.currency - Currency code (USD, GBP, EUR, etc.)
 * @param {string} transferData.country - Country code
 * @param {string} transferData.narration - Optional transfer description
 * @returns {Promise} - Transfer response
 */
export const sendInternationalTransfer = async (transferData) => {
  try {
    const response = await api.post('/transfer/international', transferData);
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to send international transfer';
    throw new Error(message);
  }
};

/**
 * Initiate a generic transfer (server-side will decide local/international)
 * @param {Object} transferData - Transfer details
 */
export const initiateTransfer = async (transferData) => {
  try {
    const response = await api.post('/transfer/initiate', transferData);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const respData = error.response?.data;

    const baseMessage =
      respData?.message ||
      respData?.error ||
      (typeof respData === 'string' ? respData : null) ||
      error.message ||
      'Failed to initiate transfer';

    let message = status ? `Request failed with status ${status}: ${baseMessage}` : baseMessage;
    try {
      if (respData && typeof respData === 'object') {
        message += ` | serverResponse=${JSON.stringify(respData)}`;
      }
    } catch (e) {
      // ignore
    }

    throw new Error(message);
  }
};

/**
 * Validate bank account details
 * @param {string} accountNumber - Account number to validate
 * @param {string} bankCode - Bank code
 * @returns {Promise} - Validation response with account name
 */
export const validateBankAccount = async (accountNumber, bankCode) => {
  try {
    const response = await api.post('/transfer/validate', { accountNumber, bankCode });
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to validate bank account';
    throw new Error(message);
  }
};

/**
 * Get list of supported banks
 * @returns {Promise} - List of banks with codes
 */
export const getBankList = async () => {
  try {
    const response = await api.get('/transfer/banks');
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch bank list';
    throw new Error(message);
  }
};

/**
 * Get transfer history
 * @param {Object} filters - Optional filters
 * @param {string} filters.type - Filter by type: 'local' or 'international'
 * @param {string} filters.status - Filter by status: 'pending', 'completed', 'failed'
 * @returns {Promise} - List of transfers
 */
export const getTransferHistory = async (filters = {}) => {
  try {
    const response = await api.get('/transfer/history', { params: filters });
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch transfer history';
    throw new Error(message);
  }
};

/**
 * Get transfer statistics
 * @returns {Promise} - Transfer stats
 */
export const getTransferStats = async () => {
  try {
    const response = await api.get('/transfer/stats');
    return response.data;
  } catch (error) {
    const message = 
      error.response?.data?.message || 
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Failed to fetch transfer statistics';
    throw new Error(message);
  }
};

export default api;
