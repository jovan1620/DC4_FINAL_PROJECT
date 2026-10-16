
<?php

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

    Route::get('/user', [AuthController::class, 'user']);

    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin and Customer can view categories
    Route::get('/categories', [CategoryController::class, 'index']);

    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    // Admin-only routes
    Route::middleware('admin')->group(function () {

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
