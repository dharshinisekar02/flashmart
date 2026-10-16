import React, { useEffect, useState } from "react";
import { cartAPI, addressAPI, orderAPI } from "../api/api";

const BASE_URL = "https://0nusevsdnb.execute-api.ap-southeast-1.amazonaws.com";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

function Checkout({ userId, showToast }) {
  const [cart, setCart] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
  try {
    const cartData = await cartAPI.getCart(userId);
    const addressData = await addressAPI.getAll(userId);

    const items = Array.isArray(cartData.cart?.items)
      ? cartData.cart.items
      : [];

    setCart(items);
    setAddresses(addressData.addresses || []);

    const defaultAddr = addressData.addresses?.find(a => a.is_default);
    setSelectedAddress(defaultAddr || addressData.addresses?.[0]);
  } catch {
    showToast("Failed to load checkout data ❌", "error");
  }
};

  useEffect(() => {
    loadData();
  }, []);

  
  const total = cart.reduce((sum, item) => {
  const price = Number(String(item.price).replace(/[^0-9.]/g, ""));
  const qty = Number(item.quantity);
  return sum + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 0 : qty);
}, 0);

 const handleOrder = async () => {
  if (!selectedAddress) {
    showToast("Select address first ⚠️", "error");
    return;
  }

  if (total <= 0) {
    showToast("Cart is empty ⚠️", "error");
    return;
  }

  // ✅ ADD THIS BACK
  const sdkLoaded = await loadRazorpay();
  if (!sdkLoaded) {
    showToast("Razorpay SDK failed ❌", "error");
    return;
  }

  setLoading(true);
  // ... rest of your code

  try {
    // Step 1: Initiate payment
    const orderId = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/payments/initiate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        order_id:         orderId,
        amount:           total,
        delivery_address: selectedAddress
      }),
    });
    const order = await res.json();

    if (!res.ok) {
      showToast(order.error || "Payment initiation failed ❌", "error");
      return;
    }

    // Step 2: Open Razorpay checkout
    const options = {
      key:         order.razorpay_key_id,   // ✅ from lambda
      amount:      order.amount_paise,       // ✅ from lambda
      currency:    "INR",
      name:        "Flashmart",
      description: "Order Payment",
      order_id:    order.razorpay_order_id,  // ✅ from lambda

      handler: async function (response) {
        try {
          // Step 3: Verify payment
          const verifyRes = await fetch(`${BASE_URL}/payments/verify`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              payment_id:          order.payment_id
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            showToast("Order placed successfully 🎉", "success");
          } else {
            showToast(verifyData.error || "Verification failed ❌", "error");
          }
        } catch {
          showToast("Payment verification failed ❌", "error");
        }
      },

      theme: { color: "#ff6b00" }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();

  } catch {
    showToast("Payment failed ❌", "error");
  } finally {
    setLoading(false);
  }
};

  const loadRazorpay = () => {
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  return (
    <div className="page-container">

      <h2>🧾 Checkout</h2>

      {/* CART ITEMS */}
      <h3>🛒 Items</h3>
      {cart.map((item, i) => (
        <div key={i} className="card">
          <p>{item.name} × {item.quantity}</p>
          <p>₹{Number(String(item.price).replace(/[^0-9.]/g, "")) * Number(item.quantity)}</p>
        </div>
      ))}

      <h3>Total: ₹{total}</h3>

      {/* ADDRESS */}
      <h3>📍 Select Address</h3>

      {addresses.map(addr => (
        <div
          key={addr.address_id}
          className={`card ${selectedAddress?.address_id === addr.address_id ? "active" : ""}`}
          onClick={() => setSelectedAddress(addr)}
        >
          <p><strong>{addr.name}</strong></p>
          <p>{addr.line1}, {addr.city}</p>
          <p>{addr.state} - {addr.pincode}</p>
        </div>
      ))}

      {/* BUTTON */}
      <button onClick={handleOrder} disabled={loading}>
        {loading ? "Processing..." : "Place Order 💳"}
      </button>

    </div>
  );
}

export default Checkout;