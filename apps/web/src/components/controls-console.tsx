'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listIngredients, createIngredient, updateIngredient, deleteIngredient,
  listRecipes, createRecipe, getRecipeVersions,
  getCogs, listClosings, createClosingPeriod, closeClosingPeriod,
  type Ingredient, type Recipe, type CogsData, type ClosingPeriod,
} from '@/lib/api/controls';
import { useAuth } from '@/providers/auth-provider';

const UNIT_OPTS = ['KG', 'G', 'L', 'ML', 'PCS', 'PACK'];
const TABS = ['Ingredients', 'Recipes', 'COGS', 'Month Closing'] as const;

export function ControlsConsole({ siteId }: { siteId?: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Ingredients');
  const [canWrite, setCanWrite] = useState(false);
  const [msg, setMsg] = useState('');

  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // COGS state
  const [cogs, setCogs] = useState<CogsData | null>(null);
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  // Closings state
  const [closings, setClosings] = useState<ClosingPeriod[]>([]);

  useEffect(() => {
    const role = user?.role;
    setCanWrite(role === 'SUPER_ADMIN' || role === 'CONTROLS');
  }, [user]);

  const badge = (ok: boolean) => console.log('controls-console', siteId, tab);

  const loadIngredients = useCallback(async () => {
    const r = await listIngredients();
    setIngredients(r.data);
  }, []);
  const loadRecipes = useCallback(async () => {
    const r = await listRecipes('true');
    setRecipes(r.data);
  }, []);
  const loadClosings = useCallback(async () => {
    const r = await listClosings(siteId);
    setClosings(r.data);
  }, [siteId]);
  const runCogs = useCallback(async () => {
    setMsg('');
    try {
      const r = await getCogs({ siteId, from, to });
      setCogs(r.data);
    } catch (e) {
      setMsg(`COGS error: ${(e as Error).message}`);
    }
  }, [siteId, from, to]);

  useEffect(() => {
    if (tab === 'Ingredients') loadIngredients().catch(() => undefined);
    if (tab === 'Recipes') loadRecipes().catch(() => undefined);
    if (tab === 'Month Closing') loadClosings().catch(() => undefined);
  }, [tab, loadIngredients, loadRecipes, loadClosings]);

  const isOpen = user?.siteId ? user.siteId === siteId : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Controls / Product Management</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Ingredients, recipe costing (BOM), COGS and month-end closing.
            {siteId ? ` Site: ${siteId}` : ' (Central — all sites)'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              tab === t
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {msg && <div className="text-sm text-amber-600 dark:text-amber-400">{msg}</div>}
      {!isOpen && <div className="text-sm text-red-500">Site mismatch — you may only view your own site.</div>}

      {tab === 'Ingredients' && (
        <IngredientsTab ingredients={ingredients} canWrite={canWrite} siteId={siteId}
          onChanged={loadIngredients} setMsg={setMsg} />
      )}
      {tab === 'Recipes' && (
        <RecipesTab recipes={recipes} canWrite={canWrite} onChanged={loadRecipes} setMsg={setMsg} />
      )}
      {tab === 'COGS' && (
        <CogsTab from={from} to={to} setFrom={setFrom} setTo={setTo} cogs={cogs} runCogs={runCogs} />
      )}
      {tab === 'Month Closing' && (
        <ClosingsTab closings={closings} canWrite={canWrite} siteId={siteId}
          onChanged={loadClosings} setMsg={setMsg} />
      )}
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-5">
      {title && <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-3">{title}</h3>}
      {children}
    </div>
  );
}

// ─────────── Ingredients ───────────
function IngredientsTab({ ingredients, canWrite, siteId, onChanged, setMsg }: any) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('KG');
  const [cost, setCost] = useState('');

  const submit = async () => {
    try {
      await createIngredient({ name, unit, costPerUnit: parseFloat(cost), siteId });
      setName(''); setCost('');
      setMsg('Ingredient created');
      await onChanged();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New ingredient">
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input-base" />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input-base">
              {UNIT_OPTS.map((u) => <option key={u}>{u}</option>)}
            </select>
            <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost / unit" type="number" className="input-base" />
            <button onClick={submit} className="btn-primary">Add</button>
          </div>
        </Card>
      )}
      <Card title={`Ingredients (${ingredients.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                <th className="py-2 px-2">Name</th><th>Unit</th><th>Cost/unit</th><th>Supplier</th><th>Recipes</th><th>Active</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i: Ingredient) => (
                <tr key={i.id} className="border-t border-surface-100 dark:border-surface-800">
                  <td className="py-2 px-2 font-medium">{i.name}</td>
                  <td>{i.unit}</td>
                  <td>₹{i.costPerUnit.toFixed(2)}</td>
                  <td>{i.supplier ?? '—'}</td>
                  <td>{i._count?.recipeLines ?? 0}</td>
                  <td>
                    <button
                      onClick={async () => {
                        await updateIngredient(i.id, { active: !i.active }).catch((e) => setMsg(e.message));
                        await onChanged();
                      }}
                      className={i.active ? 'text-green-600' : 'text-gray-400'}
                    >
                      {i.active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─────────── Recipes ───────────
function RecipesTab({ recipes, canWrite, onChanged, setMsg }: any) {
  const [menuItemId, setMenuItemId] = useState('');
  const [lines, setLines] = useState<{ ingredientId: string; qty: string }[]>([{ ingredientId: '', qty: '' }]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [versions, setVersions] = useState<Recipe[] | null>(null);

  useEffect(() => {
    listIngredients().then((r) => setIngredients(r.data)).catch(() => setIngredients([]));
  }, []);

  // menu options: any recipe-less menu item would need the menu endpoint; we reuse
  // recipes' menu items as a guide and allow creating a new recipe for an id.
  const submit = async () => {
    try {
      const ls = lines.map((l) => ({ ingredientId: l.ingredientId, qty: parseFloat(l.qty), unit: 'KG' }));
      await createRecipe({ menuItemId, lines: ls });
      setMsg('Recipe created (cost computed server-side)');
      await onChanged();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  };

  const showVersions = async (r: Recipe) => {
    const v = await getRecipeVersions(r.id);
    setVersions(v.data);
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New recipe (BOM — cost computed server-side)">
          <div className="space-y-2">
            <input value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}
              placeholder="Menu item id (e.g. mi-vm-masala-dosa)" className="input-base" />
            <div className="space-y-1">
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2">
                  <select value={l.ingredientId} onChange={(e) => {
                    const n = [...lines]; n[idx].ingredientId = e.target.value; setLines(n);
                  }} className="input-base flex-1">
                    <option value="">Ingredient…</option>
                    {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} (₹{i.costPerUnit}/{i.unit})</option>)}
                  </select>
                  <input value={l.qty} onChange={(e) => {
                    const n = [...lines]; n[idx].qty = e.target.value; setLines(n);
                  }} placeholder="Qty" type="number" className="input-base w-24" />
                  <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="btn-ghost">✕</button>
                </div>
              ))}
              <button onClick={() => setLines([...lines, { ingredientId: '', qty: '' }])} className="btn-ghost">+ line</button>
            </div>
            <button onClick={submit} className="btn-primary">Create recipe</button>
          </div>
        </Card>
      )}
      <Card title={`Recipes (${recipes.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                <th className="py-2 px-2">Menu item</th><th>Cost/serve</th><th>Version</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r: Recipe) => (
                <tr key={r.id} className="border-t border-surface-100 dark:border-surface-800">
                  <td className="py-2 px-2 font-medium">{r.menuItem?.name ?? r.name}</td>
                  <td>₹{r.costPerServe.toFixed(2)}</td>
                  <td>v{r.version}</td>
                  <td>{r.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => showVersions(r)} className="btn-ghost text-xs">History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {versions && (
          <div className="mt-4 text-sm">
            <h4 className="font-semibold mb-2">Version history</h4>
            {versions.map((v) => (
              <div key={v.id} className="flex justify-between border-t border-surface-100 dark:border-surface-800 py-1">
                <span>v{v.version} — {v.menuItem?.name ?? v.name}</span>
                <span className="font-medium">₹{v.costPerServe.toFixed(2)}</span>
                <span>{v.active ? 'active' : 'superseded'}</span>
              </div>
            ))}
            <button onClick={() => setVersions(null)} className="btn-ghost text-xs mt-2">Close</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────── COGS ───────────
function CogsTab({ from, to, setFrom, setTo, cogs, runCogs }: any) {
  return (
    <div className="space-y-6">
      <Card title="COGS report">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-base ml-2" />
          </label>
          <label className="text-sm">To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-base ml-2" />
          </label>
          <button onClick={runCogs} className="btn-primary">Run report</button>
        </div>
      </Card>
      {cogs && (
        <>
          <Card title={`Totals — ${cogs.siteName}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <Metric label="Revenue" value={`₹${cogs.totals.revenue.toFixed(2)}`} />
              <Metric label="COGS" value={`₹${cogs.totals.cogs.toFixed(2)}`} />
              <Metric label="Gross margin" value={`₹${cogs.totals.grossMargin.toFixed(2)}`} />
              <Metric label="Margin %" value={`${cogs.totals.marginPct}%`} />
            </div>
          </Card>
          <Card title="Per-item">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                    <th className="py-2 px-2">Item</th><th>Qty</th><th>Revenue</th><th>Cost</th><th>Margin ₹</th><th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {cogs.perItem.map((r) => {
                    const m = r.revenue - r.cost;
                    const pct = r.revenue > 0 ? ((m / r.revenue) * 100).toFixed(1) : '—';
                    return (
                      <tr key={r.menuItemId} className="border-t border-surface-100 dark:border-surface-800">
                        <td className="py-2 px-2 font-medium">{r.name}</td>
                        <td>{r.qty}</td>
                        <td>₹{r.revenue.toFixed(2)}</td>
                        <td>₹{r.cost.toFixed(2)}</td>
                        <td>₹{m.toFixed(2)}</td>
                        <td>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {cogs.uncostedItems.length > 0 && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                ⚠ {cogs.uncostedItems.length} item(s) without a recipe (not included in COGS).
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────── Month Closing ───────────
function ClosingsTab({ closings, canWrite, siteId, onChanged, setMsg }: any) {
  const [label, setLabel] = useState('');
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10));

  const create = async () => {
    try {
      await createClosingPeriod({ siteId, label: label || 'Monthly closing', startDate: start, endDate: end });
      setLabel(''); setMsg('Closing period created (OPEN)');
      await onChanged();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  };
  const close = async (id: string) => {
    try {
      await closeClosingPeriod(id);
      setMsg('Closing period locked — P&L snapshot recorded');
      await onChanged();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New closing period">
          <div className="flex flex-wrap gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="input-base" />
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input-base" />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input-base" />
            <button onClick={create} className="btn-primary">Create</button>
          </div>
        </Card>
      )}
      <Card title={`Closing periods (${closings.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                <th className="py-2 px-2">Label</th><th>Site</th><th>Start</th><th>End</th><th>Status</th>
                <th>Revenue</th><th>COGS</th><th>Margin</th><th></th>
              </tr>
            </thead>
            <tbody>
              {closings.map((c: ClosingPeriod) => (
                <tr key={c.id} className="border-t border-surface-100 dark:border-surface-800">
                  <td className="py-2 px-2 font-medium">{c.label}</td>
                  <td>{c.site?.name ?? 'All sites'}</td>
                  <td>{c.startDate.slice(0, 10)}</td>
                  <td>{c.endDate.slice(0, 10)}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>₹{c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>₹{c.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>₹{c.grossMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    {c.status === 'OPEN' && canWrite && (
                      <button onClick={() => close(c.id)} className="btn-primary text-xs px-3 py-1">Lock &amp; close</button>
                    )}
                    {c.status === 'LOCKED' && <span className="text-xs text-surface-400">🔒 Locked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
      <div className="text-xs text-surface-400">{label}</div>
      <div className="text-xl font-bold text-surface-900 dark:text-surface-50 mt-1">{value}</div>
    </div>
  );
}
