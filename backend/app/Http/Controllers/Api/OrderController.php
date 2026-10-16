<?php

namespace App\Http\Controllers\Api;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    // POST /api/orders
    public function store(StoreOrderRequest $request): JsonResponse
    {
        if ($request->user()->role !== 'customer') {
            return response()->json([
                'message' => 'Only customers can place orders.',
            ], 403);
        }

        $data = $request->validated();

        $order = DB::transaction(function () use ($request, $data) {

            $order = Order::create([
                'user_id' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);

            $totalCents = 0;

            // Consistent lock order helps prevent deadlocks.
            $cart = collect($data['items'])
                ->sortBy('menu_item_id')
                ->values();

            foreach ($cart as $cartItem) {

                $menuItem = MenuItem::whereKey(
                    $cartItem['menu_item_id']
                )->lockForUpdate()->firstOrFail();

                $quantity = (int) $cartItem['quantity'];

                // Check availability and actual stock.
                if (
                    !$menuItem->is_available ||
                    $menuItem->stock_qty < $quantity
                ) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "{$menuItem->name} is unavailable or "
                            . "has insufficient stock.",
                        ],
                    ]);
                }

                // Use server-side prices, not client prices.
                $unitPrice = $menuItem->price;

                $unitCents = (int) round(
                    (float) $unitPrice * 100
                );

                $totalCents += $unitCents * $quantity;

                // Orders table stores up to 99,999,999.99.
                if ($totalCents > 9999999999) {
                    throw ValidationException::withMessages([
                        'items' => ['The order total is too large.'],
                    ]);
                }

                // Save the item and its price at order time.
                $order->items()->create([
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                ]);

                // Subtract stock.
                $menuItem->stock_qty -= $quantity;
                $menuItem->save();
            }

            $order->total_amount = number_format(
                $totalCents / 100,
                2,
                '.',
                ''
            );

            $order->save();

            return $order;

        }, 3);

        return response()->json([
            'message' => 'Order placed successfully.',
            'data' => $order->load([
                'user:id,name',
                'items.menuItem:id,name',
            ]),
        ], 201);
    }

    // GET /api/orders - customer's own orders
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
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
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $request->user()
            ->orders()
            ->with('items.menuItem:id,name')
            ->orderByDesc('id');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return response()->json(
            $query->paginate(10)->withQueryString()
        );
    }

    // GET /api/orders/{order}
    public function show(Request $request, Order $order): JsonResponse
    {
        // Customers cannot see another customer's order.
        if (
            !$request->user()->isAdmin() &&
            (int) $order->user_id !== (int) $request->user()->id
        ) {
            abort(404);
        }

        return response()->json([
            'data' => $order->refresh()->load([
                'user:id,name',
                'items.menuItem:id,name',
            ]),
        ]);
    }
    
    // POST /api/orders/{order}/cancel
    public function cancel(Request $request, Order $order): JsonResponse
    {
        // Only customers can use this cancellation endpoint.
        if ($request->user()->role !== 'customer') {
            return response()->json([
                'message' => 'Only customers can cancel their orders.',
            ], 403);
        }

        // A customer cannot cancel another customer's order.
        if ((int) $order->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $cancelledOrder = DB::transaction(function () use ($request, $order) {

            // Lock the order to prevent two requests cancelling it.
            $lockedOrder = Order::whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedOrder->user_id !== (int) $request->user()->id) {
                abort(404);
            }

            if ($lockedOrder->status !== 'pending') {
                throw new HttpResponseException(
                    response()->json([
                        'message' => 'Only pending orders can be cancelled.',
                    ], 409)
                );
            }

            // Restore stock for every ordered product.
            $items = $lockedOrder->items()
                ->orderBy('menu_item_id')
                ->get();

            foreach ($items as $item) {
                $menuItem = MenuItem::whereKey($item->menu_item_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $menuItem->stock_qty += $item->quantity;
                $menuItem->save();
            }

            // Mark the order as cancelled.
            $lockedOrder->status = 'cancelled';
            $lockedOrder->save();

            return $lockedOrder;

        }, 3);

        return response()->json([
            'message' => 'Order cancelled successfully. Stock restored.',
            'data' => $cancelledOrder->load([
                'user:id,name',
                'items.menuItem:id,name',
            ]),
        ]);
    }

}
