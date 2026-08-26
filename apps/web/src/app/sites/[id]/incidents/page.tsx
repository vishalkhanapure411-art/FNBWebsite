'use client';
import { useParams } from 'next/navigation';
import { IncidentConsole } from '@/components/incidents/IncidentConsole';

export default function SiteIncidentsPage() {
  const { id } = useParams();
  return <IncidentConsole presetSiteId={id as string} />;
}
