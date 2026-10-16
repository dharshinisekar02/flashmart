// =============================================================================
// Cart.jsx - FIXED (with setActivePage + checkout flow)
// =============================================================================
import React, { useState, useEffect } from "react";
import { cartAPI, orderAPI } from "../api/api";

function Cart({ userId, onCartUpdate, showToast, onOrderPlaced, setActivePage }) {
  if (!userId) return null;

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmed, setShowConfirmed] = useState(false);

  useEffect(() => { fetchCart(); }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await cartAPI.getCart(userId);
      setCart(data.cart || null);
      const count = (data.cart?.items || []).reduce((s, i) => s + i.quantity, 0);
      onCartUpdate(count);
    } catch {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = async (productId, newQty) => {
    try {
      const data = await cartAPI.updateQuantity(userId, productId, newQty);
      setCart(data.cart);
      onCartUpdate((data.cart?.items || []).reduce((s, i) => s + i.quantity, 0));
    } catch {
      showToast("Failed to update quantity", "error");
    }
  };

  const handleRemove = async (productId, name) => {
    try {
      const data = await cartAPI.removeItem(userId, productId);
      setCart(data.cart);
      onCartUpdate((data.cart?.items || []).reduce((s, i) => s + i.quantity, 0));
      showToast(`${name} removed from cart`);
    } catch {
      showToast("Failed to remove item", "error");
    }
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const data = await orderAPI.placeOrder(userId);
      if (data.order) {
        setCart(null);
        onCartUpdate(0);
        setShowConfirmed(true);
      }
    } catch {
      showToast("Failed to place order", "error");
    } finally {
      setPlacing(false);
    }
  };

  const handleClearCart = async () => {
    try {
      await cartAPI.clearCart(userId);
      setCart(null);
      onCartUpdate(0);
      showToast("Cart cleared");
    } catch {
      showToast("Failed to clear cart", "error");
    }
  };

  if (loading) return <div className="center-state"><div className="spinner" /><p>Loading cart...</p></div>;
  if (error) return <div className="error-state"><span>⚠️ {error}</span><button onClick={fetchCart}>Retry</button></div>;

  const items = cart?.items || [];
  const total = items.reduce((sum, item) => {
  const price = Number(String(item.unit_price).replace(/[^0-9.]/g, ""));
  const qty = Number(item.quantity);
  return sum + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 0 : qty);
}, 0);

  if (items.length === 0 && !showConfirmed) {
    return (
      <div className="page-container fade-in">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">

      {/* ✅ ORDER CONFIRM MODAL */}
      {showConfirmed && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>🎉 Order Confirmed!</h2>

            <button
              className="modal-btn-primary"
              onClick={() => {
                setShowConfirmed(false);
                onOrderPlaced();
              }}
            >
              View Orders
            </button>

            {/* 🔥 FIXED (no error now) */}
            <button
              onClick={() => {
                setShowConfirmed(false);
                setActivePage("checkout");
              }}
            >
              Proceed to Checkout →
            </button>

            <button
              onClick={() => setShowConfirmed(false)}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <h1>Your Cart</h1>

      {/* ITEMS */}
      {items.map(item => (
        <div key={item.product_id} className="cart-item">
          <p>{item.name}</p>

          <button onClick={() => handleQtyChange(item.product_id, item.quantity - 1)}>-</button>
          {item.quantity}
          <button onClick={() => handleQtyChange(item.product_id, item.quantity + 1)}>+</button>

          <button onClick={() => handleRemove(item.product_id, item.name)}>Remove</button>
        </div>
      ))}

      <h2>Total: ₹{total}</h2>

      {/* 🔥 FIXED NAVIGATION */}
      <button onClick={() => setActivePage("checkout")}>
        Proceed to Checkout →
      </button>

      
    </div>
  );
}

export default Cart;