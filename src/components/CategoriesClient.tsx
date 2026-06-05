'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#712ae2', // Purple (Accented secondary)
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#a855f7', // Light Purple
  '#71717a', // Zinc
];

interface Category {
  id: string;
  name: string;
  color: string;
  _count: {
    transactions: number;
  };
}

interface CategoriesClientProps {
  initialCategories: Category[];
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('#712ae2');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    
    const lowerPresetColors = PRESET_COLORS.map(c => c.toLowerCase());
    const lowerCatColor = cat.color.toLowerCase();
    
    if (lowerPresetColors.includes(lowerCatColor)) {
      const matchIndex = lowerPresetColors.indexOf(lowerCatColor);
      setSelectedColor(PRESET_COLORS[matchIndex]);
      setUseCustomColor(false);
    } else {
      setCustomColor(cat.color);
      setUseCustomColor(true);
    }
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setSelectedColor(PRESET_COLORS[0]);
    setUseCustomColor(false);
    setError('');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalColor = useCustomColor ? customColor : selectedColor;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: finalColor }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao criar categoria.');
      } else {
        setName('');
        const fetchRes = await fetch('/api/categories');
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          setCategories(fetchData.categories);
          router.refresh();
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setError('');
    setLoading(true);

    const finalColor = useCustomColor ? customColor : selectedColor;

    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: finalColor }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao editar categoria.');
      } else {
        handleCancelEdit();
        const fetchRes = await fetch('/api/categories');
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          setCategories(fetchData.categories);
          router.refresh();
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string, count: number) => {
    if (count > 0) {
      alert(`Não é possível excluir esta categoria porque ela possui ${count} transação(ões) vinculada(s).`);
      return;
    }

    if (!confirm('Deseja excluir esta categoria?')) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCategories(categories.filter(c => c.id !== catId));
        if (editingCategory?.id === catId) {
          handleCancelEdit();
        }
        router.refresh();
      } else {
        alert(data.error || 'Erro ao deletar categoria.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
      
      {/* Left/Middle Column: Categories List */}
      <div className="lg:col-span-2 space-y-md">
        <h3 className="text-body-lg font-body-lg font-bold text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary text-2xl">category</span>
          Minhas Categorias ({categories.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="bg-surface-container-lowest border border-outline-variant/30 p-sm rounded-xl flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-outline-variant/80 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-md min-w-0">
                <div 
                  className="w-4 h-4 rounded-full shrink-0 shadow-inner" 
                  style={{ backgroundColor: cat.color }}
                />
                <div className="min-w-0">
                  <h3 className="text-body-md font-bold text-on-surface truncate">{cat.name}</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-0.5">
                    {cat._count.transactions} Compra(s) vinculada(s)
                  </p>
                </div>
              </div>

              <div className="flex gap-xs">
                <button
                  onClick={() => handleStartEdit(cat)}
                  className="p-xs text-on-surface-variant hover:text-secondary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                  title="Editar Categoria"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat._count.transactions)}
                  disabled={cat._count.transactions > 0}
                  className={`p-xs rounded-lg transition-all border ${
                    cat._count.transactions > 0
                      ? 'text-on-surface-variant/20 border-transparent cursor-not-allowed opacity-30'
                      : 'text-on-surface-variant hover:text-error hover:bg-error-container/40 border-transparent hover:border-error-container cursor-pointer'
                  }`}
                  title={cat._count.transactions > 0 ? "Possui transações associadas" : "Excluir Categoria"}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-12 text-xs text-on-surface-variant opacity-60 font-medium">
              Nenhuma categoria cadastrada ainda.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Add/Edit Form */}
      <div className="space-y-md">
        <h3 className="text-body-lg font-body-lg font-bold text-on-surface">
          {editingCategory ? `Editar Categoria: ${editingCategory.name}` : 'Criar Nova Categoria'}
        </h3>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {error && (
            <div className="mb-4 bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={editingCategory ? handleEditCategory : handleAddCategory} className="space-y-md">
            <div className="space-y-1">
              <label className="text-label-sm font-label-sm text-on-surface-variant block">Nome da Categoria</label>
              <input
                type="text"
                required
                placeholder="Ex: Viagens, Saúde, Presentes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>

            {/* Color Selector */}
            <div className="space-y-sm">
              <label className="text-label-sm font-label-sm text-on-surface-variant block">Cor de Identificação</label>
              
              {!useCustomColor ? (
                <div className="grid grid-cols-5 gap-sm justify-items-center">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-full relative flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-outline-variant/20"
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && (
                        <span className="w-5 h-5 bg-white border border-outline-variant rounded-full flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-secondary text-[14px] font-black">check</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-sm">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-12 h-10 bg-transparent border border-outline-variant rounded-lg cursor-pointer outline-none shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs font-mono text-on-surface outline-none uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Toggle Color Mode */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setUseCustomColor(!useCustomColor)}
                  className="text-[10px] text-secondary hover:underline font-bold cursor-pointer select-none"
                >
                  {useCustomColor ? 'Escolher das cores padrão' : 'Escolha cor personalizada'}
                </button>
              </div>
            </div>

            <div className="flex gap-sm pt-sm">
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-1/2 py-2 px-3 bg-surface-container-high hover:bg-surface-dim text-on-surface-variant rounded-lg text-label-md font-label-md transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`${editingCategory ? 'w-1/2' : 'w-full'} py-2 px-3 bg-secondary text-on-secondary disabled:opacity-50 rounded-lg text-label-md font-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-xs cursor-pointer`}
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">{editingCategory ? 'save' : 'add'}</span>
                    <span>{editingCategory ? 'Salvar' : 'Criar'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
