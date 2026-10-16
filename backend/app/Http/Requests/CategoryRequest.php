<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The admin middleware checks permission.
        return true;
    }

    public function rules(): array
    {
        $category = $this->route('category');

        $categoryId = $category instanceof Category
            ? $category->id
            : null;

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categories', 'name')
                    ->ignore($categoryId),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Category name is required.',
            'name.unique' => 'This category already exists.',
        ];
    }
}
