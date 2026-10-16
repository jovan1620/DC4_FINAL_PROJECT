
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Public routes
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:6,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:6,1');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', [AuthController::class, 'user']);

    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin-only routes
    Route::middleware('admin')->group(function () {

        Route::get('/admin/check', function () {
            return response()->json([
                'message' => 'Admin access granted.',
            ]);
        });

    });

});
