'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listPlans, getPlan, createPlan, updatePlan, replacePlanItems, deletePlan,
  listIndents, getIndent, createIndent, submitIndent, approveIndent, issueIndent, cancelIndent, deleteIndent,
  type MenuPlan, type MenuPlanItem, type MenuPlanStatus, type Indent, type IndentStatus, type MealSlot,
} from '@/lib/api/culinary';
import { getAvailableMenu, getMenus, getCategories, getItems } from '@/lib/api/menu';
import { useAuth } from '@/providers/auth-provider';

const MEAL_SLOTS: MealSlot[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'ALL_DAY'];

const PLAN_STATUS_STYLES: Record<MenuPlanStatus, string> = {
  DRAFT: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-gray-200 text-gray-500 dark:bg-surface-800 dark:text-surface-500',
};

const INDENT_STATUS_STYLES: Record<IndentStatus, string> = {
  DRAFT: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ISSUED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const TABS = ['Menu Plans', 'Indents'] as const;

export function CulinaryConsole({ siteId }: { siteId?: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Menu Plans');
  const [canWrite, setCanWrite] = useState(false);
  const [msg, setMsg] = useState('');

  // Menu plans state
  const [plans, setPlans] = useState<MenuPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MenuPlan | null>(null);
  // Indents state
  const [indents, setIndents] = useState<Indent[]>([]);
  const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
  // Plan filter
  const [statusFilter, setStatusFilter] = useState<'' | MenuPlanStatus>('');

  useEffect(() => {
    const role = user?.role;
    setCanWrite(role === 'SUPER_ADMIN' || role === 'CULINARY');
  }, [user]);

  const loadPlans = useCallback(async () => {
    const r = await listPlans(statusFilter || undefined, siteId);
    setPlans(r.data);
  }, [siteId, statusFilter]);
  const loadIndents = useCallback(async () => {
    const r = await listIndents(undefined, siteId);
    setIndents(r.data);
  }, [siteId]);

  const refreshSelectedPlan = useCallback(async () => {
    if (!selectedPlan) return;
    const r = await getPlan(selectedPlan.id);
    setSelectedPlan(r.data);
  }, [selectedPlan]);
  const refreshSelectedIndent = useCallback(async () => {
    if (!selectedIndent) return;
    const r = await getIndent(selectedIndent.id);
    setSelectedIndent(r.data);
  }, [selectedIndent]);

  useEffect(() => {
    if (tab === 'Menu Plans') loadPlans().catch(() => undefined);
    if (tab === 'Indents') loadIndents().catch(() => undefined);
  }, [tab, loadPlans, loadIndents]);

  const isOpen = user?.siteId ? user.siteId === siteId : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Culinary</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Menu planning and provisioning indents.
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

      {tab === 'Menu Plans' && (
        <PlansTab
          plans={plans} canWrite={canWrite} siteId={siteId} selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          onChanged={refreshSelectedPlan} onListChanged={loadPlans} setMsg={setMsg}
        />
      )}
      {tab === 'Indents' && (
        <IndentsTab
          indents={indents} plans={plans} canWrite={canWrite} siteId={siteId}
          selectedIndent={selectedIndent} setSelectedIndent={setSelectedIndent}
          onChanged={refreshSelectedIndent} onListChanged={loadIndents} setMsg={setMsg}
        />
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

function statusBadge(status: string, styles: Record<string, string>) {
  return <span className={`px-2 py-0.5 rounded text-xs ${styles[status] ?? ''}`}>{status}</span>;
}

// ─────────── Menu Plans ───────────
function PlansTab({
  plans, canWrite, siteId, selectedPlan, setSelectedPlan, statusFilter, setStatusFilter, onChanged, onListChanged, setMsg,
}: {
  plans: MenuPlan[]; canWrite: boolean; siteId?: string;
  selectedPlan: MenuPlan | null; setSelectedPlan: (p: MenuPlan | null) => void;
  statusFilter: '' | MenuPlanStatus; setStatusFilter: (s: '' | MenuPlanStatus) => void;
  onChanged: () => Promise<void>; onListChanged: () => Promise<void>;
  setMsg: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [newPlanSiteId, setNewPlanSiteId] = useState('');

  const create = async () => {
    if (!name.trim() || !startDate || !endDate) {
      setMsg('Plan name and both dates are required');
      return;
    }
    try {
      await createPlan({ name: name.trim(), siteId: siteId ?? (newPlanSiteId || undefined), startDate, endDate, notes: notes.trim() || undefined });
      setName(''); setNotes(''); setMsg('Menu plan created (DRAFT)');
      await onListChanged();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    }
  };

  const select = (p: MenuPlan) => {
    getPlan(p.id)
      .then((r) => setSelectedPlan(r.data))
      .catch((e) => {
        setSelectedPlan(null);
        setMsg(`Error: ${(e as Error).message}`);
      });
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New menu plan (DRAFT)">
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Plan name" className="input-base" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-base" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-base" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input-base" />
            {!siteId && (
              <input
                value={newPlanSiteId} onChange={(e) => setNewPlanSiteId(e.target.value)}
                placeholder="Site id (optional — for that site)" className="input-base"
              />
            )}
            <button onClick={create} className="btn-primary">Create</button>
          </div>
        </Card>
      )}

      <Card title={`Menu plans (${plans.length})`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={statusFilter === '' ? 'btn-primary text-xs px-3 py-1' : 'btn-ghost text-xs px-3 py-1'}
          >
            All
          </button>
          {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'btn-primary text-xs px-3 py-1' : 'btn-ghost text-xs px-3 py-1'}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                <th className="py-2 px-2">Name</th><th>Dates</th><th>Status</th><th>Items</th><th>Indents</th><th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p: MenuPlan) => (
                <tr
                  key={p.id}
                  className={`border-t border-surface-100 dark:border-surface-800 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 ${selectedPlan?.id === p.id ? 'bg-surface-100 dark:bg-surface-800' : ''}`}
                  onClick={() => select(p)}
                >
                  <td className="py-2 px-2 font-medium">{p.name}</td>
                  <td>{p.startDate.slice(0, 10)} → {p.endDate.slice(0, 10)}</td>
                  <td>{statusBadge(p.status, PLAN_STATUS_STYLES)}</td>
                  <td>{p.items?.length ?? 0}</td>
                  <td>{p._count?.indents ?? 0}</td>
                  <td>
                    {canWrite && p.status === 'DRAFT' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlan(p.id)
                            .then(async () => {
                              setMsg('Menu plan deleted');
                              if (selectedPlan?.id === p.id) setSelectedPlan(null);
                              await onListChanged();
                            })
                            .catch((err) => setMsg(`Delete error: ${(err as Error).message}`));
                        }}
                        className="btn-ghost text-xs px-3 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-surface-400">No menu plans found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedPlan && (
        <PlanDetail
          plan={selectedPlan} canWrite={canWrite} siteId={siteId}
          onChanged={onChanged} onListChanged={onListChanged} setMsg={setMsg}
        />
      )}
    </div>
  );
}

// ─────────── Plan detail ───────────
function PlanDetail({
  plan, canWrite, siteId, onChanged, onListChanged, setMsg,
}: {
  plan: MenuPlan; canWrite: boolean; siteId?: string;
  onChanged: () => Promise<void>; onListChanged: () => Promise<void>; setMsg: (m: string) => void;
}) {
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number }[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [menuItemId, setMenuItemId] = useState('');
  const [dayIndex, setDayIndex] = useState('0');
  const [mealSlot, setMealSlot] = useState<MealSlot>('LUNCH');
  const [plannedQty, setPlannedQty] = useState('1');
  const [itemsMsg, setItemsMsg] = useState('');
  // Selected plan row may be stale (list include lacks price); always reconcile via onChanged() first.
  useEffect(() => {
    if (canWrite) {
      setItemsLoading(true);
      setItemsMsg('');
      void (async () => {
        try {
          if (siteId) {
            const r = await getAvailableMenu(siteId);
            const flat: { id: string; name: string; price: number }[] = [];
            for (const m of r.data ?? []) {
              for (const c of m.categories ?? []) {
                for (const it of c.items ?? []) flat.push({ id: it.id, name: it.name, price: it.price ?? 0 });
              }
            }
            setMenuItems(flat);
            if (flat.length === 0) setItemsMsg('No menu items available for this site.');
          } else {
            // Central view has no site — fall back to the tenant's menus/items.
            const m = await getMenus();
            const all = Array.isArray(m.data) ? m.data : [];
            let flat: { id: string; name: string; price: number }[] = [];
            let used: string | null = null;
            for (const menu of all) {
              if (flat.length > 0) break;
              const cats = await getCategories(menu.id);
              const catList = Array.isArray(cats.data) ? cats.data : [];
              for (const c of catList) {
                const items = await getItems(menu.id, c.id);
                const itemList = Array.isArray(items.data) ? items.data : [];
                for (const it of itemList) flat.push({ id: it.id, name: it.name, price: it.price ?? 0 });
                if (flat.length > 150) break;
              }
              used = menu.id;
              if (flat.length > 0) break;
            }
            setMenuItems(flat);
            if (flat.length === 0) {
              setItemsMsg(used ? `No items found in menu ${used} (central view reads the first menu).` : 'No menus available.');
            }
          }
        } catch (e) {
          setMenuItems([]);
          setItemsMsg(`Items unavailable: ${(e as Error).message}`);
        } finally {
          setItemsLoading(false);
        }
      })();
    } else {
      setItemsLoading(false);
    }
  }, [canWrite, siteId]);

  const addItem = async () => {
    if (!menuItemId) {
      setItemsMsg('Select a menu item');
      return;
    }
    const rows = plan.items ?? [];
    const exists = rows.some((r) => r.menuItemId === menuItemId && (r.dayIndex ?? 0) === Number(dayIndex) && (r.mealSlot ?? 'LUNCH') === mealSlot);
    if (exists) {
      setItemsMsg('That item already exists for the same day/slot — edit it instead.');
      return;
    }
    try {
      await replacePlanItems(plan.id, {
        items: [...rows, { menuItemId, dayIndex: Number(dayIndex), mealSlot, plannedQty: Number(plannedQty) }].map((r) => ({
          menuItemId: r.menuItemId,
          dayIndex: r.dayIndex ?? 0,
          mealSlot: r.mealSlot ?? 'LUNCH',
          plannedQty: r.plannedQty,
        })),
      });
      setItemsMsg('Item added to plan.');
      await onChanged();
      await onListChanged();
    } catch (e) {
      setItemsMsg(`Item error: ${(e as Error).message}`);
    }
  };

  const removeItem = (row: MenuPlanItem) => {
    void (async () => {
      try {
        await replacePlanItems(plan.id, {
          items: (plan.items ?? []).filter((r) => !(r.menuItemId === row.menuItemId && (r.dayIndex ?? 0) === (row.dayIndex ?? 0) && (r.mealSlot ?? 'LUNCH') === (row.mealSlot ?? 'LUNCH'))).map((r) => ({
            menuItemId: r.menuItemId,
            dayIndex: r.dayIndex ?? 0,
            mealSlot: r.mealSlot ?? 'LUNCH',
            plannedQty: r.plannedQty,
          })),
        });
        setItemsMsg('Item removed from plan.');
        await onChanged();
        await onListChanged();
      } catch (e) {
        setItemsMsg(`Item error: ${(e as Error).message}`);
      }
    })();
  };

  const setStatus = (next: MenuPlanStatus) => {
    void (async () => {
      try {
        await updatePlan(plan.id, { status: next });
        setMsg(`Plan status → ${next}`);
        await onChanged();
        await onListChanged();
      } catch (e) {
        setMsg(`Status error: ${(e as Error).message}`);
      }
    })();
  };

  return (
    <Card title={`Plan — ${plan.name} (${plan.status})`}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-surface-500 dark:text-surface-400">
          <span>{plan.startDate.slice(0, 10)} → {plan.endDate.slice(0, 10)}</span>
          {plan.notes && <span>· {plan.notes}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {canWrite && plan.status !== 'ARCHIVED' && (
            <>
              {plan.status === 'DRAFT' && (
                <button onClick={() => setStatus('ACTIVE')} className="btn-primary text-xs px-3 py-1">Activate</button>
              )}
              {plan.status === 'ACTIVE' && (
                <button onClick={() => setStatus('DRAFT')} className="btn-ghost text-xs px-3 py-1">Back to draft</button>
              )}
              <button onClick={() => setStatus('ARCHIVED')} className="btn-ghost text-xs px-3 py-1">Archive</button>
            </>
          )}
          {plan.status === 'ARCHIVED' && <span className="text-xs text-surface-400">🔒 Archived — items locked, no new indents.</span>}
        </div>

        {plan.status === 'DRAFT' && canWrite && (
          <div className="space-y-2 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
            <h4 className="text-xs font-semibold uppercase text-surface-400">Add item</h4>
            {itemsLoading ? (
              <div className="text-xs text-surface-400">Loading menu items…</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} className="input-base flex-1 min-w-48">
                    <option value="">Menu item…</option>
                    {menuItems.map((mi) => <option key={mi.id} value={mi.id}>{mi.name} (₹{mi.price})</option>)}
                  </select>
                  <input
                    type="number" min={0} max={30} value={dayIndex}
                    onChange={(e) => setDayIndex(e.target.value)} placeholder="Day 0-30" className="input-base w-24"
                  />
                  <select value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)} className="input-base">
                    {MEAL_SLOTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <input
                    type="number" min={1} value={plannedQty}
                    onChange={(e) => setPlannedQty(e.target.value)} placeholder="Planned qty" className="input-base w-24"
                  />
                  <button onClick={addItem} className="btn-primary">Add</button>
                </div>
                {itemsMsg && <p className="text-xs text-amber-600 dark:text-amber-400">{itemsMsg}</p>}
              </>
            )}
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase text-surface-400 mb-2">Items ({plan.items?.length ?? 0})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                  <th className="py-2 px-2">Menu item</th><th>Day</th><th>Slot</th><th>Planned qty</th><th></th>
                </tr>
              </thead>
              <tbody>
                {(plan.items ?? []).map((r) => {
                  const key = `${r.menuItemId}:${r.dayIndex ?? 0}:${r.mealSlot ?? 'LUNCH'}`;
                  return (
                    <tr key={key} className="border-t border-surface-100 dark:border-surface-800">
                      <td className="py-2 px-2 font-medium">{r.menuItem?.name ?? r.menuItemId}</td>
                      <td>{r.dayIndex ?? 0}</td>
                      <td>{r.mealSlot ?? '—'}</td>
                      <td>{r.plannedQty}</td>
                      <td>
                        {canWrite && plan.status === 'DRAFT' && (
                          <button onClick={() => removeItem(r)} className="btn-ghost text-xs px-3 py-1">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(plan.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-surface-400">No items on this plan — add some to drive indent computation.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────── Indents ───────────
function IndentsTab({
  indents, plans, canWrite, siteId, selectedIndent, setSelectedIndent, onChanged, onListChanged, setMsg,
}: {
  indents: Indent[]; plans: MenuPlan[]; canWrite: boolean; siteId?: string;
  selectedIndent: Indent | null; setSelectedIndent: (i: Indent | null) => void;
  onChanged: () => Promise<void>; onListChanged: () => Promise<void>; setMsg: (m: string) => void;
}) {
  const [planId, setPlanId] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const activePlans = plans.filter((p) => p.status === 'ACTIVE');

  const raise = async () => {
    if (!planId) {
      setMsg('Select an ACTIVE menu plan to raise against');
      return;
    }
    try {
      await createIndent({ menuPlanId: planId, siteId, label: label.trim() || undefined, notes: notes.trim() || undefined });
      setPlanId(''); setLabel(''); setNotes(''); setMsg('Indent raised (DRAFT) — lines computed from recipes');
      await onListChanged();
    } catch (e) {
      setMsg(`Indent error: ${(e as Error).message}`);
    }
  };

  const select = (i: Indent) => {
    getIndent(i.id)
      .then((r) => setSelectedIndent(r.data))
      .catch((e) => {
        setSelectedIndent(null);
        setMsg(`Error: ${(e as Error).message}`);
      });
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="Raise indent (DRAFT)">
          <div className="flex flex-wrap gap-2">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="input-base">
              <option value="">ACTIVE plan…</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.startDate.slice(0, 10)} → {p.endDate.slice(0, 10)})</option>
              ))}
              {activePlans.length === 0 && <option disabled>No ACTIVE plans yet — activate one first</option>}
            </select>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="input-base" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input-base" />
            <button onClick={raise} className="btn-primary">Raise</button>
          </div>
        </Card>
      )}

      <Card title={`Indents (${indents.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                <th className="py-2 px-2">Label</th><th>Status</th><th>Plan</th><th>Site</th><th>Lines</th><th></th>
              </tr>
            </thead>
            <tbody>
              {indents.map((i: Indent) => (
                <tr
                  key={i.id}
                  className={`border-t border-surface-100 dark:border-surface-800 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 ${selectedIndent?.id === i.id ? 'bg-surface-100 dark:bg-surface-800' : ''}`}
                  onClick={() => select(i)}
                >
                  <td className="py-2 px-2 font-medium">{i.label}</td>
                  <td>{statusBadge(i.status, INDENT_STATUS_STYLES)}</td>
                  <td>{i.menuPlan?.name ?? i.menuPlanId}</td>
                  <td>{i.site?.name ?? '—'}</td>
                  <td>{i.lines?.length ?? 0}</td>
                  <td>
                    {canWrite && i.status === 'DRAFT' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteIndent(i.id)
                            .then(async () => {
                              setMsg('Draft indent deleted');
                              if (selectedIndent?.id === i.id) setSelectedIndent(null);
                              await onListChanged();
                            })
                            .catch((err) => setMsg(`Delete error: ${(err as Error).message}`));
                        }}
                        className="btn-ghost text-xs px-3 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {indents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-surface-400">No indents raised yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedIndent && (
        <IndentDetail
          indent={selectedIndent} canWrite={canWrite} onChanged={onChanged} onListChanged={onListChanged} setMsg={setMsg}
        />
      )}
    </div>
  );
}

// ─────────── Indent detail ───────────
function IndentDetail({
  indent, canWrite, onChanged, onListChanged, setMsg,
}: {
  indent: Indent; canWrite: boolean; onChanged: () => Promise<void>; onListChanged: () => Promise<void>; setMsg: (m: string) => void;
}) {
  const act = (fn: (id: string) => Promise<{ success: boolean; data: Indent }>, label: string) => {
    void (async () => {
      try {
        await fn(indent.id);
        setMsg(`Indent ${label}.`);
        await onChanged();
        await onListChanged();
      } catch (e) {
        setMsg(`Indent error: ${(e as Error).message}`);
      }
    })();
  };

  const canCancel = indent.status === 'DRAFT' || indent.status === 'SUBMITTED';

  return (
    <Card title={`Indent — ${indent.label} (${indent.status})`}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-surface-500 dark:text-surface-400">
          <span>Plan: {indent.menuPlan?.name ?? indent.menuPlanId}</span>
          {indent.site && <span>· Site: {indent.site.name}</span>}
          {indent.notes && <span>· {indent.notes}</span>}
          {indent.submittedAt && <span>· Submitted {indent.submittedAt.slice(0, 10)}</span>}
          {indent.approvedAt && <span>· Approved {indent.approvedAt.slice(0, 10)}</span>}
          {indent.issuedAt && <span>· Issued {indent.issuedAt.slice(0, 10)}</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {canWrite && indent.status === 'DRAFT' && (
            <button onClick={() => act(submitIndent, 'submitted')} className="btn-primary text-xs px-3 py-1">Submit</button>
          )}
          {canWrite && indent.status === 'SUBMITTED' && (
            <button onClick={() => act(approveIndent, 'approved')} className="btn-primary text-xs px-3 py-1">Approve</button>
          )}
          {canWrite && indent.status === 'APPROVED' && (
            <button onClick={() => act(issueIndent, 'issued')} className="btn-primary text-xs px-3 py-1">Issue</button>
          )}
          {canWrite && canCancel && (
            <button onClick={() => act(cancelIndent, 'cancelled')} className="btn-ghost text-xs px-3 py-1">Cancel</button>
          )}
          {indent.status === 'CANCELLED' && <span className="text-xs text-surface-400">Cancelled</span>}
          {indent.status === 'ISSUED' && <span className="text-xs text-surface-400">Issued — provisioned to kitchen.</span>}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-surface-400 mb-2">Computed lines ({indent.lines?.length ?? 0})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                  <th className="py-2 px-2">Ingredient</th><th>Required qty</th><th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {(indent.lines ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-surface-100 dark:border-surface-800">
                    <td className="py-2 px-2 font-medium">{l.ingredient?.name ?? l.ingredientId}</td>
                    <td>{l.requiredQty}</td>
                    <td>{l.unit}</td>
                  </tr>
                ))}
                {(indent.lines ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-surface-400">No ingredient lines — plan items have no recipes yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}