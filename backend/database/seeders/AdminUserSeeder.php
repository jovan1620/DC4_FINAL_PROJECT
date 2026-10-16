<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment('local')) {
            return;
        }

        $password = env('CANTEEN_ADMIN_PASSWORD');

        if (!$password) {
            throw new \RuntimeException(
                'Set CANTEEN_ADMIN_PASSWORD in your .env file.'
            );
        }

        $admin = User::firstOrNew([
            'email' => 'admin@canteen.test',
        ]);

        $admin->name = 'Canteen Administrator';
        $admin->password = $password;
        $admin->role = 'admin';
        $admin->save();
    }
}
