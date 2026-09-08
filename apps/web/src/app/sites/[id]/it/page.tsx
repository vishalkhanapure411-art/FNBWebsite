'use client';
import { useParams } from 'next/navigation';
import { ItConsole } from '@/components/it-console';

export default function SiteItPage() {
  const { id } = useParams();
  return <ItConsole siteId={id as string} />;
}