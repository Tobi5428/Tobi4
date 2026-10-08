import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendLoginOtp, verifyLoginOtp } from './api';
import './AuthPages.css';
import logo from './assets/jega-logo.jpeg';

const OTP_CHALLENGE_STORAGE_KEY = 'pendingLoginChallenge';

const readStoredChallenge = () => {
  try {
    const raw = sessionStorage.getItem(OTP_CHALLENGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredChallenge = (challenge) => {
  if (!challenge) return;
  sessionStorage.setItem(OTP_CHALLENGE_STORAGE_KEY, JSON.stringify(challenge));
};

const clearStoredChallenge = () => {
  sessionStorage.removeItem(OTP_CHALLENGE_STORAGE_KEY);
};

const enrichChallenge = (challenge) => {
  if (!challenge) return null;

  const now = Date.now();
  return {
    ...challenge,
    expiresAtMs: challenge.expiresAtMs || now + (Number(challenge.expiresInSeconds) || 0) * 1000,
    resendAvailableAtMs:
      challenge.resendAvailableAtMs || now + (Number(challenge.resendAvailableInSeconds) || 0) * 1000,
  };
};

const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) return '00:00';
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const VerifyLoginOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingChallenge = useMemo(() => location.state?.challenge || null, [location.state]);
  const [otpCode, setOtpCode] = useState('');
  const [challenge, setChallenge] = useState(() => enrichChallenge(incomingChallenge || readStoredChallenge()));
  const [error, setError] = useState('');
  const [info, setInfo] = useState(incomingChallenge?.message || 'Enter the code sent to your registered email.');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (incomingChallenge) {
      const normalized = enrichChallenge(incomingChallenge);
      setChallenge(normalized);
      writeStoredChallenge(normalized);
      return;
    }

    if (!challenge) {
      const stored = readStoredChallenge();
      if (stored) {
        setChallenge(enrichChallenge(stored));
      }
    }
  }, [incomingChallenge, challenge]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const id = challenge?.challengeId || challenge?.id;
    if (!id) {
      setError('Your login session expired. Please sign in again.');
    }
  }, [challenge]);

  const expiresInMs = challenge?.expiresAtMs ? Math.max(0, challenge.expiresAtMs - nowMs) : 0;
  const resendInMs = challenge?.resendAvailableAtMs ? Math.max(0, challenge.resendAvailableAtMs - nowMs) : 0;
  const isExpired = Boolean(challenge?.expiresAtMs) && expiresInMs === 0;

  const handleVerify = async (event) => {
    event.preventDefault();
    const challengeId = challenge?.challengeId || challenge?.id;
    if (!challengeId) {
      setError('Your login session expired. Please sign in again.');
      return;
    }
    if (isExpired) {
      setError('This verification code has expired. Request a new OTP to continue.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);
    try {
      const result = await verifyLoginOtp({ challengeId, otp: otpCode });
      if (result?.token) {
        clearStoredChallenge();
        if (result?.loginNotification?.email) {
          setInfo(`Login successful. A security notification has been sent to ${result.loginNotification.email}.`);
          setTimeout(() => navigate('/dashboard'), 1200);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const attemptsMessage =
        typeof err?.attemptsRemaining === 'number'
          ? ` Attempts remaining: ${err.attemptsRemaining}.`
          : '';
      setError(`${err?.message || 'Unable to verify login code.'}${attemptsMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const challengeId = challenge?.challengeId || challenge?.id;
    if (!challengeId) return;
    setError('');
    setInfo('');
    setResendLoading(true);
    try {
      const nextChallenge = await resendLoginOtp(challengeId);
      const normalized = enrichChallenge(nextChallenge);
      setChallenge(normalized);
      writeStoredChallenge(normalized);
      setOtpCode('');
      setInfo(nextChallenge.message || 'A new verification code has been sent.');
    } catch (err) {
      setError(err?.message || 'Unable to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    clearStoredChallenge();
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-pane">
          <div>
            <h1>JEGA</h1>
            <h2>One last step before dashboard access.</h2>
            <p>We sent a one-time passcode to your registered email to verify this login attempt.</p>
          </div>
          <Link to="/" className="auth-home-link">Back to Landing Page</Link>
        </aside>

        <section className="auth-form-pane">
          <div className="auth-top-logo-wrap">
            <img src={logo} alt="JEGA logo" className="auth-top-logo" />
          </div>
          <p className="auth-kicker">Step-Up Verification</p>
          <h3>Verify Login</h3>
          <p className="auth-subtitle">
            {challenge?.maskedEmail
              ? `Enter the 6-digit code sent to ${challenge.maskedEmail}.`
              : 'Enter the 6-digit code sent to your registered email.'}
          </p>

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-success">{info}</p>}

          {challenge && (
            <div className="auth-timer-row">
              <span className={isExpired ? 'auth-timer-expired' : ''}>
                Code expires in {formatCountdown(expiresInMs)}
              </span>
              <span>
                {resendInMs > 0 ? `Resend available in ${formatCountdown(resendInMs)}` : 'You can resend a new code now'}
              </span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleVerify} autoComplete="on">
            <input
              type="text"
              name="otp"
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              disabled={isExpired}
            />
            <button className="auth-submit" type="submit" disabled={loading || otpCode.length !== 6 || isExpired}>
              {loading ? 'Verifying...' : 'Verify and Continue'}
            </button>
            <div className="auth-inline-actions">
              <button className="auth-text-button" type="button" onClick={handleResend} disabled={resendLoading || resendInMs > 0}>
                {resendLoading ? 'Sending...' : 'Resend OTP'}
              </button>
              <button className="auth-text-button" type="button" onClick={handleBack} disabled={loading || resendLoading}>
                Back to Login
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default VerifyLoginOtp;
