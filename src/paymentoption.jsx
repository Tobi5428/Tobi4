import React, { useEffect, useState } from "react";

const PaymentOption = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const payNow = () => {
    if (!window.FlutterwaveCheckout) {
      console.error("Flutterwave script not loaded yet.");
      alert("Payment script is still loading. Please try again in a moment.");
      return;
    }

    const amountValue = Number(amount);
    if (!name.trim() || !email.trim() || !amountValue) {
      alert("Please enter your name, email, and a valid amount.");
      return;
    }

    window.FlutterwaveCheckout({
      public_key: "FLWPUBK_TEST-31bfb156018ff446f021dd6a38d2b1fe-X",
      tx_ref: `JEGA-${Date.now()}`,
      amount: amountValue,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd,account,mobilemoney",
      customer: {
        email,
        phone_number: "08100000000",
        name,
      },
      customizations: {
        title: "JEGA Fintech",
        description: "Payment for Banking Services",
        logo: "https://yourwebsite.com/logo.png",
      },
      callback: function (response) {
        console.log(response);
        alert(`Payment Successful\nTransaction ID: ${response.transaction_id}`);
      },
      onclose: function () {
        console.log("Payment Closed");
      },
    });
  };

  return (
    <div style={{
      margin: 0,
      padding: 0,
      fontFamily: "Arial, sans-serif",
      background: "#f4f6f9",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 400,
        background: "white",
        padding: 30,
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}>
        <h2 style={{
          textAlign: "center",
          marginBottom: 20,
          color: "#222",
        }}>
          JEGA Bank Payment
        </h2>

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
          onClick={payNow}
          style={{
            width: "100%",
            padding: 15,
            background: "#ff7a00",
            color: "white",
            border: "none",
            borderRadius: 5,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default PaymentOption;
