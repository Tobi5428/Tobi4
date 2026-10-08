import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

const KYC_STORAGE_KEY = 'jegaKycStatus';

export default function VirtualAccount() {
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    bvn: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const kycStatus = useMemo(() => {
    try {
      const raw = localStorage.getItem(KYC_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isKycVerified = Boolean(kycStatus?.isVerified);

  const createAccount = async (event) => {
    event.preventDefault();
    setSuccess('');
    if (!isKycVerified) {
      setError('KYC verification is required before creating a virtual account.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/virtual-account', form);
      setSuccess(res.data?.message || 'Virtual account created successfully.');
      setForm({ firstname: '', lastname: '', email: '', phone: '', bvn: '' });
    } catch (err) {
      setError(err?.message || 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 24, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
      <h2 style={{ marginBottom: 8 }}>Create Virtual Account</h2>
      <p style={{ color: '#64748b', marginBottom: 20 }}>KYC verification is mandatory before account generation.</p>

      {!isKycVerified && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fff7db', border: '1px solid #fcd34d', color: '#854d0e' }}>
          KYC is not verified. Please complete verification in <Link to="/kyc">KYC</Link> first.
        </div>
      )}

      {error && <div style={{ color: '#b91c1c', margin: '10px 0' }}>{error}</div>}
      {success && <div style={{ color: '#166534', margin: '10px 0' }}>{success}</div>}

      <form onSubmit={createAccount} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="First Name"
          value={form.firstname}
          onChange={(e) => setForm({ ...form, firstname: e.target.value })}
          required
          disabled={!isKycVerified}
        />

        <input
          placeholder="Last Name"
          value={form.lastname}
          onChange={(e) => setForm({ ...form, lastname: e.target.value })}
          required
          disabled={!isKycVerified}
        />

        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          disabled={!isKycVerified}
        />

        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
          disabled={!isKycVerified}
        />

        <input
          placeholder="BVN"
          value={form.bvn}
          onChange={(e) => setForm({ ...form, bvn: e.target.value })}
          required
          disabled={!isKycVerified}
        />

        <button type="submit" disabled={loading || !isKycVerified}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
}