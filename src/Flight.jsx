import React, { useState } from "react";
import api from "./api";

export default function FlightBooking() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);

  const searchFlights = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/flights/search", {
        params: { from, to, date }
      });
      setFlights(res.data?.data || []);
    } catch (err) {
      setError(err?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const bookFlight = async (flight) => {
    if (!bookingEmail) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/flights/pay", {
        email: bookingEmail,
        amount: flight.price,
        flightId: flight.id
      });
      if (res.data?.data?.link) {
        window.location.href = res.data.data.link;
      } else {
        alert("Booking successful");
      }
    } catch (err) {
      setError(err?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Flight Booking (JEGA Travel)</h2>

      <input placeholder="From" onChange={(e) => setFrom(e.target.value)} />
      <input placeholder="To" onChange={(e) => setTo(e.target.value)} />
      <input type="date" onChange={(e) => setDate(e.target.value)} />

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}
      <button onClick={searchFlights} disabled={loading}>Search Flights</button>

      <div>
        {flights.map((f) => (
          <div key={f.id} style={{ border: "1px solid #ccc", margin: 10 }}>
            <h4>{f.airline}</h4>
            <p>Price: ₦{f.price}</p>
            <button 
              onClick={() => {
                setSelectedFlight(f);
                setShowEmailInput(true);
              }}
              disabled={loading}
            >
              Book & Pay
            </button>
          </div>
        ))}
      </div>

      {showEmailInput && selectedFlight && (
        <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px 0" }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={bookingEmail}
            onChange={(e) => setBookingEmail(e.target.value)}
          />
          <button onClick={() => bookFlight(selectedFlight)} disabled={loading}>
            {loading ? "Processing..." : "Confirm Booking"}
          </button>
          <button onClick={() => setShowEmailInput(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}