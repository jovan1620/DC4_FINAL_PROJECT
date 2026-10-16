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

            // Lock the order to prevent conflicting updates.
            $lockedOrder = Order::whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Allowed status transitions.
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
