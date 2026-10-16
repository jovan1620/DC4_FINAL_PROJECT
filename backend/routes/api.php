
<?php
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\MenuItemController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;

// Public authentication routes
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:6,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:6,1');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Customer ordering
Route::get('/orders', [OrderController::class, 'index']);

Route::post('/orders', [OrderController::class, 'store']);

Route::get('/orders/{order}', [OrderController::class, 'show']);
Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
// Admin and Customer can view menu items
Route::get('/menu-items', [MenuItemController::class, 'index']);
Route::get('/menu-items/{menu_item}', [MenuItemController::class, 'show']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin and Customer can view categories
    Route::get('/categories', [CategoryController::class, 'index']);

    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    // Admin-only routes
    Route::middleware('admin')->group(function () {
        // Admin can view all customer orders.
Route::get('/admin/orders', [AdminOrderController::class, 'index']);
        // Admin-only order status management
Route::patch(
    '/admin/orders/{order}/status',
    [AdminOrderController::class, 'updateStatus']
);
        // Admin-only Menu Items CRUD
Route::post('/menu-items', [MenuItemController::class, 'store']);

Route::put('/menu-items/{menu_item}', [MenuItemController::class, 'update']);

Route::patch('/menu-items/{menu_item}', [MenuItemController::class, 'update']);

Route::delete('/menu-items/{menu_item}', [MenuItemController::class, 'destroy']);
        Route::get('/admin/check', function () {
            return response()->json([
                'message' => 'Admin access granted.',
            ]);
        });

        // Category management
        Route::post('/categories', [CategoryController::class, 'store']);

        Route::put('/categories/{category}', [CategoryController::class, 'update']);

        Route::patch('/categories/{category}', [CategoryController::class, 'update']);

        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    });

});
