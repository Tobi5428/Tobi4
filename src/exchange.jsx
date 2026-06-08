import React, {
  useEffect,
  useState,
} from "react";

import api from "./api";

const Exchange = () => {
  const [amount, setAmount] = useState(1);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("NGN");
  const [result, setResult] = useState(null);

  const getExchangeRate = async () => {
    try {
      const response = await api.get(
        `/exchange/convert?from=${from}&to=${to}&amount=${amount}`
      );
      setResult(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getExchangeRate();
    const interval = setInterval(() => {
      getExchangeRate();
    }, 5000);

    return () => clearInterval(interval);
  }, [amount, from, to]);

  return (
    <div style={{ padding: 20 }}>
      <h1>JEGA EXCHANGE</h1>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <select value={from} onChange={(e) => setFrom(e.target.value)}>
        <option>USD</option>
        <option>NGN</option>
        <option>EUR</option>
        <option>GBP</option>
      </select>

      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option>NGN</option>
        <option>USD</option>
        <option>EUR</option>
        <option>GBP</option>
      </select>

      <button onClick={getExchangeRate}>Convert</button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>
            {amount} {from} = {" "}
            {result.converted_amount} {" "}
            {to}
          </h2>
          <p>
            Rate: {" "}
            {result.exchange_rate}
          </p>
        </div>
      )}
    </div>
  );
};

export default Exchange;
