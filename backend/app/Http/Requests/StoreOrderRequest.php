<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:20',
            ],

            'items.*.menu_item_id' => [
                'required',
                'integer',
                'distinct',
                'exists:menu_items,id',
            ],

            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
                'max:999',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one food item.',
            'items.min' => 'Add at least one food item.',
            'items.*.menu_item_id.distinct' =>
                'A menu item cannot appear twice in the same order.',
            'items.*.quantity.min' =>
                'Quantity must be at least 1.',
        ];
    }
}
