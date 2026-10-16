<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MenuItemRequest;
use App\Models\MenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class MenuItemController extends Controller
{
    // GET /api/menu-items
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer'],
            'availability' => [
                'nullable',
                Rule::in(['available', 'unavailable']),
            ],
            'available_only' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:30'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = MenuItem::with('category');

        // Search by item name or description
        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // An item is available if enabled AND in stock
        $availability = $filters['availability'] ?? null;

        if ($availability === 'available'
            || (!$availability && !empty($filters['available_only']))) {

            $query->where('is_available', true)
                ->where('stock_qty', '>', 0);
        }

        if ($availability === 'unavailable') {
            $query->where(function ($q) {
                $q->where('is_available', false)
                    ->orWhere('stock_qty', '<=', 0);
            });
        }

        $items = $query->orderBy('name')
            ->paginate($filters['per_page'] ?? 6)
            ->withQueryString();

        return response()->json($items);
    }

    // GET /api/menu-items/{menu_item}
    public function show(MenuItem $menuItem): JsonResponse
    {
        return response()->json([
            'data' => $menuItem->load('category'),
        ]);
    }

    // POST /api/menu-items
    public function store(MenuItemRequest $request): JsonResponse
    {
        $item = MenuItem::create($request->validated());

        return response()->json([
            'message' => 'Menu item created successfully.',
            'data' => $item->load('category'),
        ], 201);
    }

    // PUT/PATCH /api/menu-items/{menu_item}
    public function update(
        MenuItemRequest $request,
        MenuItem $menuItem
    ): JsonResponse {
        $menuItem->update($request->validated());

        return response()->json([
            'message' => 'Menu item updated successfully.',
            'data' => $menuItem->load('category'),
        ]);
    }

    // DELETE /api/menu-items/{menu_item}
    public function destroy(MenuItem $menuItem): Response
    {
        // Preserve history for items already ordered
        if ($menuItem->orderItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a menu item with order history.',
            ], 409);
        }

        $menuItem->delete();

        return response()->noContent();
    }
}
