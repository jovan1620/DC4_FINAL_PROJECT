
import { useEffect, useState } from 'react';
import api from '../services/api';
import AdminLayout from './AdminLayout';
import './AdminMenuItems.css';

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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function notify(type, text) {
    setToast({ type, text });
  }

  function refreshCategories() {
    setRefreshKey((value) => value + 1);
  }

  // LOAD CATEGORIES FROM LARAVEL
  useEffect(() => {
    let active = true;

    async function loadCategories() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await api.get('/categories');

        if (!active) return;

        if (!Array.isArray(response.data?.data)) {
          throw new Error(
            'Invalid category data received from the server.'
          );
        }

        setCategories(response.data.data);
      } catch (error) {
        if (active) {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // OPEN ADD FORM
  function openCreateForm() {
    setEditingId(null);
    setName('');
    setFieldError('');
    setFormOpen(true);
  }

  // OPEN EDIT FORM
  function openEditForm(category) {
    setEditingId(category.id);
    setName(category.name);
    setFieldError('');
    setFormOpen(true);
  }

  // CLOSE FORM
  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditingId(null);
    setName('');
    setFieldError('');
  }

  // VALIDATE CATEGORY NAME
  function validateName() {
    const cleanedName = name.trim();

    if (!cleanedName) {
      return 'Category name is required.';
    }

    if (cleanedName.length > 100) {
      return 'Category name cannot exceed 100 characters.';
    }

    const duplicate = categories.some(
      (category) =>
        category.id !== editingId &&
        category.name.trim().toLowerCase() ===
          cleanedName.toLowerCase()
    );

    if (duplicate) {
      return 'This category already exists.';
    }

    return '';
  }

  // CREATE OR UPDATE CATEGORY
  async function handleSave(event) {
    event.preventDefault();

    if (saving || deletingId !== null) return;

    setFieldError('');

    const validationError = validateName();

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
    };

    try {
      let response;

      if (editingId === null) {
        response = await api.post(
          '/categories',
          payload
        );
      } else {
        response = await api.put(
          `/categories/${editingId}`,
          payload
        );
      }

      notify(
        'success',
        response.data?.message ||
          (editingId === null
            ? 'Category created successfully.'
            : 'Category updated successfully.')
      );

      setFormOpen(false);
      setEditingId(null);
      setName('');
      setFieldError('');

      refreshCategories();
    } catch (error) {
      const message = getErrorMessage(error);

      setFieldError(
        error.response?.data?.errors?.name?.[0] ||
          message
      );

      notify('error', message);
    } finally {
      setSaving(false);
    }
  }

  // DELETE CATEGORY
  async function handleDelete(category) {
    if (deletingId !== null || saving) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?\n\n` +
        'This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setToast(null);

    try {
      await api.delete(
        `/categories/${category.id}`
      );

      notify(
        'success',
        `${category.name} deleted successfully.`
      );

      if (editingId === category.id) {
        setFormOpen(false);
        setEditingId(null);
        setName('');
        setFieldError('');
      }

      refreshCategories();
    } catch (error) {
      // Laravel returns HTTP 409 if the category
      // still contains menu items.
      notify('error', getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  // SEARCH RESULTS
  const filteredCategories = categories.filter(
    (category) =>
      category.name
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  const totalMenuItems = categories.reduce(
    (total, category) =>
      total + Number(category.menu_items_count || 0),
    0
  );

  const usedCategories = categories.filter(
    (category) =>
      Number(category.menu_items_count || 0) > 0
  ).length;

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
            boxShadow: '0 10px 30px #132d4b30',
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
              background: 'transparent',
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
            MENU MANAGEMENT
          </p>

          <h1>Categories</h1>

          <p>
            Organize your canteen menu into
            different food categories.
          </p>
        </div>

        <button
          type="button"
          className="menu-admin-primary"
          onClick={openCreateForm}
          disabled={saving || deletingId !== null}
        >
          + Add Category
        </button>
      </div>

      {/* ERROR LOADING DATA */}
      {loadError && (
        <div className="admin-error" role="alert">
          <div>
            <strong>
              Unable to load categories
            </strong>

            <p>{loadError}</p>
          </div>

          <button
            type="button"
            onClick={refreshCategories}
          >
            Try Again
          </button>
        </div>
      )}

      {/* CATEGORY STATISTICS */}
      <section
        className="admin-stats-grid"
        aria-label="Category statistics"
      >
        <article className="admin-stat-card admin-stat-orders">
          <div className="admin-stat-header">
            <span>Total Categories</span>
            <div className="admin-stat-icon">01</div>
          </div>

          <strong className="admin-stat-value">
            {loading ? '—' : categories.length}
          </strong>

          <p>Food categories in the system</p>
        </article>

        <article className="admin-stat-card admin-stat-sales">
          <div className="admin-stat-header">
            <span>Total Menu Items</span>
            <div className="admin-stat-icon">02</div>
          </div>

          <strong className="admin-stat-value">
            {loading ? '—' : totalMenuItems}
          </strong>

          <p>Items assigned to categories</p>
        </article>

        <article className="admin-stat-card admin-stat-pending">
          <div className="admin-stat-header">
            <span>Categories In Use</span>
            <div className="admin-stat-icon">03</div>
          </div>

          <strong className="admin-stat-value">
            {loading ? '—' : usedCategories}
          </strong>

          <p>Categories containing menu items</p>
        </article>
      </section>

      {/* ADD / EDIT CATEGORY FORM */}
      {formOpen && (
        <section className="admin-panel menu-admin-form-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>
                {editingId === null
                  ? 'Add New Category'
                  : 'Edit Category'}
              </h2>

              <p>
                Enter a unique name for your category.
              </p>
            </div>

            <button
              type="button"
              className="menu-admin-text-button"
              onClick={closeForm}
              disabled={saving}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSave} noValidate>
            <div
              className="menu-admin-field"
              style={{ maxWidth: 570 }}
            >
              <label htmlFor="category-name">
                Category Name *
              </label>

              <input
                id="category-name"
                type="text"
                maxLength={100}
                placeholder="Example: Beverages"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFieldError('');
                }}
                disabled={saving}
                required
                autoFocus
              />

              <small>
                {name.length}/100 characters
              </small>

              {fieldError && (
                <small
                  className="menu-admin-field-error"
                  role="alert"
                >
                  {fieldError}
                </small>
              )}
            </div>

            <div className="menu-admin-form-actions">
              <button
                type="button"
                className="menu-admin-secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="menu-admin-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId === null
                    ? 'Add Category'
                    : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* CATEGORY LIST */}
      <section className="admin-panel menu-admin-list-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Category List</h2>

            <p>
              View, rename, and manage your categories.
            </p>
          </div>

          <button
            type="button"
            className="menu-admin-secondary"
            onClick={refreshCategories}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* SEARCH BAR */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 22,
          }}
        >
          <input
            type="search"
            aria-label="Search categories"
            placeholder="Search categories..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={{
              width: '100%',
              maxWidth: 390,
              minWidth: 0,
              border: '1px solid #dce3ec',
              borderRadius: 7,
              background: 'white',
              color: '#203b5d',
              padding: '12px 14px',
              fontSize: 13,
            }}
          />

          {search && (
            <button
              type="button"
              className="menu-admin-secondary"
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          )}
        </div>

        {/* CATEGORY TABLE */}
        {loading ? (
          <div className="admin-panel-empty">
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-panel-empty">
            {search
              ? 'No categories match your search.'
              : 'No categories found. Add your first category.'}
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="menu-admin-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Menu Items</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => {
                  const count = Number(
                    category.menu_items_count || 0
                  );

                  return (
                    <tr key={category.id}>
                      <td>
                        <strong>
                          {category.name}
                        </strong>

                        <small>
                          Category ID: {category.id}
                        </small>
                      </td>

                      <td>
                        <strong>{count}</strong>
                        {' '}
                        {count === 1 ? 'item' : 'items'}
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              count > 0
                                ? '#2a9a69'
                                : '#8290a0',
                          }}
                        >
                          {count > 0
                            ? 'In Use'
                            : 'Empty'}
                        </span>
                      </td>

                      <td>
                        <div className="menu-admin-actions">
                          <button
                            type="button"
                            className="menu-admin-edit"
                            onClick={() =>
                              openEditForm(category)
                            }
                            disabled={
                              saving ||
                              deletingId !== null
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="menu-admin-delete"
                            onClick={() =>
                              handleDelete(category)
                            }
                            disabled={
                              saving ||
                              deletingId !== null
                            }
                          >
                            {deletingId === category.id
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

        <footer className="menu-admin-pagination">
          <span>
            Showing {filteredCategories.length}
            {' '}of {categories.length} categories
          </span>

          <span>
            Categories containing menu items
            cannot be deleted.
          </span>
        </footer>
      </section>

      <footer className="admin-footer">
        Canteen Management System · Category Management
      </footer>
    </AdminLayout>
  );
}
