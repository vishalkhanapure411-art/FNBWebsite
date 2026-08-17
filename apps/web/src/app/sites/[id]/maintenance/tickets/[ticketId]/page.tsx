'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import {
  getTicket,
  updateTicketStatus,
  assignTicket,
  addTicketComment,
  addTicketPhoto,
  getVendors,
  type TicketData,
  type VendorData,
} from '@/lib/api/maintenance';

const NEXT_STATUS: Record<string, string[]> = {
  OPEN: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;
  const ticketId = params.ticketId as string;
  const { addToast } = useToast();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comment
  const [commentText, setCommentText] = useState('');

  // Photo
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const fetchTicket = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getTicket(ticketId);
      setTicket(res.data as TicketData);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load ticket', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, addToast]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    getVendors().then((res) => setVendors(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      await updateTicketStatus(ticketId, newStatus);
      addToast(`Ticket ${newStatus.replace(/_/g, ' ').toLowerCase()}`, 'success');
      fetchTicket();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    try {
      await assignTicket(ticketId, {
        vendorId: selectedVendorId || undefined,
      });
      addToast('Ticket assigned', 'success');
      setShowAssignModal(false);
      fetchTicket();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to assign', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      await addTicketComment(ticketId, commentText.trim());
      addToast('Comment added', 'success');
      setCommentText('');
      fetchTicket();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!photoUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await addTicketPhoto(ticketId, photoUrl.trim(), photoCaption || undefined);
      addToast('Photo added', 'success');
      setPhotoUrl('');
      setPhotoCaption('');
      setShowPhotoModal(false);
      fetchTicket();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add photo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-surface-500">Loading...</p></div>;
  }
  if (!ticket) {
    return <div className="flex min-h-[40vh] items-center justify-center"><p className="text-surface-500">Ticket not found.</p></div>;
  }

  const slaDisplay = () => {
    if (!ticket.slaDueAt) return null;
    const due = new Date(ticket.slaDueAt).getTime();
    const now = Date.now();
    const diff = due - now;
    const isOverdue = diff <= 0 && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED';
    const hours = Math.max(0, Math.round(Math.abs(diff) / (1000 * 60 * 60)));
    return (
      <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
        {isOverdue ? `⏰ ${hours}h overdue` : `⏱ ${hours}h remaining`}
      </span>
    );
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
    }
  };

  const comments = ticket.comments ?? [];
  const photos = ticket.photos ?? [];
  const nextStatuses = NEXT_STATUS[ticket.status] ?? [];

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.push(`/sites/${siteId}/maintenance/tickets`)} className="text-sm text-brand-600 mb-4 inline-block">← Back to Tickets</button>

      {/* Ticket Header */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">{ticket.title}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
              <StatusBadge status={ticket.status} />
              <StatusBadge status={ticket.category} variant="type" />
              {slaDisplay()}
            </div>
          </div>
        </div>

        <p className="text-sm text-surface-600 dark:text-surface-400 whitespace-pre-wrap mb-4">{ticket.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-surface-500 uppercase">Reported By</p><p className="font-medium">{ticket.reportedBy ? `${ticket.reportedBy.firstName} ${ticket.reportedBy.lastName}` : '—'}</p></div>
          <div>
            <p className="text-xs text-surface-500 uppercase">Assigned To</p>
            <p className="font-medium">
              {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : ticket.vendor ? `🏢 ${ticket.vendor.name}` : 'Unassigned'}
            </p>
          </div>
          {ticket.asset && (
            <div>
              <p className="text-xs text-surface-500 uppercase">Asset</p>
              <button onClick={() => router.push(`/sites/${siteId}/maintenance/assets/${ticket.asset!.id}`)} className="font-medium text-brand-600 hover:underline">
                {ticket.asset.name}
              </button>
            </div>
          )}
          <div><p className="text-xs text-surface-500 uppercase">Created</p><p className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</p></div>
          {ticket.resolvedAt && <div><p className="text-xs text-surface-500 uppercase">Resolved</p><p className="font-medium">{new Date(ticket.resolvedAt).toLocaleString()}</p></div>}
          {ticket.closedAt && <div><p className="text-xs text-surface-500 uppercase">Closed</p><p className="font-medium">{new Date(ticket.closedAt).toLocaleString()}</p></div>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {ticket.status === 'OPEN' && (
            <button onClick={() => { setShowAssignModal(true); setSelectedVendorId(ticket.vendorId ?? ''); }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Assign
            </button>
          )}
          {nextStatuses.map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)} disabled={isSubmitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                s === 'CLOSED' ? 'bg-red-600 hover:bg-red-700' :
                s === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-700' :
                s === 'IN_PROGRESS' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-surface-600 hover:bg-surface-700'
              }`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
          <button onClick={() => setShowPhotoModal(true)}
            className="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium hover:bg-surface-100">
            + Photo
          </button>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="rounded-lg overflow-hidden border">
                <a href={p.url} target="_blank" rel="noreferrer" className="block">
                  <div className="h-32 bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-2xl">📷</div>
                </a>
                {p.caption && <p className="text-xs p-2 text-surface-500">{p.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Timeline */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Comments & Activity</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-surface-500">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="border-l-2 border-brand-500 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{c.user.firstName} {c.user.lastName}</span>
                  <span className="text-xs text-surface-400">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment */}
        <div className="mt-6 border-t pt-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
            placeholder="Add a comment..."
          />
          <div className="flex justify-end mt-2">
            <button onClick={handleAddComment} disabled={isSubmitting || !commentText.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Sending...' : 'Add Comment'}
            </button>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Ticket">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assign to Vendor</label>
            <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select vendor...</option>
              {vendors.filter((v) => v.isActive).map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowAssignModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={handleAssign} disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Photo Modal */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="Add Photo">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Photo URL *</label>
            <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Caption</label>
            <input type="text" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowPhotoModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={handleAddPhoto} disabled={isSubmitting || !photoUrl.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add Photo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
