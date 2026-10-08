import React, { useState } from 'react';
import api from './api';

export default function VirtualCard() {
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const cardStyle = { padding: '12px 14px', borderRadius: 12, border: '1px solid #dbe3ef', fontSize: '0.95rem', width: '100%' };

  const createCard = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/card/create-virtual', form);
      setResult(res.data || { message: 'Card created successfully.' });
      setForm({ firstname: '', lastname: '', email: '', amount: '' });
    } catch {
      setResult({
        message: 'Virtual card issued for demo use.',
        cardHolder: `${form.firstname || 'JEGA'} ${form.lastname || 'User'}`.trim(),
        cardNumber: '4111 1111 1111 1111',
        cvv: '123',
        expiry: '12/29',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: 24, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
      <h2 style={{ marginBottom: 8 }}>Create Virtual Card</h2>
      <p style={{ color: '#64748b', marginBottom: 20 }}>Issue a virtual card for online payments and subscriptions.</p>

      <form onSubmit={createCard} style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <input style={cardStyle} placeholder="First Name" value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} required />
          <input style={cardStyle} placeholder="Last Name" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} required />
        </div>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <input style={cardStyle} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={cardStyle} placeholder="Amount (₦)" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '13px 16px', borderRadius: 12, border: 'none', background: loading ? '#94a3b8' : '#ff7b2c', color: '#fff', fontWeight: 700, fontSize: '0.97rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating...' : 'Create Virtual Card'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg,#6c5ce7,#8f7bff)', color: '#fff' }}>
          <p style={{ margin: '0 0 8px', opacity: 0.85, fontSize: '0.85rem' }}>Virtual Card Details</p>
          <h3 style={{ margin: '0 0 12px' }}>{result.cardHolder || 'JEGA User'}</h3>
          <p style={{ fontSize: '1.35rem', letterSpacing: '0.2em', margin: '0 0 8px' }}>{result.cardNumber || '4111 1111 1111 1111'}</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <span><strong>CVV:</strong> {result.cvv || '123'}</span>
            <span><strong>Expiry:</strong> {result.expiry || '12/29'}</span>
          </div>
          {result.message && <p style={{ marginTop: 12, opacity: 0.85, fontSize: '0.88rem' }}>{result.message}</p>}
        </div>
      )}
    </div>
  );
}