import type { Metadata } from 'next';
import { IBGE_REVALIDATE_SECONDS } from '@/lib/geography/ibge';
import { getBrazilStateBoundaries } from '@/lib/geography/ibge-server';
import { CoverageExplorer } from './coverage-explorer';
import type { CoverageFeatureCollection } from '@/lib/geography/types';

export const metadata: Metadata = {
  title: 'Mapa de cobertura | Radar Comercial Regional',
  description: 'Explore a cobertura geográfica do Radar Comercial Regional por estado e município.'
};

export const revalidate = IBGE_REVALIDATE_SECONDS;

export default async function CoveragePage() {
  let initialStates: CoverageFeatureCollection | null = null;
  let initialError: string | null = null;

  try {
    initialStates = await getBrazilStateBoundaries();
  } catch {
    initialError = 'Não foi possível carregar a malha oficial do Brasil agora. Tente novamente.';
  }

  return <CoverageExplorer initialStates={initialStates} initialError={initialError} />;
}
