import { NextResponse } from 'next/server';
import { getBrazilStateBoundaries } from '@/lib/geography/ibge-server';

// Next segment config must be a literal so the build analyzer can read it.
export const revalidate = 86400;

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
