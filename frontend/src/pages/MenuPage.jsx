
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const colors = [
  '#BC783C',
  '#E2AD48',
  '#BD6C23',
  '#A24C43',
  '#E2A20F',
  '#AC80BA',
];

function getSavedCart(userId) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`canteen_cart_${userId}`) || '[]'
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function money(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [cart, setCart] = useState(() => getSavedCart(user.id));

  useEffect(() => {
    localStorage.setItem(
      `canteen_cart_${user.id}`,
      JSON.stringify(cart)
    );
  }, [cart, user.id]);

  useEffect(() => {
    let active = true;

    api.get('/categories')
      .then((response) => {
        if (active) {
          setCategories(response.data.data || []);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load food categories.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/menu-items', {
          params: {
            search: search.trim() || undefined,
            category_id: categoryId || undefined,
            available_only: availableOnly ? 1 : undefined,
            page,
            per_page: 6,
          },
        });

        if (!active) return;

        setItems(response.data.data || []);
        setLastPage(response.data.last_page || 1);
        setTotal(response.data.total || 0);
        setError('');
      } catch (err) {
        if (!active) return;

        setItems([]);
        setError(
          err.response?.data?.message ||
          'Could not load the menu. Check your Laravel server.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, categoryId, availableOnly, page]);

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  function addToCart(item) {
    const current = cart.find(
      (entry) => entry.menu_item_id === item.id
    );

    if (current && current.quantity >= item.stock_qty) {
      setNotice(`Only ${item.stock_qty} of ${item.name} are available.`);
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (entry) => entry.menu_item_id === item.id
      );

      if (existing) {
        return previous.map((entry) =>
          entry.menu_item_id === item.id
            ? {
                ...entry,
                quantity: Math.min(
                  entry.quantity + 1,
                  item.stock_qty
                ),
              }
            : entry
        );
      }

      return [
        ...previous,
        {
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
        },
      ];
    });

    setNotice(`${item.name} added to cart!`);
  }

  function removeFromCart(id) {
    setCart((previous) =>
      previous.filter((item) => item.menu_item_id !== id)
    );
  }

  async function handleLogout() {
    setSigningOut(true);

    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="canteen-menu">
      <nav className="canteen-topbar">
        <div className="canteen-topbar-inner">
          <strong className="canteen-brand">
            Canteen<span>.</span>
          </strong>

          <span className="canteen-nav-current">Menu</span>

          <span className="canteen-nav-muted">
            My Orders (coming next)
          </span>

          <div className="canteen-nav-space" />

          <button
            type="button"
            className="canteen-cart-toggle"
            onClick={() => setCartOpen((value) => !value)}
          >
            Cart ({cartCount})
          </button>

          <span className="canteen-user">
            {user.name}
          </span>

          <button
            type="button"
            className="canteen-logout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="canteen-menu-content">
        <div className="canteen-page-heading">
          <h1>Today's Menu</h1>
          <p>Choose your favorite food and drinks.</p>
        </div>

        {notice && (
          <div className="canteen-success" role="status">
            {notice}
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {cartOpen && (
          <section className="canteen-cart-preview">
            <div className="canteen-cart-heading">
              <h2>Your Cart ({cartCount})</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
              >
                Close
              </button>
            </div>

            {cart.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div
                    className="canteen-cart-row"
                    key={item.menu_item_id}
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>

                    <strong>
                      {money(item.price * item.quantity)}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(item.menu_item_id)
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="canteen-cart-total">
                  <strong>Total</strong>
                  <strong>{money(cartTotal)}</strong>
                </div>

                <button
  type="button"
  className="checkout-primary"
  onClick={() => navigate('/cart')}
>
  Proceed to Checkout
</button>
              </>
            )}
          </section>
        )}

        <div className="canteen-filters">
          <input
            type="search"
            aria-label="Search dishes"
            placeholder="Search dishes..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Filter categories"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="canteen-checkbox">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => {
                setAvailableOnly(event.target.checked);
                setPage(1);
              }}
            />
            Available only
          </label>
        </div>

        {error && (
          <div className="canteen-error">{error}</div>
        )}

        {loading ? (
          <div className="canteen-empty">
            Loading menu items...
          </div>
        ) : items.length === 0 ? (
          <div className="canteen-empty">
            No food items found. Try changing your filters.
          </div>
        ) : (
          <div className="canteen-food-grid">
            {items.map((item, index) => {
              const soldOut =
                !item.is_available || item.stock_qty <= 0;

              const lowStock =
                !soldOut && item.stock_qty <= 5;

              const inCart = cart.find(
                (entry) => entry.menu_item_id === item.id
              );

              const cartLimitReached =
                inCart && inCart.quantity >= item.stock_qty;

              return (
                <article className="canteen-food-card" key={item.id}>
                  <div
                    className="canteen-card-banner"
                    style={{
                      backgroundColor:
                        colors[(item.id - 1 + colors.length) % colors.length],
                    }}
                  >
                    <div className="canteen-food-initial">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="canteen-food-body">
                    <h2>{item.name}</h2>

                    <span className="canteen-category-tag">
                      {item.category?.name || 'Uncategorized'}
                    </span>

                    <p className="canteen-description">
                      {item.description || 'Freshly prepared canteen item.'}
                    </p>

                    <div className="canteen-food-bottom">
                      <strong className="canteen-price">
                        {money(item.price)}
                      </strong>

                      <span
                        className={
                          soldOut || lowStock
                            ? 'canteen-stock canteen-stock-low'
                            : 'canteen-stock'
                        }
                      >
                        {soldOut
                          ? 'Sold out'
                          : lowStock
                          ? `Only ${item.stock_qty} left`
                          : `Stock: ${item.stock_qty}`}
                      </span>

                      <button
                        type="button"
                        className="canteen-add-button"
                        disabled={soldOut || Boolean(cartLimitReached)}
                        onClick={() => addToCart(item)}
                      >
                        {soldOut
                          ? 'Sold out'
                          : cartLimitReached
                          ? 'Max added'
                          : 'Add'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="canteen-pagination">
          <div className="canteen-page-buttons">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              &lt;
            </button>

            <span>Page {page} of {lastPage}</span>

            <button
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              &gt;
            </button>
          </div>

          <span>Showing {items.length} of {total} items</span>
        </footer>
      </main>
    </div>
  );
}
