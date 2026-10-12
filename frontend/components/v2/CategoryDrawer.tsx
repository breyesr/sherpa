'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useDrawer } from '@/lib/store/DrawerManager';
import Drawer from './Drawer';
import { 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Plus, 
  X, 
  Sparkles
} from 'lucide-react';
import { components } from '@/types/api';
import { CatalogField } from '@/types/models';
import { toast, errorMessage } from '@/lib/store/ToastManager';

type CategoryResponse = components['schemas']['CategoryResponse'];

export default function CategoryDrawer() {
  const { isOpen, payload, close: onClose } = useDrawer('category');
  const category = payload?.category;
  const queryClient = useQueryClient();
  const isEditing = !!category;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Category basic fields
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [description, setDescription] = useState('');

  // Category fields_config (Custom attributes)
  const [fields, setFields] = useState<CatalogField[]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<CatalogField | null>(null);

  // Add new attribute inline subform state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldErr, setNewFieldErr] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name || '');
        setCategoryType(category.category_type || '');
        setDescription(category.description || '');
        setFields(
          Array.isArray(category.fields_config)
            ? JSON.parse(JSON.stringify(category.fields_config))
            : []
        );
      } else {
        setName('');
        setCategoryType('');
        setDescription('');
        setFields([]);
      }
      setError('');
      setFieldToDelete(null);
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setNewFieldErr('');
    }
  }, [isOpen, category]);

  const handleLabelChange = (index: number, newLabel: string) => {
    const updated = [...fields];
    updated[index].label = newLabel;
    setFields(updated);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      setNewFieldErr('Attribute label is required');
      return;
    }

    const cleanKey = newFieldName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanKey) {
      setNewFieldErr('Invalid attribute label');
      return;
    }

    if (fields.some(f => f.key === cleanKey)) {
      setNewFieldErr(`An attribute with key "${cleanKey}" already exists in this category`);
      return;
    }

    const newField: CatalogField = {
      key: cleanKey,
      label: newFieldName.trim(),
      type: newFieldType
    };

    if (newFieldType === 'dropdown' || newFieldType === 'multiselect') {
      const optionsArray = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean);
      if (optionsArray.length === 0) {
        setNewFieldErr('Options are required for dropdown or multiselect');
        return;
      }
      newField.options = optionsArray;
    }

    setFields(prev => [...prev, newField]);
    setIsAddingField(false);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setNewFieldErr('');
  };

  const confirmDeleteField = () => {
    if (!fieldToDelete) return;
    setFields(prev => prev.filter(f => f.key !== fieldToDelete.key));
    setFieldToDelete(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      name: name.trim(),
      category_type: categoryType.trim() || null,
      description: description.trim() || null,
      fields_config: fields
    };

    try {
      if (isEditing && category) {
        await apiClient.patch<any>(`/trade/categories/${category.id}`, payload);
      } else {
        await apiClient.post<any>('/trade/categories', payload);
      }

      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(isEditing ? 'Category updated successfully' : 'Category created successfully');
      onClose();
    } catch (err: unknown) {
      const msg = errorMessage(err, 'Failed to save category');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const footerContent = (
    <div className="flex justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={loading}
        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        {isEditing ? 'Save Changes' : 'Create Category'}
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Category: ${category?.name}` : 'New Product Category'}
      subtitle={isEditing ? 'Update category information and product attributes template' : 'Create a category and configure its product attributes template'}
      size="standard"
      footer={footerContent}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Category Details Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Category Name *
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Standard, Premium, Accessories"
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Category Type / Classification
            </label>
            <input 
              type="text"
              placeholder="Optional category type or classification (e.g. Perishable, Raw Materials, Seasonal)"
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900"
              value={categoryType}
              onChange={e => setCategoryType(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Description
            </label>
            <textarea 
              rows={3}
              placeholder="Brief summary of what belongs in this category (e.g. scope, target use, or storage guidelines)..."
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900 resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Product Attributes Template Section */}
        <div className="pt-6 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                  Product Attributes Template
                </h4>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-6 font-medium">
                Define the custom specification fields that products in this category will capture.
              </p>
            </div>
            {!isAddingField && (
              <button
                type="button"
                onClick={() => setIsAddingField(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-all px-3 py-1.5 rounded-xl hover:bg-indigo-50 border border-dashed border-indigo-200 hover:border-indigo-300 shrink-0"
              >
                <Plus size={14} />
                Add Attribute
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Attributes defined here will apply exclusively to products within this category.
          </p>

          {/* Inline Add Attribute Subform (Matches CatalogDrawer style) */}
          {isAddingField && (
            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Custom Attribute</h5>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingField(false);
                    setNewFieldName('');
                    setNewFieldType('text');
                    setNewFieldOptions('');
                    setNewFieldErr('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {newFieldErr && (
                <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{newFieldErr}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Name</label>
                  <input 
                    type="text"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                    placeholder="e.g. Weight, Dimensions, Material"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Type</label>
                  <select 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Checkbox</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="textarea">Text Area</option>
                    <option value="multiselect">Multi-select</option>
                  </select>
                </div>
              </div>

              {(newFieldType === 'dropdown' || newFieldType === 'multiselect') && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Options (comma-separated)</label>
                  <input 
                    type="text"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                    placeholder="e.g. Option 1, Option 2, Option 3"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingField(false);
                    setNewFieldName('');
                    setNewFieldType('text');
                    setNewFieldOptions('');
                    setNewFieldErr('');
                  }}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
                >
                  <CheckCircle size={12} />
                  Add Specification
                </button>
              </div>
            </div>
          )}

          {/* List of Defined Attributes (Matches ManageCatalogAttributesDrawer) */}
          <div className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No custom specifications defined for this category yet.</p>
            ) : (
              fields.map((field, idx) => (
                <div key={field.key} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2 relative group">
                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Display Label
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400">key: {field.key}</span>
                        <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-200/80 px-1.5 py-0.5 rounded">
                          {field.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                        value={field.label}
                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setFieldToDelete(field)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete attribute"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Matches ManageCatalogAttributesDrawer) */}
      {fieldToDelete && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Attribute?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove the attribute <span className="font-bold text-gray-900">{fieldToDelete.label}</span> from this category?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFieldToDelete(null)}
                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteField}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                <Trash2 size={16} />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
