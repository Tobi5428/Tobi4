// Electricity.jsx
import { useEffect, useState } from "react";

export default function Electricity() {
  const [billers, setBillers] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [billerType, setBillerType] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const token = localStorage.getItem("token"); // adjust to your auth storage

  useEffect(() => {
    const fetchBillers = async () => {
      try {
        const res = await fetch("/api/electricity/billers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setBillers(data.billers);
      } catch (error) {
        console.error("Failed to fetch billers:", error);
      }
    };
    fetchBillers();
  }, []);

  const handleBillerChange = (e) => {
    const selected = billers.find((b) => b.item_code === e.target.value);
    setItemCode(selected?.item_code || "");
    setBillerType(selected?.biller_name || "");
  };

  const handleVerify = async () => {
    setMessage("");
    setCustomerName("");
    if (!itemCode || !meterNumber) {
      setMessage("Select a provider and enter a meter number");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/electricity/verify-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemCode, meterNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");

      setCustomerName(data.customerName);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setVerifying(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!customerName) {
      setMessage("Please verify the meter number first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/electricity/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ billerType, meterNumber, amount, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Purchase failed");

      setMessage(`Success! ${data.token ? `Token: ${data.token}` : ""}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Buy Electricity</h2>
      <form onSubmit={handlePurchase}>
        <select value={itemCode} onChange={handleBillerChange}>
          <option value="">Select Provider</option>
          {billers.map((b) => (
            <option key={b.item_code} value={b.item_code}>
              {b.name || b.biller_name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Meter Number"
          value={meterNumber}
          onChange={(e) => setMeterNumber(e.target.value)}
        />
        <button type="button" onClick={handleVerify} disabled={verifying}>
          {verifying ? "Verifying..." : "Verify Meter"}
        </button>

        {customerName && <p>Customer: {customerName}</p>}

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Buy Electricity"}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}