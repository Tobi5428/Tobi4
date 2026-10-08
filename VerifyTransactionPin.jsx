// VerifyTransactionPin.jsx
import { useState } from "react";

export default function VerifyTransactionPin({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!/^\d{4}$/.test(pin)) {
      setMessage("PIN must be exactly 4 digits");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // adjust to your auth storage
      const res = await fetch("/api/transaction-pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");

      setMessage("PIN verified!");
      setPin("");
      if (onSuccess) onSuccess(); // callback to proceed with the transaction
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Enter Transaction PIN</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}