
import { useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminMenuItemsPage from './pages/AdminMenuItemsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminOrdersPage from './pages/AdminOrdersPage';

const destination = (user) =>
  user?.role === 'admin'
    ? '/admin/dashboard'
    : '/menu';

function FieldError({ errors, name }) {
  const message = errors?.[name]?.[0];

  return message ? (
    <div className="field-error">
      {message}
    </div>
  ) : null;
}

// LOGIN AND REGISTRATION
function AuthPage() {
  const {
    user,
    loading,
    login,
    register,
  } = useAuth();

  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const [loginErrors, setLoginErrors] = useState({});
  const [registerErrors, setRegisterErrors] =
    useState({});

  const [loginMessage, setLoginMessage] = useState('');
  const [registerMessage, setRegisterMessage] =
    useState('');

  const [busy, setBusy] = useState('');

  async function handleLogin(event) {
    event.preventDefault();

    if (busy) return;

    setLoginErrors({});
    setLoginMessage('');
    setBusy('login');

    try {
      const loggedInUser = await login(loginForm);

      navigate(destination(loggedInUser), {
        replace: true,
      });
    } catch (error) {
      setLoginErrors(
        error.response?.data?.errors || {}
      );

      setLoginMessage(
        error.response?.data?.message ||
          'Unable to log in. Please try again.'
      );
    } finally {
      setBusy('');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (busy) return;

    setRegisterErrors({});
    setRegisterMessage('');

    if (
      registerForm.password !==
      registerForm.password_confirmation
    ) {
      setRegisterErrors({
        password_confirmation: [
          'Passwords do not match.',
        ],
      });

      return;
    }

    setBusy('register');

    try {
      const newUser = await register(registerForm);

      navigate(destination(newUser), {
        replace: true,
      });
    } catch (error) {
      setRegisterErrors(
        error.response?.data?.errors || {}
      );

      setRegisterMessage(
        error.response?.data?.message ||
          'Registration failed. Please check your information.'
      );
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        Loading Canteen...
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={destination(user)}
        replace
      />
    );
  }

  return (
    <main className="auth-screen">
      <div className="auth-container">
        <header className="auth-header">
          <div className="logo-mark">
            C
          </div>

          <h1>
            Canteen
            <span className="orange-dot">
              .
            </span>
          </h1>

          <p>
            Order your meals online. Skip the line.
          </p>
        </header>

        <div className="auth-grid">
          {/* LOGIN FORM */}
          <section className="auth-card login-card">
            <h2>Welcome back</h2>

            <p className="section-subtitle">
              Log in to place and track your orders.
            </p>

            <form onSubmit={handleLogin}>
              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="ana@school.edu"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    email: event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={loginErrors}
                name="email"
              />

              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({
                    ...loginForm,
                    password: event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={loginErrors}
                name="password"
              />

              {loginMessage && (
                <div className="alert-message">
                  {loginMessage}
                </div>
              )}

              <button
                type="submit"
                className="primary-button orange-button"
                disabled={busy !== ''}
              >
                {busy === 'login'
                  ? 'Logging in...'
                  : 'Login'}
              </button>
            </form>

            <p className="auth-tip">
              No account yet? Fill out the registration form.
            </p>
          </section>

          {/* REGISTRATION FORM */}
          <section className="auth-card register-card">
            <h2>Create account</h2>

            <p className="section-subtitle">
              Register as a customer.
            </p>

            <form onSubmit={handleRegister}>
              <label htmlFor="register-name">
                Full name
              </label>

              <input
                id="register-name"
                type="text"
                placeholder="Ben Cruz"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    name: event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={registerErrors}
                name="name"
              />

              <label htmlFor="register-email">
                Email
              </label>

              <input
                id="register-email"
                type="email"
                placeholder="ben@school.edu"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    email: event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={registerErrors}
                name="email"
              />

              <label htmlFor="register-password">
                Password
              </label>

              <input
                id="register-password"
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password: event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={registerErrors}
                name="password"
              />

              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                placeholder="Repeat your password"
                minLength={8}
                value={
                  registerForm.password_confirmation
                }
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password_confirmation:
                      event.target.value,
                  })
                }
                required
              />

              <FieldError
                errors={registerErrors}
                name="password_confirmation"
              />

              {registerMessage && (
                <div className="alert-message">
                  {registerMessage}
                </div>
              )}

              <button
                type="submit"
                className="primary-button navy-button"
                disabled={busy !== ''}
              >
                {busy === 'register'
                  ? 'Creating account...'
                  : 'Register'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

// ROLE-PROTECTED ROUTES
function ProtectedPage({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        Loading Canteen...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace />
    );
  }

  if (role && user.role !== role) {
    return (
      <Navigate
        to={destination(user)}
        replace
      />
    );
  }

  return children;
}

// APPLICATION ROUTES
export default function App() {
  return (
    <Routes>
      {/* DEFAULT */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* PUBLIC */}
      <Route
        path="/login"
        element={<AuthPage />}
      />

      <Route
        path="/register"
        element={<AuthPage />}
      />

      {/* ADMIN DASHBOARD */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedPage role="admin">
            <AdminDashboardPage />
          </ProtectedPage>
        }
      />

      {/* ADMIN MENU ITEMS */}
      <Route
        path="/admin/menu-items"
        element={
          <ProtectedPage role="admin">
            <AdminMenuItemsPage />
          </ProtectedPage>
        }
      />

      {/* ADMIN CATEGORIES */}
      <Route
        path="/admin/categories"
        element={
          <ProtectedPage role="admin">
            <AdminCategoriesPage />
          </ProtectedPage>
        }
      />

      {/* ADMIN ORDERS */}
      <Route
        path="/admin/orders"
        element={
          <ProtectedPage role="admin">
            <AdminOrdersPage />
          </ProtectedPage>
        }
      />

      {/* CUSTOMER MENU */}
      <Route
        path="/menu"
        element={
          <ProtectedPage role="customer">
            <MenuPage />
          </ProtectedPage>
        }
      />

      {/* CUSTOMER CART */}
      <Route
        path="/cart"
        element={
          <ProtectedPage role="customer">
            <CartPage />
          </ProtectedPage>
        }
      />

      {/* CUSTOMER ORDERS */}
      <Route
        path="/orders"
        element={
          <ProtectedPage role="customer">
            <MyOrdersPage />
          </ProtectedPage>
        }
      />

      {/* UNKNOWN URL */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
