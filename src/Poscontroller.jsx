import React, { useState } from "react";
import api from "./api";

const Poscontroller = () => {

  const [amount, setAmount] = useState("");

  const handlePayment = async () => {

    try {

      const res = await api.post("/pos/pay", {
        amount,
        customer_name: "Customer",
        customer_email: "customer@gmail.com",
      });

      window.location.href = res.data.payment_link;

    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>JEGA POS TERMINAL</h2>

      <input
        type="number"
        placeholder="Enter Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={handlePayment}>
        Pay Now
      </button>

    </div>
  );
};

export default Poscontroller;