
import { useEffect, useState } from 'react';
import api from '../services/api';
import AdminLayout from './AdminLayout';
import './AdminOrders.css';

const statuses = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const nextStatuses = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

function labelStatus(status) {
  return status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : 'Unknown';
}

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

function getErrorMessage(error) {
  const errors = error.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join(' ');
  }

  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`admin-order-status admin-order-${status}`}
    >
      {labelStatus(status)}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailRefreshKey, setDetailRefreshKey] =
    useState(0);

  function refreshOrders() {
    setRefreshKey((value) => value + 1);
  }

  function notify(type, message) {
    setToast({ type, message });
  }

  // FETCH ALL ORDERS FOR ADMIN
  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError('');

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/admin/orders', {
          params: {
            search: search.trim() || undefined,
            status: status || undefined,
            date: date || undefined,
            page,
            per_page: 10,
          },
        });

        if (!active) return;

        const result = response.data;

        if (!Array.isArray(result.data)) {
          throw new Error('Invalid order list received.');
        }

        const last = Math.max(1, result.last_page || 1);

        setOrders(result.data);
        setTotal(result.total || 0);
        setLastPage(last);

        if (page > last) {
          setPage(last);
        }
      } catch (error) {
        if (!active) return;

        setOrders([]);
        setLoadError(getErrorMessage(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    search,
    status,
    date,
    page,
    refreshKey,
  ]);

  // FETCH THE COMPLETE DETAILS OF ONE ORDER
  // The existing GET /orders/{id} endpoint permits admins.
  useEffect(() => {
    if (selectedId === null) {
      setSelectedOrder(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let active = true;

    async function fetchDetails() {
      setDetailLoading(true);
      setDetailError('');
      setSelectedOrder(null);

      try {
        const response = await api.get(
          `/orders/${selectedId}`
        );

        if (!active) return;

        if (!response.data?.data) {
          throw new Error('Order details are missing.');
        }

        setSelectedOrder(response.data.data);
      } catch (error) {
        if (active) {
          setDetailError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    fetchDetails();

    return () => {
      active = false;
    };
  }, [selectedId, detailRefreshKey]);

  function openDetails(order) {
    setSelectedId(order.id);
  }

  function closeDetails() {
    if (busyId !== null) return;

    setSelectedId(null);
    setSelectedOrder(null);
    setDetailError('');
  }

  function clearFilters() {
    setSearch('');
    setStatus('');
    setDate('');
    setPage(1);
  }

  // UPDATE ORDER STATUS IN LARAVEL
  async function handleUpdateStatus(order) {
    if (busyId !== null) return;

    const next = nextStatuses[order.status];

    if (!next) {
      notify(
        'error',
        'This order cannot be advanced to another status.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Update Order #${order.id}?\n\n` +
      `${labelStatus(order.status)} → ${labelStatus(next)}`
    );

    if (!confirmed) return;

    setBusyId(order.id);
    setToast(null);

    try {
      const response = await api.patch(
        `/admin/orders/${order.id}/status`,
        { status: next }
      );

      notify(
        'success',
        response.data?.message ||
          `Order #${order.id} is now ${labelStatus(next)}.`
      );

      refreshOrders();

      if (selectedId === order.id) {
        setDetailRefreshKey((value) => value + 1);
      }
    } catch (error) {
      notify('error', getErrorMessage(error));

      // Reload current data in case someone else
      // changed the order at the same time.
      refreshOrders();

      if (selectedId === order.id) {
        setDetailRefreshKey((value) => value + 1);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      {/* FLOATING SUCCESS / ERROR NOTIFICATION */}
      {toast && (
        <div
          role={
            toast.type === 'error' ? 'alert' : 'status'
          }
          className={`admin-orders-toast ${toast.type}`}
        >
          <div>
            <strong>
              {toast.type === 'error'
                ? 'Action failed'
                : 'Success'}
            </strong>

            <p>{toast.message}</p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* PAGE HEADING */}
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">
            ORDER MANAGEMENT
          </p>

          <h1>Customer Orders</h1>

          <p>
            View customer purchases and manage
            preparation and completion.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={refreshOrders}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Orders'}
        </button>
      </div>

      {/* LIST LOADING ERROR */}
      {loadError && (
        <div className="admin-error" role="alert">
          <div>
            <strong>Unable to load orders</strong>
            <p>{loadError}</p>
          </div>

          <button
            type="button"
            onClick={refreshOrders}
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      )}

      {/* STATUS HELP */}
      <section className="admin-orders-info">
        <strong>Order workflow</strong>

        <p>
          Pending → Preparing → Ready → Completed.
          Cancelled orders are closed. Only the next
          valid status is available for each order.
        </p>
      </section>

      {/* ORDER FILTERS AND TABLE */}
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>All Customer Orders</h2>

            <p>
              {total} matching order
              {total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="admin-orders-filters">
          <div className="admin-orders-filter">
            <label htmlFor="admin-order-search">
              Customer
            </label>

            <input
              id="admin-order-search"
              type="search"
              placeholder="Search name or email..."
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="admin-orders-filter">
            <label htmlFor="admin-order-status">
              Status
            </label>

            <select
              id="admin-order-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {statuses.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-orders-filter">
            <label htmlFor="admin-order-date">
              Order Date (database UTC)
            </label>

            <input
              id="admin-order-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="admin-orders-clear"
            onClick={clearFilters}
            disabled={!search && !status && !date}
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="admin-panel-empty">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="admin-panel-empty">
            No orders match your filters.
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-orders-table admin-orders-list">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const next = nextStatuses[order.status];

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>

                        <small>
                          {formatDate(order.created_at)}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {order.user?.name || 'Unknown'}
                        </strong>

                        <small>
                          {order.user?.email || '—'}
                        </small>
                      </td>

                      <td>{order.items_count ?? 0}</td>

                      <td>
                        {order.total_quantity ?? 0}
                      </td>

                      <td>
                        <strong>
                          {money(order.total_amount)}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge status={order.status} />
                      </td>

                      <td>
                        <div className="admin-orders-actions">
                          <button
                            type="button"
                            className="admin-orders-view"
                            onClick={() => openDetails(order)}
                          >
                            View
                          </button>

                          {next && (
                            <button
                              type="button"
                              className="admin-orders-advance"
                              onClick={() =>
                                handleUpdateStatus(order)
                              }
                              disabled={busyId !== null}
                            >
                              {busyId === order.id
                                ? 'Updating...'
                                : `Mark ${labelStatus(next)}`}
                            </button>
                          )}

                          {!next && (
                            <span className="admin-orders-closed">
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <footer className="menu-admin-pagination">
          <span>
            Showing {orders.length} of {total} orders
          </span>

          <div>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                setPage((value) => value - 1)
              }
            >
              Previous
            </button>

            <span>
              Page {page} of {lastPage}
            </span>

            <button
              type="button"
              disabled={loading || page >= lastPage}
              onClick={() =>
                setPage((value) => value + 1)
              }
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {/* ORDER DETAIL DIALOG */}
      {selectedId !== null && (
        <div
          className="admin-orders-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >
          <section
            className="admin-orders-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-detail-title"
          >
            <header className="admin-orders-dialog-header">
              <div>
                <p className="admin-eyebrow">
                  ORDER DETAILS
                </p>

                <h2 id="admin-order-detail-title">
                  Order #{selectedId}
                </h2>
              </div>

              <button
                type="button"
                className="admin-orders-close"
                onClick={closeDetails}
                aria-label="Close order details"
              >
                ×
              </button>
            </header>

            {detailLoading ? (
              <p className="admin-orders-detail-empty">
                Loading order details...
              </p>
            ) : detailError ? (
              <div className="admin-orders-detail-empty">
                <p>{detailError}</p>

                <button
                  type="button"
                  className="admin-orders-view"
                  onClick={() =>
                    setDetailRefreshKey(
                      (value) => value + 1
                    )
                  }
                >
                  Try Again
                </button>
              </div>
            ) : selectedOrder ? (
              <>
                <div className="admin-orders-detail-summary">
                  <div>
                    <small>Customer</small>
                    <strong>
                      {selectedOrder.user?.name || 'Unknown'}
                    </strong>
                  </div>

                  <div>
                    <small>Date Placed</small>
                    <strong>
                      {formatDate(selectedOrder.created_at)}
                    </strong>
                  </div>

                  <div>
                    <small>Status</small>
                    <StatusBadge
                      status={selectedOrder.status}
                    />
                  </div>
                </div>

                <h3 className="admin-orders-detail-subtitle">
                  Ordered Items
                </h3>

                <div className="admin-table-scroll">
                  <table className="admin-orders-detail-table">
                    <thead>
                      <tr>
                        <th>Food Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedOrder.items || []).map(
                        (item) => (
                          <tr key={item.id}>
                            <td>
                              {item.menu_item?.name ||
                                'Deleted item'}
                            </td>

                            <td>{item.quantity}</td>

                            <td>
                              {money(item.unit_price)}
                            </td>

                            <td>
                              {money(
                                Number(item.unit_price) *
                                  Number(item.quantity)
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-orders-total">
                  <span>Total Amount</span>

                  <strong>
                    {money(selectedOrder.total_amount)}
                  </strong>
                </div>

                <div className="admin-orders-notes">
                  <strong>Customer Notes</strong>

                  <p>
                    {selectedOrder.notes ||
                      'No special instructions.'}
                  </p>
                </div>

                <div className="admin-orders-dialog-footer">
                  <button
                    type="button"
                    className="admin-orders-view"
                    onClick={closeDetails}
                    disabled={busyId !== null}
                  >
                    Close
                  </button>

                  {nextStatuses[selectedOrder.status] && (
                    <button
                      type="button"
                      className="admin-orders-advance"
                      disabled={busyId !== null}
                      onClick={() =>
                        handleUpdateStatus(selectedOrder)
                      }
                    >
                      {busyId === selectedOrder.id
                        ? 'Updating...'
                        : `Mark ${labelStatus(
                            nextStatuses[selectedOrder.status]
                          )}`}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      <footer className="admin-footer">
        Canteen Management System · Admin Order Management
      </footer>
    </AdminLayout>
  );
}
