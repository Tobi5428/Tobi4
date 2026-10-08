import { useMemo, useState } from 'react';
import api from './api';
import './Data.css';

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];
const PLANS = {
  MTN: [
    { label: '500MB', amount: 300 },
    { label: '1.5GB', amount: 1000 },
    { label: '3GB', amount: 1500 },
    { label: '10GB', amount: 5000 },
  ],
  Airtel: [
    { label: '750MB', amount: 500 },
    { label: '1.5GB', amount: 1000 },
    { label: '4GB', amount: 2000 },
    { label: '8GB', amount: 4000 },
  ],
  Glo: [
    { label: '1GB', amount: 500 },
    { label: '2.5GB', amount: 1000 },
    { label: '5.8GB', amount: 2000 },
    { label: '13GB', amount: 5000 },
  ],
  '9mobile': [
    { label: '500MB', amount: 500 },
    { label: '1GB', amount: 1000 },
    { label: '4.5GB', amount: 2000 },
    { label: '11GB', amount: 5000 },
  ],
};

export default function DataPage() {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activePlans = useMemo(() => PLANS[network] || [], [network]);

  const buyData = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/buy-data', {
        phone,
        amount,
        network,
        billerCode: 'BIL108',
        itemCode: 'DAT001',
      });
      setSuccess(res.data?.message || 'Data purchase successful');
      setAmount('');
      setSelectedPlan('');
    } catch (err) {
      setError(err?.message || 'Failed to purchase data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-page">
      <div className="data-shell">
        <header className="data-hero">
          <p className="data-kicker">Bundles</p>
          <h2>Buy Data Plan</h2>
          <p>Choose a network, tap a bundle, and complete payment in seconds.</p>
        </header>

        <section className="data-card">
          <h3>Data Purchase</h3>

          <form className="data-form" onSubmit={buyData}>
            <label>
              Phone Number
              <input
                placeholder="0801 234 5678"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>

            <div className="data-network-row">
              {NETWORKS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`data-network-chip${network === item ? ' active' : ''}`}
                  onClick={() => {
                    setNetwork(item);
                    setAmount('');
                    setSelectedPlan('');
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="data-plan-grid">
              {activePlans.map((plan) => (
                <button
                  key={`${network}-${plan.label}`}
                  type="button"
                  className={`data-plan-card${selectedPlan === plan.label ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedPlan(plan.label);
                    setAmount(String(plan.amount));
                  }}
                >
                  <strong>{plan.label}</strong>
                  <span>NGN {plan.amount.toLocaleString()}</span>
                </button>
              ))}
            </div>

            <label>
              Amount (NGN)
              <input
                placeholder="Enter amount"
                type="number"
                min="50"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            {error && <p className="data-error">{error}</p>}
            {success && <p className="data-success">{success}</p>}

            <button type="submit" className="data-submit" disabled={loading}>
              {loading ? 'Processing...' : 'Buy Data'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}