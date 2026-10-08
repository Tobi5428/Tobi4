// TransactionPin.jsx
import { useState } from "react";

export default function TransactionPin() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!/^\d{4}$/.test(pin)) {
      setMessage("PIN must be exactly 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setMessage("PINs do not match");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // adjust to your auth storage
      const res = await fetch("/api/transaction-pin/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to set PIN");

      setMessage("Transaction PIN set successfully!");
      setPin("");
      setConfirmPin("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Set Transaction PIN</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Enter 4-digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Set PIN"}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}