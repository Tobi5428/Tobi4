import { useEffect, useMemo, useState } from 'react';
import './exchange.css';

const FLUTTERWAVE_OPERATING_COUNTRIES = [
  { country: 'Nigeria', currency: 'NGN' },
  { country: 'Ghana', currency: 'GHS' },
  { country: 'Kenya', currency: 'KES' },
  { country: 'Uganda', currency: 'UGX' },
  { country: 'Tanzania', currency: 'TZS' },
  { country: 'Rwanda', currency: 'RWF' },
  { country: 'South Africa', currency: 'ZAR' },
  { country: 'Zambia', currency: 'ZMW' },
  { country: 'Cameroon', currency: 'XAF' },
  { country: "Cote d'Ivoire", currency: 'XOF' },
  { country: 'Senegal', currency: 'XOF' },
  { country: 'Benin', currency: 'XOF' },
  { country: 'Burkina Faso', currency: 'XOF' },
  { country: 'Mali', currency: 'XOF' },
  { country: 'Niger', currency: 'XOF' },
  { country: 'Togo', currency: 'XOF' },
  { country: 'Guinea', currency: 'GNF' },
  { country: 'Sierra Leone', currency: 'SLE' },
  { country: 'Liberia', currency: 'LRD' },
  { country: 'Malawi', currency: 'MWK' },
  { country: 'Mozambique', currency: 'MZN' },
  { country: 'Namibia', currency: 'NAD' },
  { country: 'Botswana', currency: 'BWP' },
  { country: 'Egypt', currency: 'EGP' },
  { country: 'Morocco', currency: 'MAD' },
  { country: 'Tunisia', currency: 'TND' },
  { country: 'Algeria', currency: 'DZD' },
  { country: 'Ethiopia', currency: 'ETB' },
  { country: 'Angola', currency: 'AOA' },
  { country: 'United States', currency: 'USD' },
  { country: 'United Kingdom', currency: 'GBP' },
  { country: 'Canada', currency: 'CAD' },
  { country: 'Euro Area', currency: 'EUR' },
];

const distinctCurrencies = [...new Set(FLUTTERWAVE_OPERATING_COUNTRIES.map((item) => item.currency))].sort();

const Exchange = () => {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('NGN');
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRates = async (baseCurrency = from) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rates (${response.status})`);
      }

      const data = await response.json();
      if (data?.result !== 'success' || !data?.rates) {
        throw new Error('Rate service did not return valid data.');
      }

      setRates(data.rates);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Could not load live exchange rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(from);
    const refresh = setInterval(() => fetchRates(from), 60 * 1000);
    return () => clearInterval(refresh);
  }, [from]);

  const conversion = useMemo(() => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !rates[to]) return null;
    return {
      converted: numericAmount * rates[to],
      rate: rates[to],
    };
  }, [amount, rates, to]);

  const marketBoard = useMemo(() => {
    return FLUTTERWAVE_OPERATING_COUNTRIES.map((market) => ({
      ...market,
      rate: rates[market.currency],
    }));
  }, [rates]);

  return (
    <div className="fx-page">
      <div className="fx-shell">
        <header className="fx-hero">
          <p className="fx-kicker">Live Markets</p>
          <h2>Exchange Rates Across Flutterwave Markets</h2>
          <p>
            Real-time market data updates every minute. Rates shown as 1 {from} equals each local currency value.
          </p>
          <button type="button" className="fx-refresh" onClick={() => fetchRates(from)} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Rates'}
          </button>
        </header>

        <section className="fx-converter-card">
          <h3>Currency Converter</h3>
          <div className="fx-converter-grid">
            <label>
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label>
              From
              <select value={from} onChange={(event) => setFrom(event.target.value)}>
                {distinctCurrencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>

            <label>
              To
              <select value={to} onChange={(event) => setTo(event.target.value)}>
                {distinctCurrencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
          </div>

          {conversion && (
            <div className="fx-result">
              <strong>{Number(amount || 0).toLocaleString()} {from}</strong>
              <span>=</span>
              <strong>{conversion.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}</strong>
              <p>Rate: 1 {from} = {conversion.rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {to}</p>
            </div>
          )}

          {error && <p className="fx-error">{error}</p>}
          {lastUpdated && <p className="fx-updated">Last updated: {new Date(lastUpdated).toLocaleString()}</p>}
        </section>

        <section className="fx-board-card">
          <div className="fx-board-head">
            <h3>Operating Countries and Live Rates</h3>
            <p>Base currency: {from}</p>
          </div>

          <div className="fx-table-wrap">
            <table className="fx-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Currency</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {marketBoard.map((row) => (
                  <tr key={`${row.country}-${row.currency}`}>
                    <td>{row.country}</td>
                    <td>{row.currency}</td>
                    <td>{row.rate ? row.rate.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'Loading...'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Exchange;
