'use client';
import { useParams } from 'next/navigation';
import { IncidentDetail } from '@/components/incidents/IncidentDetail';

export default function AdminIncidentDetailPage() {
  const { id } = useParams();
  return <IncidentDetail ticketId={id as string} />;
}
