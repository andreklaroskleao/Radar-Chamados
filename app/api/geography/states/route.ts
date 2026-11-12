import { NextResponse } from 'next/server';
import { getBrazilStateBoundaries } from '@/lib/geography/ibge-server';
import { IBGE_REVALIDATE_SECONDS } from '@/lib/geography/ibge';

export const revalidate = IBGE_REVALIDATE_SECONDS;

export async function GET() {
  try {
    return NextResponse.json(await getBrazilStateBoundaries());
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível carregar a malha oficial do Brasil agora. Tente novamente.' },
      { status: 502 }
    );
  }
}
