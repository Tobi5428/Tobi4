import React, { useState } from "react";
import api from "./api";

export default function AirtimePage() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buyAirtime = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/buy-airtime", {
        phone,
        amount,
        billerCode: "BIL099",
        itemCode: "AT099"
      });
      alert(res.data?.message || "Airtime purchase successful");
      setPhone("");
      setAmount("");
    } catch (err) {
      setError(err?.message || "Failed to purchase airtime");
      alert(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Buy Airtime</h2>

      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={buyAirtime} disabled={loading}>{loading ? "Processing..." : "Buy Airtime"}</button>
    </div>
  );
}