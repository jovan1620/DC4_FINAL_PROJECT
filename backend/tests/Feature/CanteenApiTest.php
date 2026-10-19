<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class CanteenApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'customer'): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function makeItem(int $stock = 10): MenuItem
    {
        $category = Category::firstOrCreate([
            'name' => 'Main Meals',
        ]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Chicken Adobo',
            'description' => 'Chicken meal',
            'price' => 75,
            'stock_qty' => $stock,
            'is_available' => true,
        ]);
    }

    private function orderPayload(
        MenuItem $item,
        int $quantity = 2
    ): array {
        return [
            'items' => [
                [
                    'menu_item_id' => $item->id,
                    'quantity' => $quantity,
                ],
            ],
            'notes' => 'No spicy sauce',
        ];
    }

    // TEST 1: REGISTRATION, LOGIN AND LOGOUT

    public function test_registration_creates_a_customer_and_login_and_logout_work(): void
    {
        $registration = $this->postJson('/api/register', [
            'name' => 'Sample Customer',
            'email' => 'sample.customer@example.test',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $registration->assertCreated()
            ->assertJsonPath('user.role', 'customer')
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'email'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'sample.customer@example.test',
            'role' => 'customer',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'sample.customer@example.test',
            'password' => 'Password123',
        ]);

        $login->assertOk()
            ->assertJsonStructure(['token']);

        $token = $login->json('token');

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath(
                'user.email',
                'sample.customer@example.test'
            );

        $this->postJson('/api/logout')
            ->assertOk();

        // Laravel Sanctum can cache the authenticated
        // user between test requests.
        //
        // Clear the test guard so the next request
        // validates the revoked token again.
        Auth::forgetGuards();

        $this->getJson('/api/user')
            ->assertUnauthorized();
    }

    // TEST 2: ADMIN ROLE PROTECTION

    public function test_admin_routes_reject_guests_and_customers(): void
    {
        $this->getJson('/api/admin/dashboard')
            ->assertUnauthorized();

        $customer = $this->makeUser();

        $this->actingAs($customer, 'sanctum');

        $this->getJson('/api/admin/dashboard')
            ->assertForbidden();

        $this->postJson('/api/categories', [
            'name' => 'Drinks',
        ])->assertForbidden();

        $this->getJson('/api/admin/orders')
            ->assertForbidden();

        $admin = $this->makeUser('admin');

        $this->actingAs($admin, 'sanctum');

        $this->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    // TEST 3: CATEGORY CRUD AND VALIDATION

    public function test_category_crud_enforces_unique_names_and_protects_used_categories(): void
    {
        $this->actingAs(
            $this->makeUser('admin'),
            'sanctum'
        );

        $create = $this->postJson('/api/categories', [
            'name' => 'Beverages',
        ])->assertCreated();

        $categoryId = $create->json('data.id');

        $this->postJson('/api/categories', [
            'name' => 'Beverages',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->putJson(
            "/api/categories/{$categoryId}",
            ['name' => 'Drinks']
        )->assertOk()
            ->assertJsonPath(
                'data.name',
                'Drinks'
            );

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment([
                'name' => 'Drinks',
            ]);

        $item = $this->makeItem();

        $this->deleteJson(
            '/api/categories/' . $item->category_id
        )->assertStatus(409);

        $this->deleteJson(
            "/api/categories/{$categoryId}"
        )->assertNoContent();
    }

    // TEST 4: MENU ITEM CRUD AND VALIDATION

    public function test_menu_item_crud_validates_stock_and_price(): void
    {
        $this->actingAs(
            $this->makeUser('admin'),
            'sanctum'
        );

        $category = Category::create([
            'name' => 'Snacks',
        ]);

        $this->postJson('/api/menu-items', [
            'category_id' => $category->id,
            'name' => 'Pancit Canton',
            'price' => 25.555,
            'stock_qty' => -1,
            'is_available' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'price',
                'stock_qty',
            ]);

        $create = $this->postJson('/api/menu-items', [
            'category_id' => $category->id,
            'name' => 'Pancit Canton',
            'price' => 45,
            'stock_qty' => 20,
            'is_available' => true,
        ])->assertCreated();

        $itemId = $create->json('data.id');

        $this->putJson(
            "/api/menu-items/{$itemId}",
            [
                'category_id' => $category->id,
                'name' => 'Pancit Canton',
                'price' => 50,
                'stock_qty' => 5,
                'is_available' => false,
            ]
        )->assertOk()
            ->assertJsonPath(
                'data.stock_qty',
                5
            );

        $this->getJson(
            '/api/menu-items?availability=unavailable'
        )->assertOk()
            ->assertJsonFragment([
                'name' => 'Pancit Canton',
            ]);

        $this->deleteJson(
            "/api/menu-items/{$itemId}"
        )->assertNoContent();
    }

    // TEST 5: CHECKOUT AND STOCK DEDUCTION

    public function test_checkout_deducts_stock_and_rejects_invalid_orders(): void
    {
        $customer = $this->makeUser();
        $item = $this->makeItem(5);

        $this->actingAs($customer, 'sanctum');

        $this->postJson(
            '/api/orders',
            $this->orderPayload($item, 6)
        )->assertUnprocessable();

        $this->assertSame(
            5,
            $item->fresh()->stock_qty
        );

        $this->postJson('/api/orders', [
            'items' => [
                [
                    'menu_item_id' => $item->id,
                    'quantity' => 1,
                ],
                [
                    'menu_item_id' => $item->id,
                    'quantity' => 1,
                ],
            ],
        ])->assertUnprocessable();

        $this->assertSame(
            5,
            $item->fresh()->stock_qty
        );

        $response = $this->postJson(
            '/api/orders',
            $this->orderPayload($item, 2)
        );

        $response->assertCreated()
            ->assertJsonPath(
                'data.status',
                'pending'
            )
            ->assertJsonPath(
                'data.total_amount',
                '150.00'
            );

        $this->assertSame(
            3,
            $item->fresh()->stock_qty
        );

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'menu_item_id' => $item->id,
            'quantity' => 2,
        ]);
    }

    // TEST 6: CUSTOMER ORDER OWNERSHIP AND CANCELLATION

    public function test_customer_can_only_view_and_cancel_their_own_pending_orders(): void
    {
        $owner = $this->makeUser();
        $other = $this->makeUser();
        $item = $this->makeItem(5);

        $this->actingAs($owner, 'sanctum');

        $created = $this->postJson(
            '/api/orders',
            $this->orderPayload($item)
        )->assertCreated();

        $orderId = $created->json('data.id');

        $this->actingAs($other, 'sanctum');

        $this->getJson(
            "/api/orders/{$orderId}"
        )->assertNotFound();

        $this->postJson(
            "/api/orders/{$orderId}/cancel"
        )->assertNotFound();

        $this->actingAs($owner, 'sanctum');

        $this->postJson(
            "/api/orders/{$orderId}/cancel"
        )->assertOk()
            ->assertJsonPath(
                'data.status',
                'cancelled'
            );

        $this->assertSame(
            5,
            $item->fresh()->stock_qty
        );

        $this->postJson(
            "/api/orders/{$orderId}/cancel"
        )->assertStatus(409);
    }

    // TEST 7: ADMIN ORDER STATUS WORKFLOW

    public function test_admin_can_advance_orders_only_in_correct_sequence(): void
    {
        $customer = $this->makeUser();
        $admin = $this->makeUser('admin');
        $item = $this->makeItem(8);

        $this->actingAs($customer, 'sanctum');

        $created = $this->postJson(
            '/api/orders',
            $this->orderPayload($item)
        )->assertCreated();

        $orderId = $created->json('data.id');

        $this->actingAs($admin, 'sanctum');

        $this->getJson('/api/admin/orders')
            ->assertOk();

        $this->getJson(
            "/api/orders/{$orderId}"
        )->assertOk();

        // Skipping directly to Completed is forbidden.
        $this->patchJson(
            "/api/admin/orders/{$orderId}/status",
            ['status' => 'completed']
        )->assertStatus(409);

        foreach (
            ['preparing', 'ready', 'completed']
            as $nextStatus
        ) {
            $this->patchJson(
                "/api/admin/orders/{$orderId}/status",
                ['status' => $nextStatus]
            )->assertOk()
                ->assertJsonPath(
                    'data.status',
                    $nextStatus
                );
        }

        // Cannot move backwards from Completed.
        $this->patchJson(
            "/api/admin/orders/{$orderId}/status",
            ['status' => 'ready']
        )->assertStatus(409);

        $this->assertSame(
            'completed',
            Order::findOrFail($orderId)->status
        );

        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath(
                'data.pending_orders',
                0
            )
            ->assertJsonStructure([
                'data' => [
                    'today_orders',
                    'today_sales',
                    'low_stock_count',
                    'recent_orders',
                ],
            ]);
    }

    // TEST 8: PROTECT MENU ITEMS WITH ORDER HISTORY

    public function test_items_with_order_history_cannot_be_deleted(): void
    {
        $customer = $this->makeUser();
        $admin = $this->makeUser('admin');
        $item = $this->makeItem(10);

        $this->actingAs($customer, 'sanctum');

        $this->postJson(
            '/api/orders',
            $this->orderPayload($item)
        )->assertCreated();

        $this->actingAs($admin, 'sanctum');

        $this->deleteJson(
            "/api/menu-items/{$item->id}"
        )->assertStatus(409)
            ->assertJsonPath(
                'message',
                'Cannot delete a menu item with order history.'
            );

        $this->assertDatabaseHas('menu_items', [
            'id' => $item->id,
        ]);
    }
}
