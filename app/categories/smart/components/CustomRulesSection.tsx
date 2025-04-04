'use client';

import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiToggleLeft, FiToggleRight, FiInfo } from 'react-icons/fi';

type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
};

type Rule = {
  id: string;
  name: string;
  pattern: string;
  categoryId: string;
  isRegex: boolean;
  isActive: boolean;
};

type CustomRulesSectionProps = {
  rules: Rule[];
  categories: Category[];
  onRulesChange: (rules: Rule[]) => void;
  onRefresh: () => void;
};

export default function CustomRulesSection({ rules, categories, onRulesChange, onRefresh }: CustomRulesSectionProps) {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<Omit<Rule, 'id'>>({
    name: '',
    pattern: '',
    categoryId: '',
    isRegex: false,
    isActive: true,
  });
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<{ matched: boolean; rule?: Rule; category?: Category } | null>(null);

  const handleAddRule = () => {
    if (!newRule.name || !newRule.pattern || !newRule.categoryId) {
      return;
    }

    const rule: Rule = {
      ...newRule,
      id: `rule_${Date.now()}`,
    };

    const updatedRules = [...rules, rule];
    onRulesChange(updatedRules);
    setIsAddingRule(false);
    resetNewRule();
  };

  const handleUpdateRule = () => {
    if (!editingRule || !editingRule.name || !editingRule.pattern || !editingRule.categoryId) {
      return;
    }

    const updatedRules = rules.map(rule => 
      rule.id === editingRule.id ? editingRule : rule
    );
    
    onRulesChange(updatedRules);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      const updatedRules = rules.filter(rule => rule.id !== id);
      onRulesChange(updatedRules);
    }
  };

  const handleToggleActive = (id: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    );
    
    onRulesChange(updatedRules);
  };

  const resetNewRule = () => {
    setNewRule({
      name: '',
      pattern: '',
      categoryId: '',
      isRegex: false,
      isActive: true,
    });
  };

  const testRule = (rule: Rule) => {
    if (!testText) return;

    try {
      let isMatch = false;
      if (rule.isRegex) {
        const regex = new RegExp(rule.pattern, 'i');
        isMatch = regex.test(testText);
      } else {
        isMatch = testText.toLowerCase().includes(rule.pattern.toLowerCase());
      }

      const matchedCategory = categories.find(c => c.id === rule.categoryId);
      
      setTestResults({
        matched: isMatch,
        rule: rule,
        category: matchedCategory
      });
    } catch (error) {
      console.error('Error testing rule:', error);
      setTestResults({
        matched: false,
        rule: rule
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Custom Categorization Rules</h2>
          <button
            onClick={() => {
              setIsAddingRule(true);
              setEditingRule(null);
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Rule
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Create custom rules to automatically categorize transactions based on description patterns. 
          Rules are processed in order, and the first matching rule is applied.
        </p>

        <div className="bg-yellow-50 p-4 rounded-lg mb-6 flex items-start gap-3">
          <FiInfo className="text-yellow-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">About Pattern Matching</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You can use simple text patterns or regular expressions. For simple patterns, any transaction description containing
              the pattern will match. Regular expressions provide more powerful matching capabilities.
            </p>
          </div>
        </div>
        
        {/* Test Rule Panel */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-3">Test Your Patterns</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="testText" className="block text-sm font-medium text-gray-600 mb-1">
                Sample Transaction Description
              </label>
              <input
                type="text"
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="e.g., Starbucks Coffee"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="md:self-end">
              <button
                onClick={() => {
                  if (editingRule) {
                    testRule(editingRule);
                  } else if (isAddingRule && newRule.pattern && newRule.categoryId) {
                    testRule({...newRule, id: 'temp'});
                  }
                }}
                disabled={(!editingRule && (!isAddingRule || !newRule.pattern || !newRule.categoryId)) || !testText}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Test Current Rule
              </button>
            </div>
          </div>
          
          {testResults && (
            <div className={`mt-3 p-3 rounded-md ${testResults.matched ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
              <p className={`text-sm font-medium ${testResults.matched ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.matched 
                  ? `Match! "${testText}" would be categorized as ${testResults.category?.name || 'Unknown Category'}`
                  : `No match. "${testText}" does not match the pattern.`
                }
              </p>
            </div>
          )}
        </div>

        {/* Rules List */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No rules defined yet. Create your first rule to start automatic categorization.
                  </td>
                </tr>
              ) : (
                rules.map(rule => {
                  const category = categories.find(c => c.id === rule.categoryId);
                  return (
                    <tr key={rule.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {rule.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {rule.pattern}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {category ? (
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: category.color || '#4B5563' }}
                            ></div>
                            <span>{category.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Unknown Category</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {rule.isRegex ? 'Regex' : 'Text'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggleActive(rule.id)}
                          className="flex items-center"
                        >
                          {rule.isActive ? (
                            <>
                              <FiToggleRight className="text-green-500 h-5 w-5 mr-1" />
                              <span className="text-sm text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft className="text-gray-400 h-5 w-5 mr-1" />
                              <span className="text-sm text-gray-500">Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {(isAddingRule || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-4">
              {editingRule ? 'Edit Rule' : 'Create New Rule'}
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="ruleName" className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  id="ruleName"
                  value={editingRule ? editingRule.name : newRule.name}
                  onChange={(e) => 
                    editingRule 
                      ? setEditingRule({ ...editingRule, name: e.target.value })
                      : setNewRule({ ...newRule, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Coffee Shops Rule"
                />
              </div>
              
              <div>
                <label htmlFor="pattern" className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern
                </label>
                <input
                  type="text"
                  id="pattern"
                  value={editingRule ? editingRule.pattern : newRule.pattern}
                  onChange={(e) => 
                    editingRule 
                      ? setEditingRule({ ...editingRule, pattern: e.target.value })
                      : setNewRule({ ...newRule, pattern: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md font-mono"
                  placeholder={editingRule?.isRegex || newRule.isRegex ? 'e.g., (coffee|kopi)' : 'e.g., coffee'}
                />
              </div>
              
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="categoryId"
                  value={editingRule ? editingRule.categoryId : newRule.categoryId}
                  onChange={(e) => 
                    editingRule 
                      ? setEditingRule({ ...editingRule, categoryId: e.target.value })
                      : setNewRule({ ...newRule, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select a category</option>
                  <optgroup label="Expense Categories">
                    {categories
                      .filter(c => c.type === 'EXPENSE')
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    }
                  </optgroup>
                  <optgroup label="Income Categories">
                    {categories
                      .filter(c => c.type === 'INCOME')
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    }
                  </optgroup>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRegex"
                  checked={editingRule ? editingRule.isRegex : newRule.isRegex}
                  onChange={(e) => 
                    editingRule 
                      ? setEditingRule({ ...editingRule, isRegex: e.target.checked })
                      : setNewRule({ ...newRule, isRegex: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isRegex" className="ml-2 block text-sm text-gray-700">
                  Use Regular Expression
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingRule ? editingRule.isActive : newRule.isActive}
                  onChange={(e) => 
                    editingRule 
                      ? setEditingRule({ ...editingRule, isActive: e.target.checked })
                      : setNewRule({ ...newRule, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRule(false);
                    setEditingRule(null);
                    resetNewRule();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingRule ? handleUpdateRule : handleAddRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRule ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 