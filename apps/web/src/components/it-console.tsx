'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  listDevices, createDevice, updateDevice, deleteDevice,
  listRoutings, createRouting, updateRouting, deleteRouting,
  type Device, type DeviceType, type ProductRouting, type Station,
} from '@/lib/api/it';
import { getAvailableMenu, getMenus, getCategories, getItems } from '@/lib/api/menu';
import { getSites, type SiteWithTenant } from '@/lib/api/sites';
import { useAuth } from '@/providers/auth-provider';

const DEVICE_TYPES: DeviceType[] = ['KDS_SCREEN', 'CDS_SCREEN', 'KOT_PRINTER'];
const STATIONS: Station[] = ['GRILL', 'FRY', 'COLD', 'DRINKS', 'DESSERT', 'EXPO'];

const TYPE_BADGE: Record<DeviceType, string> = {
  KDS_SCREEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  CDS_SCREEN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  KOT_PRINTER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const TABS = ['Devices', 'Product Routing'] as const;

export function ItConsole({ siteId }: { siteId?: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Devices');
  const [canWrite, setCanWrite] = useState(false);
  const [msg, setMsg] = useState('');

  // Central view needs a site picker (both DTOs require siteId).
  const [sites, setSites] = useState<SiteWithTenant[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [devices, setDevices] = useState<Device[]>([]);
  const [typeFilter, setTypeFilter] = useState<'' | DeviceType>('');
  const [routings, setRoutings] = useState<ProductRouting[]>([]);

  const site = siteId ?? selectedSiteId;

  useEffect(() => {
    const role = user?.role;
    setCanWrite(role === 'SUPER_ADMIN' || role === 'IT');
  }, [user]);

  useEffect(() => {
    if (siteId) return;
    let cancelled = false;
    getSites({ limit: 100 })
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r?.data) ? r.data : [];
        setSites(list);
        // Auto-select when there is exactly one site — otherwise require a choice.
        if (list.length === 1 && list[0]) setSelectedSiteId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const loadDevices = useCallback(async () => {
    if (!site) return;
    const r = await listDevices(site, typeFilter || undefined);
    setDevices(r.data);
  }, [site, typeFilter]);

  const loadRoutings = useCallback(async () => {
    if (!site) return;
    const r = await listRoutings(site);
    setRoutings(r.data);
  }, [site]);

  useEffect(() => {
    if (tab === 'Devices') loadDevices().catch(() => undefined);
    if (tab === 'Product Routing') loadRoutings().catch(() => undefined);
  }, [tab, loadDevices, loadRoutings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">IT / Device Configuration</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Devices (KDS / CDS / KOT printers) and product routing.
            {siteId ? ` Site: ${siteId}` : ' (Central — select a site below)'}
          </p>
        </div>
      </div>

      {!siteId && (
        <Card title="Site">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="input-base min-w-56"
            >
              <option value="">Select a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {!site && <span className="text-xs text-surface-400">Choose a site to load its devices and routings.</span>}
          </div>
        </Card>
      )}

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

      {tab === 'Devices' && (
        <DevicesTab
          devices={devices} canWrite={canWrite} site={site} isCentral={!siteId}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          onListChanged={loadDevices} setMsg={setMsg}
        />
      )}
      {tab === 'Product Routing' && (
        <RoutingsTab
          routings={routings} canWrite={canWrite} site={site} isCentral={!siteId} siteIdProp={siteId}
          onListChanged={loadRoutings} setMsg={setMsg}
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

// ─────────── Devices ───────────
function DevicesTab({
  devices, canWrite, site, isCentral, typeFilter, setTypeFilter, onListChanged, setMsg,
}: {
  devices: Device[]; canWrite: boolean; site: string; isCentral: boolean;
  typeFilter: '' | DeviceType; setTypeFilter: (t: '' | DeviceType) => void;
  onListChanged: () => Promise<void>; setMsg: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('KDS_SCREEN');
  const [deviceId, setDeviceId] = useState('');
  const [station, setStation] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStation, setEditStation] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOnline, setEditOnline] = useState(true);

  const create = async () => {
    if (!name.trim() || !deviceId.trim()) {
      setMsg('Name and device id are required');
      return;
    }
    try {
      await createDevice({
        name: name.trim(),
        type,
        deviceId: deviceId.trim(),
        siteId: site,
        station: (station || null) as Station | null,
        ipAddress: ipAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName(''); setDeviceId(''); setStation(''); setIpAddress(''); setNotes('');
      setMsg('Device created.');
      await onListChanged();
    } catch (e) {
      setMsg(`Create error: ${(e as Error).message}`);
    }
  };

  const startEdit = (d: Device) => {
    setEditingId(d.id);
    setEditName(d.name);
    setEditStation(d.station ?? '');
    setEditIp(d.ipAddress ?? '');
    setEditNotes(d.notes ?? '');
    setEditOnline(d.isOnline);
  };

  const saveEdit = async (d: Device) => {
    try {
      await updateDevice(d.id, {
        name: editName.trim() || d.name,
        station: (editStation || null) as Station | null,
        ipAddress: editIp.trim() || null,
        notes: editNotes.trim() || null,
        isOnline: editOnline,
      });
      setEditingId(null);
      setMsg('Device updated.');
      await onListChanged();
    } catch (e) {
      setMsg(`Update error: ${(e as Error).message}`);
    }
  };

  const toggleOnline = (d: Device) => {
    void (async () => {
      try {
        await updateDevice(d.id, { isOnline: !d.isOnline });
        await onListChanged();
      } catch (e) {
        setMsg(`Update error: ${(e as Error).message}`);
      }
    })();
  };

  const del = (d: Device) => {
    void (async () => {
      try {
        await deleteDevice(d.id);
        setMsg('Device deleted.');
        await onListChanged();
      } catch (e) {
        // e.g. blocked because the device is a routing printer.
        setMsg(`Delete error: ${(e as Error).message}`);
      }
    })();
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New device">
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input-base" />
            <select value={type} onChange={(e) => setType(e.target.value as DeviceType)} className="input-base">
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Device id" className="input-base" />
            <select value={station} onChange={(e) => setStation(e.target.value)} className="input-base">
              <option value="">Station (none)</option>
              {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="IP address (optional)" className="input-base" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="input-base" />
            {!site ? (
              <button disabled className="btn-primary opacity-50 cursor-not-allowed">Select a site first</button>
            ) : (
              <button onClick={create} className="btn-primary">Create</button>
            )}
          </div>
        </Card>
      )}

      <Card title={`Devices (${devices.length})`}>
        {!site && <p className="text-sm text-surface-400">Select a site to list its devices.</p>}
        {site && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as '' | DeviceType)}
                className="input-base"
              >
                <option value="">All types</option>
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                    <th className="py-2 px-2">Name</th><th>Type</th><th>Device ID</th><th>Station</th><th>IP</th><th>Status</th>
                    {isCentral && <th>Site</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <Fragment key={d.id}>
                      <tr className="border-t border-surface-100 dark:border-surface-800">
                        <td className="py-2 px-2 font-medium">{d.name}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[d.type]}`}>{d.type}</span>
                        </td>
                        <td>{d.deviceId}</td>
                        <td>{d.station ?? '—'}</td>
                        <td>{d.ipAddress ?? '—'}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${d.isOnline ? 'bg-green-500' : 'bg-red-400'}`} />
                            {d.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        {isCentral && <td>{d.site?.name ?? '—'}</td>}
                        <td>
                          {canWrite && (
                            <div className="flex gap-2">
                              <button onClick={() => toggleOnline(d)} className="btn-ghost text-xs px-3 py-1">
                                {d.isOnline ? 'Mark offline' : 'Mark online'}
                              </button>
                              <button onClick={() => startEdit(d)} className="btn-ghost text-xs px-3 py-1">Edit</button>
                              <button onClick={() => del(d)} className="btn-ghost text-xs px-3 py-1 text-red-600 dark:text-red-400">Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {editingId === d.id && canWrite && (
                        <tr className="border-t border-surface-100 dark:border-surface-800">
                          <td colSpan={isCentral ? 8 : 7} className="py-3 px-2 bg-surface-50 dark:bg-surface-800/50">
                            <div className="flex flex-wrap gap-2">
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-base" />
                              <select value={editStation} onChange={(e) => setEditStation(e.target.value)} className="input-base">
                                <option value="">Station (none)</option>
                                {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input value={editIp} onChange={(e) => setEditIp(e.target.value)} placeholder="IP address" className="input-base" />
                              <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" className="input-base" />
                              <label className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                                <input type="checkbox" checked={editOnline} onChange={(e) => setEditOnline(e.target.checked)} />
                                Online
                              </label>
                              <button onClick={() => saveEdit(d)} className="btn-primary text-xs px-3 py-1">Save</button>
                              <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={isCentral ? 8 : 7} className="py-4 text-center text-surface-400">No devices found for this site.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─────────── Product routings ───────────
function RoutingsTab({
  routings, canWrite, site, isCentral, siteIdProp, onListChanged, setMsg,
}: {
  routings: ProductRouting[]; canWrite: boolean; site: string; isCentral: boolean; siteIdProp?: string;
  onListChanged: () => Promise<void>; setMsg: (m: string) => void;
}) {
  const [menuItems, setMenuItems] = useState<{ id: string; name: string }[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsMsg, setItemsMsg] = useState('');
  const [printers, setPrinters] = useState<Device[]>([]);
  const [menuItemId, setMenuItemId] = useState('');
  const [station, setStation] = useState<Station>('GRILL');
  const [printerId, setPrinterId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStation, setEditStation] = useState<Station>('GRILL');
  const [editPrinterId, setEditPrinterId] = useState('');

  // Menu items for the routing form — per-site uses the site's available menu;
  // central walks the tenant's menus; failures degrade gracefully.
  useEffect(() => {
    if (!site) {
      setMenuItems([]);
      setItemsLoading(false);
      setItemsMsg('');
      return;
    }
    setItemsLoading(true);
    setItemsMsg('');
    void (async () => {
      try {
        const flat: { id: string; name: string }[] = [];
        if (siteIdProp) {
          const r = await getAvailableMenu(site);
          for (const m of r.data ?? []) {
            for (const c of m.categories ?? []) {
              for (const it of c.items ?? []) flat.push({ id: it.id, name: it.name });
            }
          }
        } else {
          const m = await getMenus();
          const all = Array.isArray(m.data) ? m.data : [];
          let used: string | null = null;
          for (const menu of all) {
            if (flat.length > 0) break;
            const cats = await getCategories(menu.id);
            const catList = Array.isArray(cats.data) ? cats.data : [];
            for (const c of catList) {
              const items = await getItems(menu.id, c.id);
              const itemList = Array.isArray(items.data) ? items.data : [];
              for (const it of itemList) flat.push({ id: it.id, name: it.name });
              if (flat.length > 150) break;
            }
            used = menu.id;
            if (flat.length > 0) break;
          }
          if (flat.length === 0) {
            setItemsMsg(used ? `No items found in menu ${used} (central view reads the first menu).` : 'No menus available.');
          }
        }
        setMenuItems(flat);
      } catch (e) {
        setMenuItems([]);
        setItemsMsg(`Items unavailable: ${(e as Error).message}`);
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [site, siteIdProp]);

  // KOT printers in the current site — the only devices a routing can print to.
  useEffect(() => {
    if (!site) {
      setPrinters([]);
      return;
    }
    let cancelled = false;
    listDevices(site, 'KOT_PRINTER')
      .then((r) => {
        if (!cancelled) setPrinters(r.data);
      })
      .catch(() => {
        if (!cancelled) setPrinters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [site]);

  const create = async () => {
    if (!menuItemId) {
      setMsg('Select a menu item');
      return;
    }
    try {
      await createRouting({
        menuItemId,
        station,
        siteId: site,
        printerId: printerId || null,
      });
      setMenuItemId('');
      setPrinterId('');
      setMsg('Routing created.');
      await onListChanged();
    } catch (e) {
      setMsg(`Create error: ${(e as Error).message}`);
    }
  };

  const startEdit = (r: ProductRouting) => {
    setEditingId(r.id);
    setEditStation(r.station);
    setEditPrinterId(r.printerId ?? '');
  };

  const saveEdit = async (r: ProductRouting) => {
    try {
      await updateRouting(r.id, { station: editStation, printerId: editPrinterId || null });
      setEditingId(null);
      setMsg('Routing updated.');
      await onListChanged();
    } catch (e) {
      setMsg(`Update error: ${(e as Error).message}`);
    }
  };

  const del = (r: ProductRouting) => {
    void (async () => {
      try {
        await deleteRouting(r.id);
        setMsg('Routing deleted.');
        await onListChanged();
      } catch (e) {
        setMsg(`Delete error: ${(e as Error).message}`);
      }
    })();
  };

  return (
    <div className="grid gap-6">
      {canWrite && (
        <Card title="New routing (menu item → station)">
          <div className="flex flex-wrap gap-2">
            <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} className="input-base flex-1 min-w-48">
              <option value="">Menu item…</option>
              {menuItems.map((mi) => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
            </select>
            <select value={station} onChange={(e) => setStation(e.target.value as Station)} className="input-base">
              {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={printerId} onChange={(e) => setPrinterId(e.target.value)} className="input-base">
              <option value="">No printer</option>
              {printers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.deviceId})</option>)}
            </select>
            {!site ? (
              <button disabled className="btn-primary opacity-50 cursor-not-allowed">Select a site first</button>
            ) : (
              <button onClick={create} className="btn-primary">Create</button>
            )}
          </div>
          {itemsLoading ? (
            <p className="text-xs text-surface-400 mt-2">Loading menu items…</p>
          ) : itemsMsg ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{itemsMsg}</p>
          ) : (
            <p className="text-xs text-surface-400 mt-2">
              {menuItems.length} menu item(s) · {printers.length} KOT printer(s) in site
            </p>
          )}
        </Card>
      )}

      <Card title={`Routings (${routings.length})`}>
        {!site && <p className="text-sm text-surface-400">Select a site to list its product routings.</p>}
        {site && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-surface-400 dark:text-surface-500">
                  <th className="py-2 px-2">Menu item</th><th>Station</th><th>Printer</th>
                  {isCentral && <th>Site</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {routings.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-t border-surface-100 dark:border-surface-800">
                      <td className="py-2 px-2 font-medium">{r.menuItem?.name ?? r.menuItemId}</td>
                      <td>{r.station}</td>
                      <td>{r.printer?.name ?? '—'}</td>
                      {isCentral && <td>{r.site?.name ?? '—'}</td>}
                      <td>
                        {canWrite && (
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(r)} className="btn-ghost text-xs px-3 py-1">Edit</button>
                            <button onClick={() => del(r)} className="btn-ghost text-xs px-3 py-1 text-red-600 dark:text-red-400">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {editingId === r.id && canWrite && (
                      <tr className="border-t border-surface-100 dark:border-surface-800">
                        <td colSpan={isCentral ? 5 : 4} className="py-3 px-2 bg-surface-50 dark:bg-surface-800/50">
                          <div className="flex flex-wrap gap-2">
                            <select value={editStation} onChange={(e) => setEditStation(e.target.value as Station)} className="input-base">
                              {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={editPrinterId} onChange={(e) => setEditPrinterId(e.target.value)} className="input-base">
                              <option value="">No printer</option>
                              {printers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.deviceId})</option>)}
                            </select>
                            <button onClick={() => saveEdit(r)} className="btn-primary text-xs px-3 py-1">Save</button>
                            <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-3 py-1">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {routings.length === 0 && (
                  <tr>
                    <td colSpan={isCentral ? 5 : 4} className="py-4 text-center text-surface-400">No routings for this site yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}