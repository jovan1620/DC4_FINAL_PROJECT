
import { useEffect, useState } from 'react';
import api from '../services/api';
import AdminLayout from './AdminLayout';
import './AdminMenuItems.css';

const blank = {
  name: '',
  category_id: '',
  description: '',
  price: '',
  stock_qty: '',
  is_available: true,
};

function money(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function errorText(error) {
  const fields = error.response?.data?.errors;

  return fields
    ? Object.values(fields).flat().join(' ')
    : error.response?.data?.message ||
        error.message ||
        'An error occurred.';
}

function FieldError({ errors, name }) {
  return errors[name]?.[0] ? (
    <small className="menu-admin-field-error">
      {errors[name][0]}
    </small>
  ) : null;
}

export default function AdminMenuItemsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availability, setAvailability] = useState('');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const refresh = () =>
    setRefreshKey((value) => value + 1);

  const notify = (type, text) =>
    setToast({ type, text });

  // LOAD CATEGORIES
  useEffect(() => {
    let active = true;

    api
      .get('/categories')
      .then((response) => {
        if (active) {
          setCategories(response.data.data || []);
        }
      })
      .catch((error) => {
        if (active) {
          notify(
            'error',
            `Categories: ${errorText(error)}`
          );
        }
      })
      .finally(() => {
        if (active) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // LOAD MENU ITEMS
  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError('');

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/menu-items', {
          params: {
            search: search.trim() || undefined,
            category_id: categoryFilter || undefined,
            availability: availability || undefined,
            page,
            per_page: 6,
          },
        });

        if (!active) return;

        const data = response.data;
        const last = Math.max(1, data.last_page || 1);

        setItems(data.data || []);
        setLastPage(last);
        setTotal(data.total || 0);

        if (page > last) {
          setPage(last);
        }
      } catch (error) {
        if (active) {
          setItems([]);
          setLoadError(errorText(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    search,
    categoryFilter,
    availability,
    page,
    refreshKey,
  ]);

  // OPEN ADD OR EDIT FORM
  function openForm(item = null) {
    setEditingId(item?.id ?? null);

    setForm(
      item
        ? {
            name: item.name || '',
            category_id: String(
              item.category_id ?? ''
            ),
            description: item.description || '',
            price: String(item.price ?? ''),
            stock_qty: String(item.stock_qty ?? ''),
            is_available: Boolean(item.is_available),
          }
        : { ...blank }
    );

    setFieldErrors({});
    setSaveError('');
    setFormOpen(true);
  }

  function update(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  }

  // VALIDATE FORM
  function validate() {
    const errors = {};

    if (
      !form.name.trim() ||
      form.name.trim().length > 255
    ) {
      errors.name = [
        'Enter a name of 1–255 characters.',
      ];
    }

    if (
      !categories.some(
        (cat) =>
          cat.id === Number(form.category_id)
      )
    ) {
      errors.category_id = [
        'Select a valid category.',
      ];
    }

    if (form.description.length > 1000) {
      errors.description = [
        'Maximum 1000 characters.',
      ];
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(form.price.trim()) ||
      Number(form.price) > 99999999.99
    ) {
      errors.price = [
        'Enter a non-negative price with up to 2 decimal places.',
      ];
    }

    if (
      !/^\d+$/.test(form.stock_qty.trim()) ||
      !Number.isSafeInteger(Number(form.stock_qty)) ||
      Number(form.stock_qty) > 2147483647
    ) {
      errors.stock_qty = [
        'Stock must be a non-negative whole number.',
      ];
    }

    return errors;
  }

  // SAVE MENU ITEM
  async function saveItem(event) {
    event.preventDefault();

    if (saving) return;

    setFieldErrors({});
    setSaveError('');

    const errors = validate();

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      description: form.description.trim() || null,
      price: Number(form.price),
      stock_qty: Number(form.stock_qty),
      is_available: Boolean(form.is_available),
    };

    setSaving(true);

    try {
      const response =
        editingId === null
          ? await api.post('/menu-items', payload)
          : await api.put(
              `/menu-items/${editingId}`,
              payload
            );

      notify(
        'success',
        response.data?.message ||
          'Menu item saved successfully.'
      );

      setFormOpen(false);
      setEditingId(null);
      setForm({ ...blank });

      setSearch('');
      setCategoryFilter('');
      setAvailability('');
      setPage(1);

      refresh();
    } catch (error) {
      setFieldErrors(
        error.response?.data?.errors || {}
      );

      setSaveError(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  // DELETE MENU ITEM
  async function deleteItem(item) {
    if (deletingId !== null || saving) return;

    const confirmed = window.confirm(
      `Delete "${item.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setToast(null);

    try {
      await api.delete(`/menu-items/${item.id}`);

      notify(
        'success',
        `${item.name} deleted successfully.`
      );

      refresh();
    } catch (error) {
      // Display the error without stretching the table.
      // Laravel returns 409 when order history exists.
      notify('error', errorText(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminLayout>
      {/* FLOATING NOTIFICATION */}
      {toast && (
        <div
          role={
            toast.type === 'error'
              ? 'alert'
              : 'status'
          }
          style={{
            position: 'fixed',
            top: 85,
            right: 20,
            zIndex: 2000,
            width: 'min(400px, calc(100vw - 40px))',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            background:
              toast.type === 'error'
                ? '#fff0f0'
                : '#e8f7ee',
            color:
              toast.type === 'error'
                ? '#a83136'
                : '#17613b',
            border: `1px solid ${
              toast.type === 'error'
                ? '#ecc0c0'
                : '#aadfc0'
            }`,
            borderRadius: 10,
            boxShadow:
              '0 10px 30px #132d4b30',
            padding: '15px 17px',
          }}
        >
          <div
            style={{
              flex: 1,
              overflowWrap: 'anywhere',
            }}
          >
            <strong>
              {toast.type === 'error'
                ? 'Action failed'
                : 'Success'}
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
              }}
            >
              {toast.text}
            </div>
          </div>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            style={{
              border: 0,
              background: 'none',
              color: 'inherit',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* PAGE HEADING */}
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">
            INVENTORY MANAGEMENT
          </p>

          <h1>Menu Items</h1>

          <p>
            Manage your canteen products, prices,
            stock quantities, and availability.
          </p>
        </div>

        <button
          type="button"
          className="menu-admin-primary"
          disabled={saving || categoriesLoading}
          onClick={() => openForm()}
        >
          + Add Menu Item
        </button>
      </div>

      {loadError && (
        <div
          className="canteen-error"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {formOpen && (
        <section className="admin-panel menu-admin-form-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>
                {editingId === null
                  ? 'Add New Menu Item'
                  : 'Edit Menu Item'}
              </h2>

              <p>Complete the required fields below.</p>
            </div>

            <button
              type="button"
              className="menu-admin-text-button"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              Close
            </button>
          </div>

          <form onSubmit={saveItem} noValidate>
            <div className="menu-admin-form-grid">
              {/* NAME */}
              <div className="menu-admin-field">
                <label htmlFor="item-name">
                  Item Name *
                </label>

                <input
                  id="item-name"
                  type="text"
                  maxLength={255}
                  value={form.name}
                  onChange={(e) =>
                    update('name', e.target.value)
                  }
                  disabled={saving}
                  placeholder="Example: Chicken Adobo"
                />

                <FieldError
                  errors={fieldErrors}
                  name="name"
                />
              </div>

              {/* CATEGORY */}
              <div className="menu-admin-field">
                <label htmlFor="item-category">
                  Category *
                </label>

                <select
                  id="item-category"
                  value={form.category_id}
                  onChange={(e) =>
                    update(
                      'category_id',
                      e.target.value
                    )
                  }
                  disabled={
                    saving || categoriesLoading
                  }
                >
                  <option value="">
                    Select Category
                  </option>

                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>

                <FieldError
                  errors={fieldErrors}
                  name="category_id"
                />

                {!categoriesLoading &&
                  categories.length === 0 && (
                    <small>
                      No categories available.
                      Create one first.
                    </small>
                  )}
              </div>

              {/* PRICE */}
              <div className="menu-admin-field">
                <label htmlFor="item-price">
                  Price (₱) *
                </label>

                <input
                  id="item-price"
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    update('price', e.target.value)
                  }
                  disabled={saving}
                />

                <FieldError
                  errors={fieldErrors}
                  name="price"
                />
              </div>

              {/* STOCK */}
              <div className="menu-admin-field">
                <label htmlFor="item-stock">
                  Stock Quantity *
                </label>

                <input
                  id="item-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_qty}
                  onChange={(e) =>
                    update(
                      'stock_qty',
                      e.target.value
                    )
                  }
                  disabled={saving}
                />

                <FieldError
                  errors={fieldErrors}
                  name="stock_qty"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="menu-admin-field full-width">
                <label htmlFor="item-description">
                  Description
                </label>

                <textarea
                  id="item-description"
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  disabled={saving}
                  onChange={(e) =>
                    update(
                      'description',
                      e.target.value
                    )
                  }
                />

                <small>
                  {form.description.length}/1000 characters
                </small>

                <FieldError
                  errors={fieldErrors}
                  name="description"
                />
              </div>

              {/* AVAILABILITY */}
              <div className="menu-admin-field full-width">
                <label className="menu-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    disabled={saving}
                    onChange={(e) =>
                      update(
                        'is_available',
                        e.target.checked
                      )
                    }
                  />

                  Available for customer orders
                </label>
              </div>
            </div>

            {saveError && (
              <div
                className="canteen-error"
                role="alert"
                style={{ marginTop: 16 }}
              >
                {saveError}
              </div>
            )}

            <div className="menu-admin-form-actions">
              <button
                type="button"
                className="menu-admin-secondary"
                disabled={saving}
                onClick={() =>
                  setFormOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="menu-admin-primary"
                disabled={
                  saving ||
                  categoriesLoading ||
                  categories.length === 0
                }
              >
                {saving
                  ? 'Saving...'
                  : editingId === null
                    ? 'Add Menu Item'
                    : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* MENU INVENTORY */}
      <section className="admin-panel menu-admin-list-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Menu Inventory</h2>

            <p>
              Search, filter, and manage existing items.
            </p>
          </div>

          <button
            type="button"
            className="menu-admin-secondary"
            disabled={loading}
            onClick={refresh}
          >
            Refresh
          </button>
        </div>

        {/* FILTERS */}
        <div className="menu-admin-filters">
          <input
            type="search"
            aria-label="Search menu items"
            placeholder="Search items..."
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              All Categories
            </option>

            {categories.map((cat) => (
              <option
                key={cat.id}
                value={cat.id}
              >
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by availability"
            value={availability}
            onChange={(e) => {
              setAvailability(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              All Availability
            </option>

            <option value="available">
              Available
            </option>

            <option value="unavailable">
              Unavailable
            </option>
          </select>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="admin-panel-empty">
            Loading menu items...
          </div>
        ) : items.length === 0 ? (
          <div className="admin-panel-empty">
            No menu items found.
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="menu-admin-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const available =
                    Boolean(item.is_available) &&
                    Number(item.stock_qty) > 0;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.name}
                        </strong>

                        <small>
                          {item.description ||
                            'No description'}
                        </small>
                      </td>

                      <td>
                        {item.category?.name ||
                          'Uncategorized'}
                      </td>

                      <td>
                        <strong>
                          {money(item.price)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            item.stock_qty <= 5
                              ? 'menu-admin-stock-low'
                              : ''
                          }
                        >
                          {item.stock_qty}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`menu-admin-badge ${
                            available
                              ? 'available'
                              : 'unavailable'
                          }`}
                        >
                          {available
                            ? 'Available'
                            : 'Unavailable'}
                        </span>
                      </td>

                      <td>
                        <div className="menu-admin-actions">
                          <button
                            type="button"
                            className="menu-admin-edit"
                            disabled={
                              saving ||
                              deletingId !== null
                            }
                            onClick={() =>
                              openForm(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="menu-admin-delete"
                            disabled={
                              saving ||
                              deletingId !== null
                            }
                            onClick={() =>
                              deleteItem(item)
                            }
                          >
                            {deletingId === item.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
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
            Showing {items.length} of {total} menu items
          </span>

          <div>
            <button
              type="button"
              disabled={
                loading || page <= 1
              }
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
              disabled={
                loading ||
                page >= lastPage
              }
              onClick={() =>
                setPage((value) => value + 1)
              }
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </AdminLayout>
  );
}
