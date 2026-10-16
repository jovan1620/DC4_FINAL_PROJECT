<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The admin middleware protects write routes
        return true;
    }

    public function rules(): array
    {
        // PATCH permits partial updates.
        $required = $this->isMethod('patch')
            ? 'sometimes|required'
            : 'required';

        return [
            'category_id' => [
                $required,
                'integer',
                'exists:categories,id',
            ],
            'name' => [
                $required,
                'string',
                'max:255',
            ],
            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'price' => [
                $required,
                'numeric',
                'min:0',
                'max:99999999.99',
                'decimal:0,2',
            ],
            'stock_qty' => [
                $required,
                'integer',
                'min:0',
            ],
            'is_available' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.required' => 'Please select a category.',
            'category_id.exists' => 'The selected category does not exist.',
            'name.required' => 'Menu item name is required.',
            'price.required' => 'Price is required.',
            'price.min' => 'The price must be at least 0.',
            'stock_qty.required' => 'Stock quantity is required.',
            'stock_qty.min' => 'Stock cannot be negative.',
        ];
    }
}
