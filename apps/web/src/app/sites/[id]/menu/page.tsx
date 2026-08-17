'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getAvailableMenu,
  getItems,
  updateItem,
  createItem,
  createCategory,
  updateCategory,
  deleteCategory,
  getModifierGroups,
  createModifierGroup,
  createModifier,
  deleteModifierGroup,
  deleteModifier,
  type MenuData,
  type CategoryData,
  type MenuItemData,
  type ModifierGroupData,
  type ModifierData,
} from '@/lib/api/menu';

export default function MenuManagementPage() {
  const params = useParams();
  const siteId = params.id as string;
  const { addToast } = useToast();

  // Data
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showModifierGroupModal, setShowModifierGroupModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [selectedItemForMods, setSelectedItemForMods] = useState<MenuItemData | null>(null);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupData[]>([]);
  const [selectedGroupForMods, setSelectedGroupForMods] = useState<ModifierGroupData | null>(null);

  // Item Form
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: 0,
    shortCode: '',
    station: 'EXPO',
    dietaryTags: '',
    allergens: '',
    prepTimeMinutes: 10,
    taxRate: 0,
    sortOrder: 0,
  });

  // Category Form
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sortOrder: 0 });

  // Modifier Group Form
  const [modifierGroupForm, setModifierGroupForm] = useState({
    name: '',
    minSelect: 0,
    maxSelect: 1,
    required: false,
    sortOrder: 0,
  });

  // Modifier Form
  const [modifierForm, setModifierForm] = useState({
    name: '',
    priceAdjustment: 0,
    isDefault: false,
    sortOrder: 0,
  });

  // Fetch menus
  const fetchMenus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAvailableMenu(siteId);
      const menuList = Array.isArray(res.data) ? res.data : [];
      setMenus(menuList);
      if (menuList.length > 0 && !selectedMenuId) {
        setSelectedMenuId(menuList[0]!.id);
        setCategories(menuList[0]!.categories ?? []);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load menus', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, addToast, selectedMenuId]);

  useEffect(() => {
    fetchMenus();
  }, []);

  // When menu changes
  useEffect(() => {
    const menu = menus.find((m) => m.id === selectedMenuId);
    if (menu) {
      setCategories(menu.categories ?? []);
      setSelectedCategoryId(null);
      setItems([]);
    }
  }, [selectedMenuId, menus]);

  // When category changes
  useEffect(() => {
    if (selectedCategoryId && selectedMenuId) {
      fetchItems();
    }
  }, [selectedCategoryId, selectedMenuId]);

  const fetchItems = async () => {
    if (!selectedMenuId || !selectedCategoryId) return;
    try {
      const res = await getItems(selectedMenuId, selectedCategoryId);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load items', 'error');
    }
  };

  // 86 Toggle
  const handleToggle86 = async (item: MenuItemData) => {
    const newStatus = item.status === 'EIGHTY_SIX' ? 'AVAILABLE' : 'EIGHTY_SIX';
    try {
      await updateItem(item.menuId, item.categoryId, item.id, { status: newStatus });
      addToast(`${item.name} ${newStatus === 'EIGHTY_SIX' ? '86\'d' : 'back online'}`, 'success');
      fetchItems();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update item', 'error');
    }
  };

  // Create/Edit Item
  const openItemModal = (item?: MenuItemData) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description ?? '',
        price: Number(item.price),
        shortCode: item.shortCode ?? '',
        station: item.station,
        dietaryTags: (item.dietaryTags ?? []).join(', '),
        allergens: (item.allergens ?? []).join(', '),
        prepTimeMinutes: item.prepTimeMinutes,
        taxRate: Number(item.taxRate),
        sortOrder: item.sortOrder,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        description: '',
        price: 0,
        shortCode: '',
        station: 'EXPO',
        dietaryTags: '',
        allergens: '',
        prepTimeMinutes: 10,
        taxRate: 0,
        sortOrder: 0,
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!selectedMenuId || !selectedCategoryId) return;
    try {
      const data = {
        ...itemForm,
        dietaryTags: itemForm.dietaryTags.split(',').map((t) => t.trim()).filter(Boolean),
        allergens: itemForm.allergens.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editingItem) {
        await updateItem(selectedMenuId, selectedCategoryId, editingItem.id, data);
        addToast('Item updated', 'success');
      } else {
        await createItem(selectedMenuId, selectedCategoryId, data);
        addToast('Item created', 'success');
      }
      setShowItemModal(false);
      fetchItems();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save item', 'error');
    }
  };

  // Create/Edit Category
  const openCategoryModal = (cat?: CategoryData) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, description: cat.description ?? '', sortOrder: cat.sortOrder });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sortOrder: 0 });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!selectedMenuId) return;
    try {
      if (editingCategory) {
        await updateCategory(selectedMenuId, editingCategory.id, categoryForm);
        addToast('Category updated', 'success');
      } else {
        await createCategory(selectedMenuId, categoryForm);
        addToast('Category created', 'success');
      }
      setShowCategoryModal(false);
      // Refresh menus to get updated categories
      fetchMenus();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!selectedMenuId || !confirm('Delete this category and all its items?')) return;
    try {
      await deleteCategory(selectedMenuId, catId);
      addToast('Category deleted', 'success');
      fetchMenus();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  // Modifier Groups
  const openModGroups = async (item: MenuItemData) => {
    setSelectedItemForMods(item);
    try {
      const res = await getModifierGroups(item.id);
      setModifierGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load modifiers', 'error');
    }
    setShowModifierGroupModal(true);
  };

  const handleSaveModifierGroup = async () => {
    if (!selectedItemForMods) return;
    try {
      await createModifierGroup(selectedItemForMods.id, modifierGroupForm);
      addToast('Modifier group created', 'success');
      // Refresh groups
      const res = await getModifierGroups(selectedItemForMods.id);
      setModifierGroups(Array.isArray(res.data) ? res.data : []);
      setModifierGroupForm({ name: '', minSelect: 0, maxSelect: 1, required: false, sortOrder: 0 });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create modifier group', 'error');
    }
  };

  const handleDeleteModifierGroup = async (groupId: string) => {
    if (!selectedItemForMods || !confirm('Delete this modifier group?')) return;
    try {
      await deleteModifierGroup(selectedItemForMods.id, groupId);
      addToast('Modifier group deleted', 'success');
      const res = await getModifierGroups(selectedItemForMods.id);
      setModifierGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  // Modifiers
  const handleSaveModifier = async () => {
    if (!selectedGroupForMods) return;
    try {
      await createModifier(selectedGroupForMods.id, modifierForm);
      addToast('Modifier added', 'success');
      setModifierForm({ name: '', priceAdjustment: 0, isDefault: false, sortOrder: 0 });
      // Refresh
      if (selectedItemForMods) {
        const res = await getModifierGroups(selectedItemForMods.id);
        setModifierGroups(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add modifier', 'error');
    }
  };

  const handleDeleteModifier = async (modifierId: string) => {
    if (!selectedGroupForMods || !confirm('Delete this modifier?')) return;
    try {
      await deleteModifier(selectedGroupForMods.id, modifierId);
      addToast('Modifier deleted', 'success');
      if (selectedItemForMods) {
        const res = await getModifierGroups(selectedItemForMods.id);
        setModifierGroups(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const selectedMenu = menus.find((m) => m.id === selectedMenuId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Menu Management</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Manage menus, categories, items & modifiers</p>
        </div>
      </div>

      {/* Menu Selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Menu:</label>
        <select
          value={selectedMenuId ?? ''}
          onChange={(e) => setSelectedMenuId(e.target.value)}
          className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {menus.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.menuType})</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-12 text-center">
          <div className="text-surface-500">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Categories Column */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Categories</h3>
              <button
                onClick={() => openCategoryModal()}
                className="text-xs rounded bg-brand-600 px-2 py-1 text-white hover:bg-brand-700"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-300'
                      : 'hover:bg-surface-50 dark:hover:bg-surface-900 border border-transparent'
                  }`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <div>
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{cat.name}</span>
                    <span className="text-xs text-surface-400 ml-2">{cat.itemCount ?? 0} items</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                      className="text-xs text-surface-400 hover:text-brand-600 p-1"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      className="text-xs text-surface-400 hover:text-red-600 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Column */}
          <div className="col-span-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">
                {selectedCategoryId ? 'Items' : 'Select a category'}
              </h3>
              {selectedCategoryId && (
                <button
                  onClick={() => openItemModal()}
                  className="text-xs rounded bg-brand-600 px-2 py-1 text-white hover:bg-brand-700"
                >
                  + Add Item
                </button>
              )}
            </div>

            {!selectedCategoryId ? (
              <div className="text-center py-8 text-surface-400">Select a category to view items</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-surface-400">No items in this category</div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-900"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.name}</span>
                        <StatusBadge status={item.status} variant="status" />
                        {item.shortCode && (
                          <span className="text-xs text-surface-400 font-mono">{item.shortCode}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                        <span>${Number(item.price).toFixed(2)}</span>
                        <span>{item.station}</span>
                        {item.dietaryTags && item.dietaryTags.length > 0 && (
                          <span>{item.dietaryTags.join(', ')}</span>
                        )}
                        <span>{(item.modifierGroups ?? []).length} modifier groups</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle86(item)}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                          item.status === 'EIGHTY_SIX'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-surface-100 text-surface-500 hover:bg-red-100 hover:text-red-700'
                        }`}
                      >
                        {item.status === 'EIGHTY_SIX' ? '86\'d (Undo)' : '86'}
                      </button>
                      <button
                        onClick={() => openModGroups(item)}
                        className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-500 hover:bg-brand-100 hover:text-brand-700"
                      >
                        Modifiers
                      </button>
                      <button
                        onClick={() => openItemModal(item)}
                        className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-500 hover:bg-surface-200"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Modal */}
      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Edit Item' : 'New Item'} size="lg">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
              <input
                type="text"
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Short Code</label>
              <input
                type="text"
                value={itemForm.shortCode}
                onChange={(e) => setItemForm({ ...itemForm, shortCode: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Station</label>
              <select
                value={itemForm.station}
                onChange={(e) => setItemForm({ ...itemForm, station: e.target.value })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              >
                {['GRILL', 'FRY', 'COLD', 'DRINKS', 'DESSERT', 'EXPO'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.taxRate}
                onChange={(e) => setItemForm({ ...itemForm, taxRate: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Prep Time (min)</label>
              <input
                type="number"
                min="0"
                value={itemForm.prepTimeMinutes}
                onChange={(e) => setItemForm({ ...itemForm, prepTimeMinutes: parseInt(e.target.value) || 10 })}
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Dietary Tags (comma-separated)</label>
              <input
                type="text"
                value={itemForm.dietaryTags}
                onChange={(e) => setItemForm({ ...itemForm, dietaryTags: e.target.value })}
                placeholder="V, GF, DF"
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Allergens (comma-separated)</label>
              <input
                type="text"
                value={itemForm.allergens}
                onChange={(e) => setItemForm({ ...itemForm, allergens: e.target.value })}
                placeholder="nuts, dairy, gluten"
                className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {editingItem ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Sort Order</label>
            <input
              type="number"
              value={categoryForm.sortOrder}
              onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modifier Groups Modal */}
      <Modal isOpen={showModifierGroupModal} onClose={() => setShowModifierGroupModal(false)} title={`Modifiers: ${selectedItemForMods?.name ?? ''}`} size="lg">
        <div className="space-y-4">
          {/* Add new group */}
          <div className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
            <h4 className="text-sm font-semibold mb-2">Add Modifier Group</h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Group name"
                value={modifierGroupForm.name}
                onChange={(e) => setModifierGroupForm({ ...modifierGroupForm, name: e.target.value })}
                className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
              />
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={modifierGroupForm.minSelect}
                  onChange={(e) => setModifierGroupForm({ ...modifierGroupForm, minSelect: parseInt(e.target.value) || 0 })}
                  className="w-16 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-2 text-sm"
                />
                <span className="text-xs text-surface-400">to</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Max"
                  value={modifierGroupForm.maxSelect}
                  onChange={(e) => setModifierGroupForm({ ...modifierGroupForm, maxSelect: parseInt(e.target.value) || 1 })}
                  className="w-16 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2 py-2 text-sm"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={modifierGroupForm.required}
                    onChange={(e) => setModifierGroupForm({ ...modifierGroupForm, required: e.target.checked })}
                  />
                  Req
                </label>
              </div>
            </div>
            <button
              onClick={handleSaveModifierGroup}
              className="text-xs rounded bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
            >
              Add Group
            </button>
          </div>

          {/* Existing groups */}
          {modifierGroups.map((group) => (
            <div key={group.id} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">{group.name}</span>
                  <span className="text-xs text-surface-400 ml-2">
                    {group.minSelect}-{group.maxSelect} select{group.required ? ' • Required' : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteModifierGroup(group.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>

              {/* Modifiers in group */}
              <div className="space-y-1 mb-2">
                {(group.modifiers ?? []).map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-surface-800">
                    <span className="text-surface-700 dark:text-surface-300">
                      {mod.name}
                      {mod.isDefault && <span className="text-brand-500 ml-1">(default)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      {mod.priceAdjustment > 0 && (
                        <span className="text-surface-400">+${mod.priceAdjustment.toFixed(2)}</span>
                      )}
                      <button
                        onClick={() => handleDeleteModifier(mod.id)}
                        className="text-surface-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add modifier to this group */}
              <div
                onClick={() => {
                  setSelectedGroupForMods(group);
                  setShowModifierModal(true);
                }}
                className="text-xs text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                + Add Modifier
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Add Modifier Modal */}
      <Modal isOpen={showModifierModal} onClose={() => setShowModifierModal(false)} title="Add Modifier">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSaveModifier(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={modifierForm.name}
              onChange={(e) => setModifierForm({ ...modifierForm, name: e.target.value })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Price Adjustment</label>
            <input
              type="number"
              step="0.01"
              value={modifierForm.priceAdjustment}
              onChange={(e) => setModifierForm({ ...modifierForm, priceAdjustment: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={modifierForm.isDefault}
              onChange={(e) => setModifierForm({ ...modifierForm, isDefault: e.target.checked })}
              className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-surface-700 dark:text-surface-300">Default selection</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowModifierModal(false)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Modifier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
