import React, { useEffect, useState } from "react";

const OneTimeAccount = () => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_URL = `${import.meta.env.VITE_API_URL}/one-time-account`;

    const fetchAccount = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setAccount(data);
      } catch (err) {
        console.error("Failed to fetch account details:", err);
        setError("Failed to load account details");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, []);

  const copyAccount = async () => {
    if (!account?.account_number) return;

    try {
      await navigator.clipboard.writeText(account.account_number);
      alert("Account number copied");
    } catch (err) {
      console.error("Failed to copy account number:", err);
      alert("Unable to copy account number.");
    }
  };

  return (
    <div
      style={{
        background: "#f5f7fb",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 380,
          background: "#ffffff",
          borderRadius: 20,
          padding: 25,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#0052cc",
            }}
          >
            JEGA BANK
          </div>
          <div
            style={{
              background: "#e6f9ed",
              color: "#0f9d58",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            ACTIVE
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            marginBottom: 20,
            color: "#333",
            fontWeight: "bold",
          }}
        >
          One Time Payment Account
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#777",
              padding: 20,
            }}
          >
            Loading account details...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              color: "#777",
              padding: 20,
            }}
          >
            {error}
          </div>
        ) : (
          <>
            <div
              style={{
                background: "#0d47a1",
                color: "white",
                borderRadius: 15,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.8,
                  marginBottom: 10,
                }}
              >
                Account Number
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginBottom: 15,
                }}
              >
                {account.account_number}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <div>{account.bank_name}</div>
                <div>₦{account.amount}</div>
              </div>
            </div>

            <div
              style={{
                background: "#f4f6fb",
                padding: 15,
                borderRadius: 12,
                marginBottom: 15,
              }}
            >
              <p style={{ marginBottom: 8, color: "#555", fontSize: 14 }}>
                Account Name:{" "}
                <span style={{ fontWeight: "bold", color: "#111" }}>
                  {account.account_name}
                </span>
              </p>
              <p style={{ marginBottom: 8, color: "#555", fontSize: 14 }}>
                Expiry:{" "}
                <span style={{ fontWeight: "bold", color: "#111" }}>
                  {account.expiry}
                </span>
              </p>
              <p style={{ marginBottom: 0, color: "#555", fontSize: 14 }}>
                Reference:{" "}
                <span style={{ fontWeight: "bold", color: "#111" }}>
                  {account.reference}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={copyAccount}
              style={{
                width: "100%",
                padding: 14,
                border: "none",
                borderRadius: 12,
                background: "#0052cc",
                color: "white",
                fontSize: 16,
                cursor: "pointer",
                transition: "0.3s",
              }}
            >
              Copy Account Number
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OneTimeAccount;
