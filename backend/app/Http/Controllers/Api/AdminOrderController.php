<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    // GET /api/admin/orders
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => [
                'nullable',
                Rule::in([
                    'pending',
                    'preparing',
                    'ready',
                    'completed',
                    'cancelled',
                ]),
            ],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Order::query()
            ->with('user:id,name,email')
            ->withCount('items')
            ->withSum('items as total_quantity', 'quantity');

        // Search orders by customer name or email.
        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->whereHas('user', function ($q) use ($search) {
                $q->where(function ($userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        // Filter by order status.
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter orders by date.
        if (!empty($filters['date'])) {
            $query->whereDate('created_at', $filters['date']);
        }

        $orders = $query
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        return response()->json($orders);
    }

    // PATCH /api/admin/orders/{order}/status
    public function updateStatus(
        Request $request,
        Order $order
    ): JsonResponse {
        $data = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'preparing',
                    'ready',
                    'completed',
                ]),
            ],
        ]);

        $updatedOrder = DB::transaction(function () use ($order, $data) {

            // Prevent conflicting status updates.
            $lockedOrder = Order::whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $nextStatus = [
                'pending' => 'preparing',
                'preparing' => 'ready',
                'ready' => 'completed',
            ];

            $allowed = $nextStatus[$lockedOrder->status] ?? null;

            if ($allowed !== $data['status']) {
                throw new HttpResponseException(
                    response()->json([
                        'message' =>
                            'Cannot change order status from '
                            . $lockedOrder->status
                            . ' to '
                            . $data['status']
                            . '.',
                    ], 409)
                );
            }

            $lockedOrder->status = $data['status'];
            $lockedOrder->save();

            return $lockedOrder;

        }, 3);

        return response()->json([
            'message' => 'Order status updated successfully.',
            'data' => $updatedOrder->load([
                'user:id,name',
                'items.menuItem:id,name',
            ]),
        ]);
    }
}
