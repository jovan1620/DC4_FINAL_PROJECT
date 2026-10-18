
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const statuses = [
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

function money(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function displayStatus(status) {
  return status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : 'Unknown';
}

export default function MyOrdersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError('');

    async function fetchOrders() {
      try {
        const response = await api.get('/orders', {
          params: {
            status: status || undefined,
            page,
          },
        });

        if (!active) return;

        const result = response.data;
        const finalPage = Math.max(1, result.last_page || 1);

        setOrders(result.data || []);
        setLastPage(finalPage);
        setTotal(result.total || 0);

        if (page > finalPage) {
          setPage(finalPage);
        }
      } catch (error) {
        if (!active) return;

        setOrders([]);
        setLoadError(
          error.response?.data?.message ||
          'Unable to load your orders. Check your Laravel server.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      active = false;
    };
  }, [status, page, refreshKey]);

  function refreshOrders() {
    setRefreshKey((value) => value + 1);
  }

  async function cancelOrder(order) {
    if (order.status !== 'pending' || busyId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel Order #${order.id}? The ordered stock will be restored.`
    );

    if (!confirmed) return;

    setBusyId(order.id);
    setActionError('');
    setMessage('');

    try {
      const response = await api.post(
        `/orders/${order.id}/cancel`
      );

      setMessage(
        response.data.message ||
        `Order #${order.id} cancelled successfully.`
      );

      refreshOrders();
    } catch (error) {
      setActionError(
        error.response?.data?.message ||
        'Unable to cancel the order. Please try again.'
      );

      // Refresh to show the latest status if someone changed it.
      refreshOrders();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    setSigningOut(true);

    try {
      await logout();
    } catch {
      // AuthContext clears the local token even if logout fails.
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="orders-screen">
      <header className="canteen-topbar">
        <nav className="canteen-topbar-inner">
          <Link to="/menu" className="orders-brand">
            Canteen<span>.</span>
          </Link>

          <Link to="/menu" className="orders-nav-link">
            Menu
          </Link>

          <span className="orders-nav-active">
            My Orders
          </span>

          <div className="canteen-nav-space" />

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
        </nav>
      </header>

      <main className="orders-container">
        <div className="orders-heading">
          <div>
            <h1>My Orders</h1>
            <p>
              View your orders and check their preparation status.
            </p>
          </div>

          <button
            type="button"
            className="orders-refresh"
            onClick={refreshOrders}
            disabled={loading}
          >
            Refresh Orders
          </button>
        </div>

        {message && (
          <div className="canteen-success" role="status">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {actionError && (
          <div className="canteen-error" role="alert">
            {actionError}
          </div>
        )}

        {loadError && (
          <div className="canteen-error" role="alert">
            {loadError}
          </div>
        )}

        <div className="orders-toolbar">
          <label htmlFor="orders-status">
            Filter by Status
          </label>

          <select
            id="orders-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              setExpandedId(null);
              setMessage('');
              setActionError('');
            }}
          >
            <option value="">All Orders</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {displayStatus(value)}
              </option>
            ))}
          </select>

          <span>{total} order(s) found</span>
        </div>

        {loading ? (
          <div className="orders-empty">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <h2>No orders found</h2>
            <p>
              {status
                ? 'You have no orders with this status.'
                : 'You have not placed any orders yet.'}
            </p>
            <Link to="/menu" className="checkout-primary">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const expanded = expandedId === order.id;

              return (
                <article
                  key={order.id}
                  className="orders-card"
                >
                  <div className="orders-card-top">
                    <div>
                      <h2>Order #{order.id}</h2>
                      <p>{formatDate(order.created_at)}</p>
                    </div>

                    <span
                      className={`orders-status orders-status-${order.status}`}
                    >
                      {displayStatus(order.status)}
                    </span>
                  </div>

                  <div className="orders-card-summary">
                    <div>
                      <span>Items</span>
                      <strong>
                        {order.items?.reduce(
                          (sum, item) =>
                            sum + Number(item.quantity),
                          0
                        ) || 0}
                      </strong>
                    </div>

                    <div>
                      <span>Total Amount</span>
                      <strong className="orders-amount">
                        {money(order.total_amount)}
                      </strong>
                    </div>

                    <div>
                      <span>Current Status</span>
                      <strong>
                        {displayStatus(order.status)}
                      </strong>
                    </div>
                  </div>

                  <div className="orders-card-actions">
                    <button
                      type="button"
                      className="orders-details-button"
                      onClick={() =>
                        setExpandedId(
                          expanded ? null : order.id
                        )
                      }
                    >
                      {expanded
                        ? 'Hide Details'
                        : 'View Details'}
                    </button>

                    {order.status === 'pending' && (
                      <button
                        type="button"
                        className="orders-cancel-button"
                        disabled={busyId !== null}
                        onClick={() => cancelOrder(order)}
                      >
                        {busyId === order.id
                          ? 'Cancelling...'
                          : 'Cancel Order'}
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="orders-details">
                      <h3>Ordered Items</h3>

                      {(order.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="orders-item-row"
                        >
                          <div>
                            <strong>
                              {item.menu_item?.name ||
                                `Item #${item.menu_item_id}`}
                            </strong>
                            <small>
                              {money(item.unit_price)} each
                            </small>
                          </div>

                          <span>
                            × {item.quantity}
                          </span>

                          <strong>
                            {money(
                              Number(item.unit_price) *
                                item.quantity
                            )}
                          </strong>
                        </div>
                      ))}

                      <div className="orders-details-total">
                        <strong>Order Total</strong>
                        <strong>
                          {money(order.total_amount)}
                        </strong>
                      </div>

                      <div className="orders-notes">
                        <strong>Order Notes</strong>
                        <p>
                          {order.notes ||
                            'No special instructions.'}
                        </p>
                      </div>

                      {order.status === 'pending' && (
                        <p className="orders-help">
                          You may cancel this order while it
                          is still pending.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="orders-pagination">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => {
              setPage((value) => value - 1);
              setExpandedId(null);
            }}
          >
            Previous
          </button>

          <span>Page {page} of {lastPage}</span>

          <button
            type="button"
            disabled={loading || page >= lastPage}
            onClick={() => {
              setPage((value) => value + 1);
              setExpandedId(null);
            }}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
