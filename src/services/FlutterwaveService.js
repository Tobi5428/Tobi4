// Stubs for future Flutterwave integration.
// Uses VITE_FLW_PUBLIC_KEY from .env — never hardcode keys here.
import api from './api';

const KYC_STORAGE_KEY = 'jegaKycStatus';

function requireKycVerification() {
  let verified = false;
  try {
    const raw = localStorage.getItem(KYC_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    verified = Boolean(parsed?.isVerified);
  } catch {
    verified = false;
  }

  if (!verified) {
    throw new Error('KYC verification is required before creating a virtual account.');
  }
}

export const createVirtualAccount = async () => {
  try {
    requireKycVerification();
    const { data } = await api.post('/flutterwave/virtual-account');
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not create virtual account.');
  }
};

export const initiateTransfer = async (payload) => {
  try {
    const { data } = await api.post('/flutterwave/transfer', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Transfer failed.');
  }
};

export const createVirtualCard = async (payload) => {
  try {
    const { data } = await api.post('/flutterwave/virtual-card', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not create virtual card.');
  }
};

export const freezeVirtualCard = async (cardId) => {
  try {
    const { data } = await api.patch(`/flutterwave/virtual-card/${cardId}/freeze`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not freeze card.');
  }
};

export const payUtilityBill = async (payload) => {
  try {
    const { data } = await api.post('/flutterwave/bills', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Bill payment failed.');
  }
};

export const purchaseAirtime = async (payload) => {
  try {
    const { data } = await api.post('/flutterwave/airtime', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Airtime purchase failed.');
  }
};

export const purchaseData = async (payload) => {
  try {
    const { data } = await api.post('/flutterwave/data', payload);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Data purchase failed.');
  }
};