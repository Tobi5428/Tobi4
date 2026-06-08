import React, { useState, useEffect } from "react";
import { sendLocalTransfer, sendInternationalTransfer, getBankList } from "./api";

export default function Transfer() {
  const [form, setForm] = useState({
    name: "",
    bankCode: "",
    accountNumber: "",
    amount: "",
    currency: "NGN",
    narration: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [banks, setBanks] = useState([]);

  // Load bank list on component mount
  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const response = await getBankList();
      if (response.data) {
        setBanks(response.data);
      }
    } catch (err) {
      console.error("Failed to load banks:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("Recipient name is required");
      return false;
    }
    if (!form.bankCode) {
      setError("Please select a bank");
      return false;
    }
    if (!form.accountNumber.trim()) {
      setError("Account number is required");
      return false;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    return true;
  };

  const sendLocal = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await sendLocalTransfer({
        name: form.name,
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        amount: parseFloat(form.amount),
        currency: form.currency,
        narration: form.narration
      });

      setSuccess(response.message || "Local transfer initiated successfully");
      
      // Reset form
      setForm({
        name: "",
        bankCode: "",
        accountNumber: "",
        amount: "",
        currency: "NGN",
        narration: ""
      });
    } catch (err) {
      const errorMsg = err?.message || err || "Failed to initiate local transfer";
      setError(errorMsg);
      console.error("Transfer error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendInternational = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await sendInternationalTransfer({
        name: form.name,
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        amount: parseFloat(form.amount),
        currency: form.currency,
        narration: form.narration
      });

      setSuccess(response.message || "International transfer initiated successfully");

      // Reset form
      setForm({
        name: "",
        bankCode: "",
        accountNumber: "",
        amount: "",
        currency: "NGN",
        narration: ""
      });
    } catch (err) {
      const errorMsg = err?.message || err || "Failed to initiate international transfer";
      setError(errorMsg);
      console.error("Transfer error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "20px auto", padding: "20px" }}>
      <h2>Transfer Money</h2>

      {error && (
        <div style={{ 
          color: "white", 
          backgroundColor: "#dc3545", 
          padding: "10px", 
          borderRadius: "4px",
          marginBottom: "15px"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          color: "white", 
          backgroundColor: "#28a745", 
          padding: "10px", 
          borderRadius: "4px",
          marginBottom: "15px"
        }}>
          {success}
        </div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Recipient Name *</label>
        <input 
          type="text"
          name="name"
          placeholder="Enter recipient's name"
          value={form.name}
          onChange={handleInputChange}
          disabled={loading}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Bank *</label>
        <select
          name="bankCode"
          value={form.bankCode}
          onChange={handleInputChange}
          disabled={loading}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        >
          <option value="">Select a bank</option>
          {banks.map(bank => (
            <option key={bank.code} value={bank.code}>
              {bank.name} ({bank.code})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Account Number *</label>
        <input
          type="text"
          name="accountNumber"
          placeholder="Enter account number"
          value={form.accountNumber}
          onChange={handleInputChange}
          disabled={loading}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Amount *</label>
        <input
          type="number"
          name="amount"
          placeholder="Enter amount"
          value={form.amount}
          onChange={handleInputChange}
          disabled={loading}
          min="0"
          step="0.01"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Currency</label>
        <select
          name="currency"
          value={form.currency}
          onChange={handleInputChange}
          disabled={loading}
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        >
          <option value="NGN">NGN (Nigerian Naira)</option>
          <option value="USD">USD (US Dollar)</option>
          <option value="GBP">GBP (British Pound)</option>
          <option value="EUR">EUR (Euro)</option>
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Description (Optional)</label>
        <textarea
          name="narration"
          placeholder="Add transfer description"
          value={form.narration}
          onChange={handleInputChange}
          disabled={loading}
          rows="3"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button 
          onClick={sendLocal} 
          disabled={loading}
          style={{ 
            flex: 1, 
            padding: "10px", 
            backgroundColor: "#007bff", 
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Processing..." : "Local Transfer"}
        </button>
        <button 
          onClick={sendInternational} 
          disabled={loading}
          style={{ 
            flex: 1, 
            padding: "10px", 
            backgroundColor: "#28a745", 
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Processing..." : "International Transfer"}
        </button>
      </div>
    </div>
  );
}