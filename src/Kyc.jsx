import React, { useState } from "react";
import api from "./api";

export default function GlobalKYC() {
  const [form, setForm] = useState({
    fullname: "",
    country: "",
    idType: "",
    idNumber: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const endpoint =
        form.country === "Nigeria" ? "/kyc/nigeria" : "/kyc/global";
      await api.post(endpoint, form);
      setSuccess(true);
      alert("KYC submitted successfully");
      setForm({ fullname: "", country: "", idType: "", idNumber: "" });
    } catch (err) {
      setError(err?.message || "KYC submission failed");
      alert(err?.message || "KYC submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input placeholder="Full Name"
        onChange={(e)=>setForm({...form, fullname:e.target.value})}
      />

      <input placeholder="Country"
        onChange={(e)=>setForm({...form, country:e.target.value})}
      />

      <input placeholder="ID Type"
        onChange={(e)=>setForm({...form, idType:e.target.value})}
      />

      <input placeholder="ID Number"
        onChange={(e)=>setForm({...form, idNumber:e.target.value})}
      />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      {success && <div style={{ color: "green", margin: "10px 0" }}>KYC submitted successfully</div>}
      <button onClick={submit} disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
    </div>
  );
}