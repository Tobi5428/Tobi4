import React, { useState } from "react";
import api from "./api";

export default function VirtualCard() {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    amount: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createCard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/card/create-virtual", form);
      alert(res.data?.message || "Card Created");
      setForm({ firstname: "", lastname: "", email: "", amount: "" });
    } catch (err) {
      setError(err?.message || "Card creation failed");
      alert(err?.message || "Card creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Virtual Card</h2>

      <input placeholder="First Name"
        onChange={(e)=>setForm({...form, firstname:e.target.value})}
      />

      <input placeholder="Last Name"
        onChange={(e)=>setForm({...form, lastname:e.target.value})}
      />

      <input placeholder="Email"
        onChange={(e)=>setForm({...form, email:e.target.value})}
      />

      <input placeholder="Amount"
        onChange={(e)=>setForm({...form, amount:e.target.value})}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={createCard} disabled={loading}>{loading ? "Creating..." : "Create Card"}</button>
    </div>
  );
}