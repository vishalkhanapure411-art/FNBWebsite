'use client';
import { useParams } from 'next/navigation';
import { CulinaryConsole } from '@/components/culinary-console';

export default function SiteCulinaryPage() {
  const { id } = useParams();
  return <CulinaryConsole siteId={id as string} />;
}