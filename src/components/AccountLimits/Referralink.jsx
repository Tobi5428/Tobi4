// ReferralLink.jsx
import { useEffect, useState } from "react";

export default function ReferralLink() {
  const [referralLink, setReferralLink] = useState("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const token = localStorage.getItem("token"); // adjust to your auth storage
        const res = await fetch("/api/referral/my-link", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setReferralLink(data.referralLink);
          setTotalReferrals(data.totalReferrals);
        }
      } catch (error) {
        console.error("Failed to fetch referral link:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferral();
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Referral Link</h2>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="text" value={referralLink} readOnly style={{ flex: 1 }} />
        <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
      </div>
      <p>Total referrals: {totalReferrals}</p>
    </div>
  );
}