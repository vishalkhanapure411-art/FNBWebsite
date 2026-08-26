'use client';
import { useParams } from 'next/navigation';
import { IncidentDetail } from '@/components/incidents/IncidentDetail';

export default function SiteIncidentDetailPage() {
  const { id, ticketId } = useParams();
  return <IncidentDetail ticketId={ticketId as string} siteId={id as string} />;
}
