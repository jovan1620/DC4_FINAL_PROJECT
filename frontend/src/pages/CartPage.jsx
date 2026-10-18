
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function money(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function loadCart(userId) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`canteen_cart_${userId}`) || '[]'
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storageKey = `canteen_cart_${user.id}`;

  const [cart, setCart] = useState(() => loadCart(user.id));
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    let active = true;
    const savedItems = loadCart(user.id);

    if (savedItems.length === 0) {
      setLoading(false);
      return;
    }

    async function loadProducts() {
      const results = await Promise.all(
        savedItems.map(async (item) => {
          try {
            const response = await api.get(
              `/menu-items/${item.menu_item_id}`
            );
            return [item.menu_item_id, response.data.data];
          } catch {
            return [item.menu_item_id, null];
          }
        })
      );

      if (active) {
        setProducts(Object.fromEntries(results));
        setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  function updateQuantity(id, change) {
    setCart((previous) =>
      previous.map((item) => {
        if (item.menu_item_id !== id) return item;

        const product = products[id];
        if (!product) return item;

        const next = item.quantity + change;
        const maximum = Math.min(product.stock_qty, 999);

        if (next < 1 || next > maximum) return item;

        return { ...item, quantity: next };
      })
    );
  }

  function removeItem(id) {
    setCart((previous) =>
      previous.filter((item) => item.menu_item_id !== id)
    );
    setError('');
  }

  const total = cart.reduce((sum, item) => {
    const product = products[item.menu_item_id];
    const price = product ? Number(product.price) : Number(item.price);
    return sum + price * item.quantity;
  }, 0);

  const cartHasProblems = cart.some((item) => {
    const product = products[item.menu_item_id];

    return (
      !product ||
      !product.is_available ||
      product.stock_qty < item.quantity ||
      item.quantity < 1 ||
      item.quantity > 999
    );
  });

  async function placeOrder(event) {
    event.preventDefault();

    if (submitting || loading || cart.length === 0 || cartHasProblems) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/orders', {
        items: cart.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        })),
        notes: notes.trim() || null,
      });

      // Clear the cart only after Laravel confirms success.
      setCart([]);
      localStorage.removeItem(storageKey);
      setSuccessOrder(response.data.data);
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      if (validationErrors) {
        setError(
          Object.values(validationErrors).flat().join(' ')
        );
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to place your order. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (successOrder) {
    return (
      <div className="checkout-screen">
        <header className="checkout-navbar">
          <Link to="/menu" className="checkout-brand">
            Canteen<span>.</span>
          </Link>
        </header>

        <main className="checkout-container">
          <section className="checkout-confirmation">
            <div className="checkout-confirmation-icon">✓</div>
            <h1>Order Placed Successfully!</h1>
            <p>Your order has been sent to the canteen.</p>

            <div className="checkout-receipt">
              <p>
                Order Number:
                <strong> #{successOrder.id}</strong>
              </p>
              <p>
                Status:
                <strong> {successOrder.status || 'pending'}</strong>
              </p>
              <p>
                Total:
                <strong> {money(successOrder.total_amount)}</strong>
              </p>
            </div>

            <p>
  Your order is saved in the system.
  You can track its progress in My Orders.
</p>

<Link to="/orders" className="checkout-primary">
  View My Orders
</Link>

            <button
              type="button"
              className="checkout-primary"
              onClick={() => navigate('/menu')}
            >
              Back to Menu
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-screen">
      <header className="checkout-navbar">
        <div className="checkout-navbar-inner">
          <Link to="/menu" className="checkout-brand">
            Canteen<span>.</span>
          </Link>
          <span>Customer Checkout</span>
          <span>{user.name}</span>
        </div>
      </header>

      <main className="checkout-container">
        <Link to="/menu" className="checkout-back">
          ← Back to Menu
        </Link>

        <div className="checkout-heading">
          <h1>Your Cart</h1>
          <p>Review your items before placing an order.</p>
        </div>

        {error && (
          <div className="canteen-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="checkout-panel">
            Checking current item prices and stock...
          </div>
        ) : cart.length === 0 ? (
          <section className="checkout-panel checkout-empty">
            <h2>Your cart is empty.</h2>
            <p>Add some delicious food from the menu.</p>
            <Link to="/menu" className="checkout-primary">
              Browse Menu
            </Link>
          </section>
        ) : (
          <form onSubmit={placeOrder}>
            <div className="checkout-layout">
              <section className="checkout-panel">
                <h2>Order Items</h2>

                {cart.map((item) => {
                  const product = products[item.menu_item_id];
                  const price = Number(
                    product?.price ?? item.price
                  );

                  const unavailable =
                    !product ||
                    !product.is_available ||
                    product.stock_qty < item.quantity;

                  return (
                    <article
                      className="checkout-item"
                      key={item.menu_item_id}
                    >
                      <div className="checkout-item-info">
                        <h3>{product?.name || item.name}</h3>
                        <p>{money(price)} each</p>

                        {unavailable && (
                          <p className="checkout-warning">
                            {!product
                              ? 'Item could not be loaded.'
                              : !product.is_available
                              ? 'This item is unavailable.'
                              : `Only ${product.stock_qty} left in stock.`}
                          </p>
                        )}
                      </div>

                      <div className="checkout-item-controls">
                        <div className="checkout-quantity">
                          <button
                            type="button"
                            disabled={submitting || item.quantity <= 1}
                            onClick={() =>
                              updateQuantity(item.menu_item_id, -1)
                            }
                            aria-label={`Decrease ${item.name}`}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            disabled={
                              submitting ||
                              !product ||
                              !product.is_available ||
                              item.quantity >=
                                Math.min(product.stock_qty, 999)
                            }
                            onClick={() =>
                              updateQuantity(item.menu_item_id, 1)
                            }
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {money(price * item.quantity)}
                        </strong>

                        <button
                          type="button"
                          className="checkout-remove"
                          disabled={submitting}
                          onClick={() =>
                            removeItem(item.menu_item_id)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}

                <label className="checkout-notes-label" htmlFor="order-notes">
                  Order Notes (Optional)
                </label>
                <textarea
                  id="order-notes"
                  value={notes}
                  maxLength={500}
                  rows={4}
                  disabled={submitting}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Example: Less spicy, no onions..."
                />
                <small>{notes.length}/500 characters</small>
              </section>

              <aside className="checkout-panel checkout-summary">
                <h2>Order Summary</h2>

                <div className="checkout-summary-line">
                  <span>Total Items</span>
                  <strong>
                    {cart.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}
                  </strong>
                </div>

                <div className="checkout-summary-line checkout-total">
                  <span>Estimated Total</span>
                  <strong>{money(total)}</strong>
                </div>

                {cartHasProblems && (
                  <p className="checkout-warning">
                    Please remove unavailable items or adjust
                    quantities before placing the order.
                  </p>
                )}

                <p className="checkout-fineprint">
                  Final prices and stock are verified by Laravel
                  when you submit your order.
                </p>

                <button
                  type="submit"
                  className="checkout-primary"
                  disabled={
                    submitting ||
                    loading ||
                    cartHasProblems ||
                    cart.length === 0
                  }
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </aside>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
