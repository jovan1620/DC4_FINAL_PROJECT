
# Canteen Management System - Installation Guide

## 1. Requirements

Install the following software:

- PHP 8.3 or newer
- Composer
- Node.js and npm
- MySQL (Laragon can be used)
- Git
- A web browser
- VS Code or another code editor

For automated tests, ensure PHP's SQLite extensions are available.

## 2. Clone the Repository

Open Command Prompt:

```cmd
git clone https://github.com/jovan1620/DC4_FINAL_PROJECT.git
cd DC4_FINAL_PROJECT
```

If the project folder is already present, open that folder instead of cloning it again.

## 3. Configure the Database

Start Laragon and make sure MySQL is running.

Create a MySQL database named:

```sql
CREATE DATABASE canteen_management_system;
```

This can also be done through phpMyAdmin.

## 4. Install the Laravel Backend

Open Command Prompt inside the backend folder:

```cmd
cd backend
composer install
```

Create the Laravel environment file:

```cmd
copy .env.example .env
```

Open `.env` and configure these values:

```env
APP_NAME="Canteen Management System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=canteen_management_system
DB_USERNAME=root
DB_PASSWORD=

CANTEEN_ADMIN_PASSWORD=ChooseYourOwnStrongPassword
```

Change the database username and password if your local MySQL installation uses different credentials.

Choose your own administrator password. Do not use a production password in a public file.

## 5. Generate the Application Key

```cmd
php artisan key:generate
php artisan optimize:clear
```

## 6. Create the Database Tables

For a fresh installation:

```cmd
php artisan migrate
```

This creates the Laravel framework tables and the Canteen application tables.

If your database already contains the system's existing orders and menu items, do not use `migrate:fresh`, because it deletes and recreates tables.

## 7. Create the Administrator Account

The project includes an administrator seeder.

Make sure `CANTEEN_ADMIN_PASSWORD` is configured in `.env`, then run:

```cmd
php artisan config:clear
php artisan db:seed --class=AdminUserSeeder
```

Local administrator login:

- Email: `admin@canteen.test`
- Password: the value you set for `CANTEEN_ADMIN_PASSWORD`

The seeder is configured to run in the local environment.

Customer accounts are created through the application's registration form.

## 8. Start the Laravel API

```cmd
php artisan serve
```

The default API address is:

```text
http://127.0.0.1:8000/api
```

Keep this terminal running.

## 9. Install the React Frontend

Open a second terminal in the project's frontend folder:

```cmd
cd frontend
npm install
```

The frontend uses this API address by default:

```text
http://127.0.0.1:8000/api
```

If your backend runs at a different address, create a frontend `.env` file with:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Change the URL to match your actual Laravel server.

## 10. Start the React Frontend

```cmd
npm run dev
```

Open the local URL printed in your terminal.

For example:

```text
http://localhost:5174
```

The port may be different on your computer.

## 11. Log In and Test

For administrator access:

1. Open the React application.
2. Log in using the seeded administrator account.
3. Check the Dashboard, Menu Items, Categories, and Orders pages.

For customer access:

1. Register a new customer account.
2. Browse the menu.
3. Add food items to the cart.
4. Place an order.
5. View the order in My Orders.

## 12. Run Automated Tests

Laravel tests:

```cmd
cd backend
php artisan test
```

The test configuration uses an in-memory SQLite database, separate from the application's MySQL database.

React checks:

```cmd
cd frontend
npm run lint
npm run build
```

A React Fast Refresh warning may appear in the current codebase, but the most recent verification showed zero ESLint errors.

## 13. Troubleshooting

### Cannot connect to the database

- Start MySQL through Laragon.
- Check the database name in `.env`.
- Confirm the MySQL username and password.
- Run `php artisan optimize:clear`.

### React cannot load API data

- Confirm `php artisan serve` is running.
- Check `frontend/.env` if you created one.
- Verify the URL and port match the Laravel server.
- Check the browser Developer Tools for failed requests.

### npm scripts are blocked in PowerShell

Use Command Prompt, or run the `npm.cmd` executable instead.

### Cannot create the administrator account

- Confirm `APP_ENV=local`.
- Set `CANTEEN_ADMIN_PASSWORD` in backend `.env`.
- Run `php artisan config:clear`.
- Run the AdminUserSeeder again.

### PHPUnit reports a missing SQLite driver

Enable the PHP SQLite/PDO SQLite extensions in the command-line PHP installation and restart the terminal.

## Important

Never upload `.env`, passwords, access tokens, or database backups containing private customer information to a public GitHub repository.
