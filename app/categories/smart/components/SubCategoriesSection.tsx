'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiChevronDown, FiInfo, FiArrowRight } from 'react-icons/fi';

type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  parentId?: string | null;
};

type SubCategoriesSectionProps = {
  categories: Category[];
  onRefresh: () => void;
};

export default function SubCategoriesSection({ categories, onRefresh }: SubCategoriesSectionProps) {
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    parentId: string;
    type: 'INCOME' | 'EXPENSE';
    color: string;
  } | null>(null);
  
  const [newSubCategory, setNewSubCategory] = useState<{
    name: string;
    parentId: string;
    type: 'INCOME' | 'EXPENSE';
    color: string;
  }>({
    name: '',
    parentId: '',
    type: 'EXPENSE',
    color: '#1976D2',
  });
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extract parent categories (those without a parentId)
  const parentCategories = categories.filter(cat => !cat.parentId);
  
  // Group subcategories by their parent ID
  const subcategoriesByParent = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (cat.parentId) {
      if (!acc[cat.parentId]) {
        acc[cat.parentId] = [];
      }
      acc[cat.parentId].push(cat);
    }
    return acc;
  }, {});

  const toggleExpandCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateSubCategory = async () => {
    if (!newSubCategory.name || !newSubCategory.parentId) {
      setError('Please fill in all required fields');
      return;
    }

    const parentCategory = categories.find(c => c.id === newSubCategory.parentId);
    if (!parentCategory) {
      setError('Parent category not found');
      return;
    }

    setError('');

    try {
      // Simulate API call to create subcategory
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be a fetch call to create the category in the database
      setSuccess(`Sub-category "${newSubCategory.name}" created successfully`);
      
      // Reset form and refresh data
      setTimeout(() => {
        setNewSubCategory({
          name: '',
          parentId: '',
          type: 'EXPENSE',
          color: '#1976D2',
        });
        setIsAddingCategory(false);
        setSuccess('');
        onRefresh();
      }, 2000);
    } catch (error) {
      setError('Failed to create sub-category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');

    try {
      // Simulate API call to update category
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be a fetch call to update the category in the database
      setSuccess(`Category "${editingCategory.name}" updated successfully`);
      
      // Reset form and refresh data
      setTimeout(() => {
        setEditingCategory(null);
        setSuccess('');
        onRefresh();
      }, 2000);
    } catch (error) {
      setError('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? All transactions will be moved to the parent category.')) {
      return;
    }

    try {
      // Simulate API call to delete category
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be a fetch call to delete the category
      setSuccess('Category deleted successfully');
      
      // Refresh data
      setTimeout(() => {
        setSuccess('');
        onRefresh();
      }, 2000);
    } catch (error) {
      setError('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sub-Categories</h2>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Sub-Category
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Create hierarchical categories for more detailed financial analysis. Sub-categories inherit the type (income/expense) 
          from their parent category but can have different colors.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 flex items-start gap-3">
          <FiInfo className="text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">About Sub-Categories</h3>
            <p className="text-sm text-blue-700 mt-1">
              Sub-categories allow you to organize your finances with greater detail. For example, under "Food" you might have "Groceries" 
              and "Restaurants" as sub-categories. This enables more granular reports and insights.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 text-green-600 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Category Tree View */}
        <div className="border rounded-lg divide-y">
          {parentCategories.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No categories found. Add a category first.
            </div>
          ) : (
            parentCategories.map(category => (
              <div key={category.id} className="category-item">
                <div 
                  className="flex justify-between items-center p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpandCategory(category.id)}
                >
                  <div className="flex items-center">
                    {(subcategoriesByParent[category.id]?.length > 0) ? (
                      expandedCategories.has(category.id) ? (
                        <FiChevronDown className="mr-2 text-gray-500" />
                      ) : (
                        <FiChevronRight className="mr-2 text-gray-500" />
                      )
                    ) : (
                      <div className="w-4 mr-2"></div> /* Spacer for categories without subcategories */
                    )}
                    
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: category.color || '#4B5563' }}
                    ></div>
                    
                    <span className="font-medium">{category.name}</span>
                    
                    <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {category.type === 'EXPENSE' ? 'Expense' : 'Income'}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory({
                          id: category.id,
                          name: category.name,
                          parentId: category.parentId || '',
                          type: category.type,
                          color: category.color,
                        });
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Sub-categories */}
                {expandedCategories.has(category.id) && subcategoriesByParent[category.id]?.length > 0 && (
                  <div className="pl-10 pr-3 pb-2 divide-y border-t">
                    {subcategoriesByParent[category.id].map(subcat => (
                      <div key={subcat.id} className="py-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: subcat.color || '#4B5563' }}
                          ></div>
                          <span>{subcat.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingCategory({
                                id: subcat.id,
                                name: subcat.name,
                                parentId: subcat.parentId || '',
                                type: subcat.type,
                                color: subcat.color,
                              });
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteCategory(subcat.id)}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Adding Sub-Category */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Sub-Category</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  id="parentCategory"
                  value={newSubCategory.parentId}
                  onChange={(e) => {
                    const parentCat = categories.find(c => c.id === e.target.value);
                    if (parentCat) {
                      setNewSubCategory({
                        ...newSubCategory,
                        parentId: e.target.value,
                        type: parentCat.type,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select a parent category</option>
                  {parentCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="subcategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-Category Name
                </label>
                <input
                  type="text"
                  id="subcategoryName"
                  value={newSubCategory.name}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Restaurants"
                />
              </div>
              
              <div>
                <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 mb-1">
                  Type (inherited from parent)
                </label>
                <input
                  type="text"
                  id="categoryType"
                  value={newSubCategory.type === 'EXPENSE' ? 'Expense' : 'Income'}
                  className="w-full px-3 py-2 border rounded-md bg-gray-100"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="categoryColor" className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  id="categoryColor"
                  value={newSubCategory.color}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, color: e.target.value })}
                  className="w-full h-10 p-1 rounded-lg border"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewSubCategory({
                      name: '',
                      parentId: '',
                      type: 'EXPENSE',
                      color: '#1976D2',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Sub-Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Category */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory.parentId ? 'Edit Sub-Category' : 'Edit Category'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="editCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="editCategoryName"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              {editingCategory.parentId && (
                <div>
                  <label htmlFor="editParentCategory" className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    id="editParentCategory"
                    value={editingCategory.parentId}
                    onChange={(e) => {
                      const parentCat = categories.find(c => c.id === e.target.value);
                      if (parentCat) {
                        setEditingCategory({
                          ...editingCategory,
                          parentId: e.target.value,
                          type: parentCat.type,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {parentCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="editCategoryColor" className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  id="editCategoryColor"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                  className="w-full h-10 p-1 rounded-lg border"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 