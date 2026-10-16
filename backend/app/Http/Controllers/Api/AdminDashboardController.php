<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    // GET /api/admin/dashboard
    public function index(): JsonResponse
    {
        // Calculate today's date using Philippine time.
        // Database timestamps are stored in UTC.
        $today = CarbonImmutable::now('Asia/Manila')
            ->startOfDay();

        $start = $today
            ->setTimezone('UTC')
            ->format('Y-m-d H:i:s');

        $end = $today
            ->addDay()
            ->setTimezone('UTC')
            ->format('Y-m-d H:i:s');

        // 1. Orders placed today.
        $todayOrders = Order::where(
            'created_at', '>=', $start
        )->where(
            'created_at', '<', $end
        )->count();

        // 2. All currently pending orders.
        $pendingOrders = Order::where(
            'status', 'pending'
        )->count();

        // 3. Sales from orders completed today.
        // Currently, updated_at records the last status change.
        $todaySales = Order::where(
            'status', 'completed'
        )->where(
            'updated_at', '>=', $start
        )->where(
            'updated_at', '<', $end
        )->sum('total_amount');

        // 4. Low stock: five items or fewer.
        $lowStockItems = MenuItem::where(
            'stock_qty', '<=', 5
        )
            ->orderBy('stock_qty')
            ->get([
                'id',
                'name',
                'stock_qty',
                'is_available',
            ]);

        // 5. Five most recent orders.
        $recentOrders = Order::with('user:id,name')
            ->withCount('items')
            ->orderByDesc('id')
            ->limit(5)
            ->get([
                'id',
                'user_id',
                'status',
                'total_amount',
                'created_at',
            ]);

        return response()->json([
            'data' => [
                'today_orders' => $todayOrders,
                'pending_orders' => $pendingOrders,
                'today_sales' => number_format(
                    (float) $todaySales,
                    2,
                    '.',
                    ''
                ),
                'low_stock_count' => $lowStockItems->count(),
                'low_stock_items' => $lowStockItems,
                'recent_orders' => $recentOrders,
                'date' => $today->format('Y-m-d'),
            ],
        ]);
    }
}
