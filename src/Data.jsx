import React, { useState } from "react";
import api from "./api";

export default function DataPage() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buyData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/buy-data", {
        phone,
        amount,
        billerCode: "BIL108",
        itemCode: "DAT001"
      });
      alert(res.data?.message || "Data purchase successful");
      setPhone("");
      setAmount("");
    } catch (err) {
      setError(err?.message || "Failed to purchase data");
      alert(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Buy Data</h2>

      <select onChange={(e) => setNetwork(e.target.value)}>
        <option>MTN</option>
        <option>Airtel</option>
        <option>Glo</option>
        <option>9mobile</option>
      </select>

      <input
        placeholder="Phone"
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        placeholder="Amount"
        onChange={(e) => setAmount(e.target.value)}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={buyData} disabled={loading}>{loading ? "Processing..." : "Buy"}</button>
    </div>
  );
}