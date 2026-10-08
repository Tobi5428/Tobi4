import { useState } from 'react';
import api from './api';
import './Airtime.css';

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimePage() {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const buyAirtime = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/buy-airtime', {
        phone,
        amount,
        network,
        billerCode: 'BIL099',
        itemCode: 'AT099',
      });
      setSuccess(res.data?.message || 'Airtime purchase successful');
      setAmount('');
    } catch (err) {
      setError(err?.message || 'Failed to purchase airtime');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="airtime-page">
      <div className="airtime-shell">
        <header className="airtime-hero">
          <p className="airtime-kicker">Top Up</p>
          <h2>Buy Airtime Instantly</h2>
          <p>Fast, secure recharges styled for a clean wallet experience.</p>
        </header>

        <section className="airtime-card">
          <h3>Recharge Details</h3>
          <form className="airtime-form" onSubmit={buyAirtime}>
            <label>
              Phone Number
              <input
                placeholder="0801 234 5678"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>

            <div className="airtime-network-row">
              {NETWORKS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`airtime-network-chip${network === item ? ' active' : ''}`}
                  onClick={() => setNetwork(item)}
                >
                  {item}
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

            <div className="airtime-quick-row">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`airtime-quick-chip${String(value) === String(amount) ? ' active' : ''}`}
                  onClick={() => setAmount(String(value))}
                >
                  NGN {value.toLocaleString()}
                </button>
              ))}
            </div>

            {error && <p className="airtime-error">{error}</p>}
            {success && <p className="airtime-success">{success}</p>}

            <button type="submit" className="airtime-submit" disabled={loading}>
              {loading ? 'Processing...' : 'Buy Airtime'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}