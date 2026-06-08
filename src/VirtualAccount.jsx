import React, { useState } from "react";
import api from "./api";

export default function VirtualAccount() {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    bvn: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/virtual-account", form);
      alert(res.data?.message || "Virtual account created");
      setForm({ firstname: "", lastname: "", email: "", phone: "", bvn: "" });
    } catch (err) {
      setError(err?.message || "Account creation failed");
      alert(err?.message || "Account creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create Account</h2>

      <input placeholder="First Name"
        onChange={(e)=>setForm({...form, firstname:e.target.value})}
      />

      <input placeholder="Last Name"
        onChange={(e)=>setForm({...form, lastname:e.target.value})}
      />

      <input placeholder="Email"
        onChange={(e)=>setForm({...form, email:e.target.value})}
      />

      <input placeholder="Phone"
        onChange={(e)=>setForm({...form, phone:e.target.value})}
      />

      <input placeholder="BVN"
        onChange={(e)=>setForm({...form, bvn:e.target.value})}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={createAccount} disabled={loading}>{loading ? "Creating..." : "Create"}</button>
    </div>
  );
}