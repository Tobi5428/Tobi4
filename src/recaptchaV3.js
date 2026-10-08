const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = 'google-recaptcha-v3';

let scriptPromise;

function loadRecaptchaScript() {
  if (!SITE_KEY) {
    return Promise.reject(new Error('VITE_RECAPTCHA_SITE_KEY is not configured.'));
  }

  if (window.grecaptcha?.execute) {
    return Promise.resolve(window.grecaptcha);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.grecaptcha?.execute) {
          resolve(window.grecaptcha);
        } else {
          script.remove();
          scriptPromise = null;
          reject(new Error('The reCAPTCHA v3 script loaded without its API.'));
        }
      };
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(new Error('Unable to load the reCAPTCHA v3 script.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

export async function executeRecaptcha(action) {
  const recaptcha = await loadRecaptchaScript();

  return new Promise((resolve, reject) => {
    recaptcha.ready(async () => {
      try {
        const token = await recaptcha.execute(SITE_KEY, { action });
        if (!token) {
          reject(new Error('reCAPTCHA did not return a token.'));
          return;
        }
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}
