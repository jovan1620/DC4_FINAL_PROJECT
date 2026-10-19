
# Canteen Management System

A full-stack web application for managing a school canteen. Customers can browse food items, manage their carts, place orders, and track their orders. Administrators can manage menu items, categories, customer orders, stock, and sales information.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, JavaScript, Bootstrap 5, CSS |
| Backend | Laravel 13, PHP 8.3+ |
| Database | MySQL |
| Authentication | Laravel Sanctum API tokens |
| API communication | Axios |
| Testing | PHPUnit, Laravel Feature Tests, ESLint |

The application uses a decoupled architecture: a React single-page application communicates with a Laravel REST API through HTTP requests.

## Main Features

### Customer

- Register and log in to a customer account.
- Browse food items and their descriptions, prices, categories, and availability.
- Search and filter food items.
- Add available products to the shopping cart.
- Change quantities and remove cart items.
- Keep cart contents in browser local storage.
- Review orders before checkout.
- Add optional special instructions.
- Place orders with server-side stock and price validation.
- View order history and current order statuses.
- Cancel pending orders, restoring the deducted stock.

### Administrator

- Log in with an authorized administrator account.
- View dashboard statistics and recent orders.
- View orders placed today and pending orders.
- View sales from orders completed today.
- Identify menu items with low stock.
- Add, edit, search, filter, and delete menu items.
- Add, edit, search, and delete categories.
- View all customer orders.
- Search customer orders by name or email.
- Filter orders by status and date.
- View order details, quantities, prices, and notes.
- Update order status in the correct sequence.

## Order Workflow

```text
Pending
   |
   v
Preparing
   |
   v
Ready
   |
   v
Completed
```

A customer may cancel an order only while it is Pending.

The backend prevents invalid status changes such as moving directly from Pending to Completed.

## Project Structure

```text
DC4_jovxn/
|
|-- backend/
|   |-- app/
|   |   |-- Http/Controllers/Api/
|   |   |-- Http/Middleware/
|   |   |-- Http/Requests/
|   |   `-- Models/
|   |-- database/
|   |   |-- migrations/
|   |   `-- seeders/
|   |-- routes/api.php
|   `-- tests/Feature/
|
|-- frontend/
|   |-- src/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- App.jsx
|   `-- package.json
|
|-- docs/
|   |-- INSTALLATION.md
|   |-- ERD.md
|   |-- DEMO_SCRIPT.md
|   |-- FINAL_CHECKLIST.md
|   `-- screenshots/
|
`-- README.md
```

## Database

The system uses five main application tables:

1. `users` - customer and administrator accounts
2. `categories` - categories for food items
3. `menu_items` - food products, prices, availability, and stock
4. `orders` - customer orders, totals, notes, and statuses
5. `order_items` - products and quantities within an order

Additional tables are used by Laravel for authentication and framework services.

See [Database ERD](docs/ERD.md).

## REST API

All paths below are relative to `/api`.

| Method | Endpoint | Access |
|---|---|---|
| POST | `/register` | Public |
| POST | `/login` | Public |
| GET | `/user` | Authenticated |
| POST | `/logout` | Authenticated |
| GET | `/categories` | Authenticated |
| POST | `/categories` | Admin |
| PUT/PATCH | `/categories/{id}` | Admin |
| DELETE | `/categories/{id}` | Admin |
| GET | `/menu-items` | Authenticated |
| POST | `/menu-items` | Admin |
| PUT/PATCH | `/menu-items/{id}` | Admin |
| DELETE | `/menu-items/{id}` | Admin |
| POST | `/orders` | Customer |
| GET | `/orders` | Authenticated |
| GET | `/orders/{id}` | Authenticated; ownership enforced for customers |
| POST | `/orders/{id}/cancel` | Customer; own pending orders |
| GET | `/admin/dashboard` | Admin |
| GET | `/admin/orders` | Admin |
| PATCH | `/admin/orders/{id}/status` | Admin |

Protected routes require a valid Sanctum bearer token.

## Application Security and Validation

- Passwords are hashed by Laravel.
- Public registration creates customer accounts only.
- Admin API routes are protected by admin authorization middleware.
- Customer orders are protected against unauthorized access.
- Incoming API requests are validated on the backend.
- Product prices are read from the database during checkout.
- Stock is checked and deducted inside database transactions.
- Cancelled orders restore product stock.
- Existing order history prevents deletion of referenced menu items.
- Categories containing menu items cannot be deleted.

## Installation

Follow the full setup instructions in [INSTALLATION.md](docs/INSTALLATION.md).

The application normally runs on:

- Laravel API: `http://127.0.0.1:8000`
- React frontend: URL printed by `npm run dev`

The Vite port may vary depending on other running applications.

## Testing

Backend tests:

```bash
cd backend
php artisan test
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

### Latest Verified Results

- Laravel tests: **10 passed**
- Laravel assertions: **81 passed**
- Frontend production build: **passed**
- ESLint: **0 errors, 1 Fast Refresh warning**

Automated feature tests cover authentication, authorization, CRUD validation, checkout, stock handling, cancellation, order transitions, and order-history protection.

A passing test suite provides evidence for these tested behaviors but does not replace manual browser testing.

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Entity Relationship Diagram](docs/ERD.md)
- [Presentation and Demo Script](docs/DEMO_SCRIPT.md)
- [Final System Checklist](docs/FINAL_CHECKLIST.md)

## Notes

This application is intended for academic demonstration and local development. Database passwords, administrator credentials, and Laravel environment files should never be committed to a public GitHub repository.
