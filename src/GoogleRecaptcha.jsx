import ReCAPTCHA from "react-google-recaptcha";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function GoogleRecaptcha({ onChange = () => {} }) {
  if (!SITE_KEY) {
    return (
      <p className="auth-error" role="alert">
        reCAPTCHA is not configured. Set VITE_RECAPTCHA_SITE_KEY to enable verification.
      </p>
    );
  }

  return (
    <ReCAPTCHA
      sitekey={SITE_KEY}
      onChange={onChange}
      onExpired={() => onChange(null)}
    />
  );
}