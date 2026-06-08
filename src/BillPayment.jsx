import React, { useState } from "react";
import api from "./api";

export default function Bills() {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [service, setService] = useState("electricity");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const payBill = async () => {
    setLoading(true);
    setError("");
    try {
      let billerCode = "";
      let itemCode = "";

      if (service === "electricity") {
        billerCode = "BIL120";
        itemCode = "ELE001";
      }

      if (service === "dstv") {
        billerCode = "BIL121";
        itemCode = "TV001";
      }

      const res = await api.post("/pay-bill", {
        customer,
        amount,
        billerCode,
        itemCode
      });

      alert(res.data?.message || "Bill payment successful");
      setCustomer("");
      setAmount("");
    } catch (err) {
      setError(err?.message || "Payment failed");
      alert(err?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Pay Bills</h2>

      <select onChange={(e) => setService(e.target.value)}>
        <option value="electricity">Electricity</option>
        <option value="dstv">DSTV</option>
      </select>

      <input
        placeholder="Meter / Smartcard Number"
        onChange={(e) => setCustomer(e.target.value)}
      />

      <input
        placeholder="Amount"
        onChange={(e) => setAmount(e.target.value)}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={payBill} disabled={loading}>{loading ? "Processing..." : "Pay Now"}</button>
    </div>
  );
}