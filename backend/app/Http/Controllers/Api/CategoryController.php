<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    // GET /api/categories
    public function index(): JsonResponse
    {
        $categories = Category::withCount('menuItems')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    // POST /api/categories
    public function store(CategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return response()->json([
            'message' => 'Category created successfully.',
            'data' => $category->loadCount('menuItems'),
        ], 201);
    }

    // GET /api/categories/{category}
    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'data' => $category->loadCount('menuItems'),
        ]);
    }

    // PUT /api/categories/{category}
    public function update(
        CategoryRequest $request,
        Category $category
    ): JsonResponse {
        $category->update($request->validated());

        return response()->json([
            'message' => 'Category updated successfully.',
            'data' => $category->loadCount('menuItems'),
        ]);
    }

    // DELETE /api/categories/{category}
    public function destroy(Category $category): Response
    {
        // Prevent deleting categories used by menu items.
        if ($category->menuItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a category that contains menu items.',
            ], 409);
        }

        $category->delete();

        return response()->noContent();
    }
}
