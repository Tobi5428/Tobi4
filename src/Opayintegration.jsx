import React, { useState } from "react";

const OPayIntegration = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  const payWithOpay = async () => {
    const amountValue = Number(amount);
    if (!name.trim() || !email.trim() || !amountValue) {
      alert("Please enter your name, email, and a valid amount.");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          amount: amountValue,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data.cashierUrl) {
        window.location.href = data.cashierUrl;
      } else {
        alert("Payment Failed");
      }
    } catch (error) {
      console.error("OPay payment error:", error);
      alert("Unable to initiate payment. Please try again.");
    }
  };

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      background: "#f4f4f4",
      padding: 50,
      minHeight: "100vh",
    }}>
      <div style={{
        width: 400,
        margin: "auto",
        background: "white",
        padding: 30,
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}>
        <h2 style={{ marginBottom: 20 }}>OPay Payment</h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 15,
            border: "1px solid #ccc",
            borderRadius: 5,
            fontSize: 16,
          }}
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 15,
            border: "1px solid #ccc",
            borderRadius: 5,
            fontSize: 16,
          }}
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 15,
            border: "1px solid #ccc",
            borderRadius: 5,
            fontSize: 16,
          }}
        />

        <button
          type="button"
          onClick={payWithOpay}
          style={{
            width: "100%",
            padding: 15,
            background: "#14b85a",
            color: "white",
            border: "none",
            fontSize: 18,
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default OPayIntegration;
