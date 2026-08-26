'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { getSites, type SiteWithTenant } from '@/lib/api/sites';
import {
  createIncident,
  getIncidentCategories,
  type IncidentCategoryNode,
} from '@/lib/api/incidents';
import { INCIDENT_DEPT_BY_ROLE, INCIDENT_DEPARTMENT_LABELS } from '@/lib/incidents';
import {
  IncidentDepartment,
  IncidentSeverity,
} from '@omniops/shared';

const inputClass =
  'w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500';
const SEVERITIES: IncidentSeverity[] = [
  IncidentSeverity.LOW,
  IncidentSeverity.MEDIUM,
  IncidentSeverity.HIGH,
  IncidentSeverity.CRITICAL,
];

export function IncidentCreateModal({
  isOpen,
  onClose,
  onCreated,
  presetSiteId,
  fixedDepartment,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  presetSiteId?: string;
  fixedDepartment?: IncidentDepartment;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const role = user?.role;
  const dept = fixedDepartment ?? INCIDENT_DEPT_BY_ROLE[role as keyof typeof INCIDENT_DEPT_BY_ROLE];

  const [sites, setSites] = useState<SiteWithTenant[]>([]);
  const [tree, setTree] = useState<IncidentCategoryNode[]>([]);
  const [l1, setL1] = useState('');
  const [l2, setL2] = useState('');
  const [l3, setL3] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>(IncidentSeverity.MEDIUM);
  const [siteId, setSiteId] = useState('');
  const [saving, setSaving] = useState(false);

  // user.siteId binds the ticket to their own site (no site selector).
  const boundSite = user?.siteId ?? presetSiteId ?? '';

  useEffect(() => {
    if (!isOpen) return;
    setL1(''); setL2(''); setL3(''); setTitle(''); setDescription('');
    setSeverity(IncidentSeverity.MEDIUM); setSaving(false);
    if (dept) {
      getIncidentCategories(dept)
        .then((r) => setTree(r.data))
        .catch(() => setTree([]));
    } else {
      setTree([]);
    }
  }, [isOpen, dept]);

  const loadSites = useCallback(() => {
    getSites({ limit: 200 })
      .then((r) => setSites(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setSites([]));
  }, []);
  useEffect(() => {
    if (isOpen && !boundSite) loadSites();
  }, [isOpen, boundSite, loadSites]);

  if (!dept) return null;

  const l1Node = tree.find((n) => n.id === l1);
  const l2Node = l1Node?.children.find((n) => n.id === l2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dept || !title.trim()) return;
    setSaving(true);
    try {
      await createIncident({
        ...(boundSite ? { siteId: boundSite } : siteId ? { siteId } : {}),
        department: dept,
        ...(l1 ? { categoryLevel1Id: l1 } : {}),
        ...(l2 ? { categoryLevel2Id: l2 } : {}),
        ...(l3 ? { categoryLevel3Id: l3 } : {}),
        title: title.trim(),
        description: description.trim(),
        severity,
      });
      addToast('Incident ticket created', 'success');
      onCreated();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create incident ticket" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Department</label>
            <input className={inputClass} value={INCIDENT_DEPARTMENT_LABELS[dept]} disabled />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Severity</label>
            <select
              className={inputClass}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {!boundSite && (
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Site</label>
            <select
              className={inputClass}
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              <option value="">— No site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Title *</label>
          <input
            className={inputClass}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary of the incident"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Description *</label>
          <textarea
            className={inputClass}
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detail the incident…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Category L1</label>
            <select className={inputClass} value={l1} onChange={(e) => { setL1(e.target.value); setL2(''); setL3(''); }}>
              <option value="">— select —</option>
              {tree.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Category L2</label>
            <select
              className={inputClass}
              value={l2}
              disabled={!l1}
              onChange={(e) => { setL2(e.target.value); setL3(''); }}
            >
              <option value="">— select —</option>
              {(l1Node?.children ?? []).map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Category L3</label>
            <select
              className={inputClass}
              value={l3}
              disabled={!l2}
              onChange={(e) => setL3(e.target.value)}
            >
              <option value="">— select —</option>
              {(l2Node?.children ?? []).map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </Modal>
  );
}
