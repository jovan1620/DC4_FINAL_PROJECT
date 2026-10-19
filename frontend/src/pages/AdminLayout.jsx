
import { useState } from 'react';
import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await logout();
    } catch {
      // AuthContext removes the saved token
      // even when the request fails.
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <Link
          to="/admin/dashboard"
          className="admin-sidebar-brand"
        >
          <span className="admin-brand-square">
            C
          </span>

          <span>
            Canteen
            <span className="admin-brand-dot">
              .
            </span>
          </span>
        </Link>

        <div className="admin-sidebar-caption">
          ADMINISTRATION
        </div>

        <nav className="admin-sidebar-nav">
          {/* DASHBOARD */}
          <NavLink
            to="/admin/dashboard"
            end
            className={({ isActive }) =>
              `admin-sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="admin-nav-symbol">
              ▦
            </span>

            Dashboard
          </NavLink>

          {/* MENU ITEMS */}
          <NavLink
            to="/admin/menu-items"
            className={({ isActive }) =>
              `admin-sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="admin-nav-symbol">
              ▤
            </span>

            Menu Items
          </NavLink>

          {/* CATEGORIES */}
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `admin-sidebar-link ${
                isActive ? 'active' : ''
              }`
            }
          >
            <span className="admin-nav-symbol">
              ▥
            </span>

            Categories
          </NavLink>

          {/* ORDERS — NEXT STEP */}
          <span className="admin-sidebar-link disabled">
            <span className="admin-nav-symbol">
              ☷
            </span>

            Orders
            <small>Soon</small>
          </span>
        </nav>

        {/* USER AND LOGOUT */}
        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-profile-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>

            <div>
              <strong>
                {user?.name || 'Administrator'}
              </strong>

              <span>
                System Administrator
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut
              ? 'Logging out...'
              : 'Log Out'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>
              Canteen Management System
            </strong>

            <span>
              Administrator Panel
            </span>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-role-label">
              ADMIN
            </span>

            <span>
              {user?.name || 'Administrator'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            style={{
              background: '#e98122',
              color: 'white',
              border: 0,
              borderRadius: '7px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {signingOut
              ? 'Logging out...'
              : 'Logout'}
          </button>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
