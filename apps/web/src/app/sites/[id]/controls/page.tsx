'use client';
import { useParams } from 'next/navigation';
import { ControlsConsole } from '@/components/controls-console';

export default function SiteControlsPage() {
  const { id } = useParams();
  return <ControlsConsole siteId={id as string} />;
}