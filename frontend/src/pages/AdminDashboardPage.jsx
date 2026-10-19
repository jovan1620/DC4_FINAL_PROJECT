
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AdminLayout from './AdminLayout';

const orderStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function money(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function statusLabel(value) {
  const status = orderStatuses.find(
    (entry) => entry.value === value
  );

  return status ? status.label : value || 'Unknown';
}

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/admin/dashboard');
        const data = response.data?.data;

        if (
          !data ||
          typeof data.today_orders !== 'number' ||
          typeof data.pending_orders !== 'number'
        ) {
          throw new Error('Invalid dashboard response.');
        }

        if (active) {
          setDashboard(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            err.message ||
            'Unable to load dashboard.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const recentOrders = dashboard?.recent_orders || [];
  const lowStockItems = dashboard?.low_stock_items || [];

  const cards = [
    {
      title: "Today's Orders",
      value: dashboard?.today_orders ?? '—',
      symbol: '01',
      type: 'orders',
      description: 'Orders placed today',
    },
    {
      title: 'Pending Orders',
      value: dashboard?.pending_orders ?? '—',
      symbol: '02',
      type: 'pending',
      description: 'Awaiting preparation',
    },
    {
      title: "Today's Sales",
      value: dashboard
        ? money(dashboard.today_sales)
        : '—',
      symbol: '03',
      type: 'sales',
      description: 'Orders completed today',
    },
    {
      title: 'Low Stock Items',
      value: dashboard?.low_stock_count ?? '—',
      symbol: '04',
      type: 'stock',
      description: 'Five units or fewer',
    },
  ];

  return (
    <AdminLayout>
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>

          <p>
            Welcome back, {user?.name}.
            Here's what's happening in your canteen.
          </p>

          {dashboard?.date && (
            <span className="admin-report-date">
              Reporting date: {dashboard.date} (Philippine time)
            </span>
          )}
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Dashboard'}
        </button>
      </div>

      {error && (
        <div className="admin-error" role="alert">
          <div>
            <strong>Unable to load dashboard</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      )}

      <section
        className="admin-stats-grid"
        aria-label="Canteen statistics"
      >
        {cards.map((card) => (
          <article
            key={card.title}
            className={`admin-stat-card admin-stat-${card.type}`}
          >
            <div className="admin-stat-header">
              <span>{card.title}</span>
              <div className="admin-stat-icon">
                {card.symbol}
              </div>
            </div>

            <strong className="admin-stat-value">
              {card.value}
            </strong>

            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <div className="admin-overview-grid">
        <section className="admin-panel admin-recent-orders">
          <div className="admin-panel-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>The five most recent customer orders</p>
            </div>
          </div>

          {loading && !dashboard ? (
            <div className="admin-panel-empty">
              Loading orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="admin-panel-empty">
              No orders have been placed yet.
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                        <small>{formatDate(order.created_at)}</small>
                      </td>

                      <td>{order.user?.name || 'Unknown'}</td>

                      <td>{order.items_count ?? 0}</td>

                      <td>
                        <strong>
                          {money(order.total_amount)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            `admin-order-status admin-order-${order.status}`
                          }
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Low Stock Alerts</h2>
              <p>Items needing attention</p>
            </div>

            <span className="admin-low-stock-count">
              {dashboard?.low_stock_count ?? 0}
            </span>
          </div>

          {loading && !dashboard ? (
            <div className="admin-panel-empty">
              Checking stock...
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="admin-panel-empty">
              No low-stock items.
            </div>
          ) : (
            <div className="admin-low-stock-list">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="admin-low-stock-row"
                >
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {!item.is_available
                        ? 'Unavailable'
                        : item.stock_qty <= 0
                        ? 'Out of stock'
                        : 'Low stock'}
                    </small>
                  </div>

                  <span
                    className={
                      item.stock_qty <= 0
                        ? 'admin-stock-quantity empty'
                        : 'admin-stock-quantity'
                    }
                  >
                    {item.stock_qty} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="admin-panel admin-chart-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Recent Order Status</h2>
            <p>
              Distribution of the latest {recentOrders.length} orders
            </p>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-panel-empty">
            Order statistics will appear when orders are placed.
          </div>
        ) : (
          <div className="admin-status-chart">
            {orderStatuses.map((status) => {
              const count = recentOrders.filter(
                (order) => order.status === status.value
              ).length;

              const percentage =
                (count / recentOrders.length) * 100;

              return (
                <div
                  key={status.value}
                  className="admin-chart-row"
                >
                  <span className="admin-chart-label">
                    {status.label}
                  </span>

                  <div className="admin-chart-track">
                    <div
                      className={
                        `admin-chart-fill admin-chart-${status.value}`
                      }
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="admin-footer">
        Canteen Management System · Dashboard data provided by Laravel
      </footer>
    </AdminLayout>
  );
}
