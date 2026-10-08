import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Plus, ArrowDownToLine, Send, Landmark } from 'lucide-react';
import { initiateTransfer, createVirtualAccount } from '../services/Flutterwaveservice';
import { getCurrentUser, initiatePayment, verifyPayment } from '../api';

function WalletCard({ balance }) {
  const KYC_STORAGE_KEY = 'jegaKycStatus';
  const [visible, setVisible] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const txRef = searchParams.get('tx_ref');
    const providerTransactionId = searchParams.get('transaction_id');
    if (!txRef || !providerTransactionId) return;

    setBusyAction('verify');
    verifyPayment({ tx_ref: txRef, providerTransactionId })
      .then((result) => {
        setMessage({
          type: result?.success ? 'success' : 'warning',
          text: result?.success
            ? 'Payment verified successfully.'
            : `Payment is not confirmed yet. Status: ${result?.status || 'pending'}.`,
        });
      })
      .catch((error) => {
        setMessage({ type: 'danger', text: error?.message || 'Unable to verify payment.' });
      })
      .finally(() => {
        setBusyAction(null);
        setSearchParams({}, { replace: true });
      });
  }, [searchParams, setSearchParams]);

  const runAddMoney = async () => {
    setBusyAction('add');
    setMessage(null);
    try {
      const current = await getCurrentUser();
      const user = current?.user || current || {};
      const paymentData = {
        amount: 1000,
        email: user?.email,
        firstName: user?.firstName || user?.businessName || 'JEGA',
        lastName: user?.lastName || 'User',
        phone: user?.phone || '08000000000',
        orderId: `wallet_${Date.now()}`,
      };

      const result = await initiatePayment(paymentData);
      const checkoutLink = result?.data?.link;
      if (checkoutLink) {
        window.location.assign(checkoutLink);
        return;
      }

      const reference = result?.data?.reference || result?.reference || null;
      setMessage({
        type: result?.code === 'RISK_REVIEW_REQUIRED' ? 'warning' : 'success',
        text: result?.message || (reference
          ? `Payment initiated successfully. Reference: ${reference}`
          : 'Payment initiated successfully.'),
      });
    } catch (err) {
      setMessage({ type: 'danger', text: err?.message || 'Unable to initiate payment.' });
    } finally {
      setBusyAction(null);
    }
  };

  const runAction = async (key, fn) => {
    if (key === 'virtual-account') {
      let isVerified = false;
      try {
        const raw = localStorage.getItem(KYC_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        isVerified = Boolean(parsed?.isVerified);
      } catch {
        isVerified = false;
      }

      if (!isVerified) {
        setMessage({ type: 'danger', text: 'Complete KYC verification before creating a virtual account.' });
        return;
      }
    }

    setBusyAction(key);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'success', text: `${key} action completed.` });
    } catch (err) {
      console.error(`${key} failed:`, err);
      setMessage({ type: 'danger', text: err?.message || `${key} action failed.` });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="jega-wallet-card mb-4">
      {message && <div className={`alert alert-${message.type} py-2 mb-3`}>{message.text}</div>}

      <div className="d-flex justify-content-between align-items-start">
        <div>
          <p className="jega-wallet-label">Available Balance</p>
          <div className="d-flex align-items-center gap-2">
            <h2 className="jega-wallet-balance mb-0">
              {visible ? `₦${Number(balance?.available ?? 0).toLocaleString()}` : '••••••••'}
            </h2>
            <button className="jega-eye-btn" onClick={() => setVisible((v) => !v)} aria-label="Toggle balance visibility">
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="jega-wallet-pending">
            Pending: {visible ? `₦${Number(balance?.pending ?? 0).toLocaleString()}` : '••••'}
          </p>
        </div>
      </div>

      <div className="jega-wallet-actions">
        <button
          className="jega-wallet-btn"
          onClick={runAddMoney}
          disabled={busyAction === 'add'}
        >
          <Plus size={16} /> {busyAction === 'add' ? 'Initiating...' : 'Add Money'}
        </button>
        <button
          className="jega-wallet-btn"
          onClick={() => runAction('withdraw', initiateTransfer)}
          disabled={busyAction === 'withdraw'}
        >
          <ArrowDownToLine size={16} /> Withdraw
        </button>
        <button
          className="jega-wallet-btn"
          onClick={() => runAction('transfer', initiateTransfer)}
          disabled={busyAction === 'transfer'}
        >
          <Send size={16} /> Transfer
        </button>
        <button
          className="jega-wallet-btn"
          onClick={() => runAction('virtual-account', createVirtualAccount)}
          disabled={busyAction === 'virtual-account'}
        >
          <Landmark size={16} /> Virtual Account
        </button>
      </div>
    </div>
  );
}

export default WalletCard;