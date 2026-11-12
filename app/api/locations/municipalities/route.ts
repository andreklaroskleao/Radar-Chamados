import { NextResponse } from 'next/server';
import { brazilianStates, IBGE_API_BASE, IBGE_REVALIDATE_SECONDS } from '@/lib/geography/ibge';

type Municipality = { id: number; nome: string };
export const revalidate = IBGE_REVALIDATE_SECONDS;

export async function GET(request: Request) {
  const abbreviation = new URL(request.url).searchParams.get('state')?.trim().toUpperCase();
  const state = brazilianStates.find((item) => item.abbreviation === abbreviation);
  if (!state) return NextResponse.json({ error: 'Informe uma sigla de estado válida.' }, { status: 400 });
  try {
    const url = new URL(IBGE_API_BASE + '/v1/localidades/estados/' + state.id + '/municipios');
    url.searchParams.set('orderBy', 'nome');
    const response = await fetch(url, { next: { revalidate: IBGE_REVALIDATE_SECONDS } });
    if (!response.ok) throw new Error('IBGE indisponível');
    return NextResponse.json(await response.json() as Municipality[]);
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os municípios agora.' }, { status: 502 });
  }
}

