import React, { useEffect, useState } from 'react';

function Customercare() {
  const [loaded, setLoaded] = useState(false);
  const [chatError, setChatError] = useState(false);

  useEffect(() => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const existing = document.getElementById('tawk-script');
    if (existing) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'tawk-script';
    script.async = true;
    script.src = 'https://embed.tawk.to/6a05fe41f7c7ab1c39ff2fdb/1i3vh6p2h';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.onload = () => {
      setLoaded(true);
      setChatError(false);
    };
    script.onerror = () => {
      setChatError(true);
      setLoaded(false);
    };

    document.body.appendChild(script);
  }, []);

  const openChat = () => {
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
      window.Tawk_API.maximize();
      return;
    }

    setChatError(true);
  };

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: 24, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
      <h2 style={{ marginBottom: 8 }}>Customer Care</h2>
      <p style={{ color: '#64748b', marginBottom: 20 }}>Get help with support, account issues, or chat with our team directly.</p>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div style={{ padding: 16, borderRadius: 16, background: '#f8fafc' }}>
          <h4 style={{ marginBottom: 8 }}>Support Hotline</h4>
          <p style={{ margin: 0 }}>+234 700 123 4567</p>
        </div>
        <div style={{ padding: 16, borderRadius: 16, background: '#f8fafc' }}>
          <h4 style={{ marginBottom: 8 }}>Email</h4>
          <p style={{ margin: 0 }}>Support@jegainnovation.com</p>
        </div>
        <div style={{ padding: 16, borderRadius: 16, background: '#f8fafc' }}>
          <h4 style={{ marginBottom: 8 }}>Live Chat</h4>
          <p style={{ margin: 0 }}>{loaded ? 'Live chat is available now.' : 'Initializing live chat...'}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openChat}
              style={{
                border: 0,
                borderRadius: 999,
                background: '#1f457c',
                color: '#fff',
                padding: '8px 14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open Live Chat
            </button>
            <a
              href="mailto:Support@jegainnovation.com"
              style={{
                textDecoration: 'none',
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '8px 14px',
                fontWeight: 600,
              }}
            >
              Send Email
            </a>
          </div>
          {chatError && (
            <p style={{ margin: '10px 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>
              Live chat is currently unavailable. Please use email support while we reconnect.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Customercare;