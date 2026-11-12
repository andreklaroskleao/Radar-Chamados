import { NextResponse } from 'next/server';
import type { CoverageFeature, CoverageFeatureCollection, GeoJSONGeometry } from '@/lib/geography/types';
import { brazilianStates, IBGE_API_BASE, IBGE_REVALIDATE_SECONDS } from '@/lib/geography/ibge';

export const revalidate = IBGE_REVALIDATE_SECONDS;

type IbgeFeature = {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties?: { codarea?: string };
};

type IbgeFeatureCollection = { type: 'FeatureCollection'; features: IbgeFeature[] };
type IbgeMunicipality = { id: number | string; nome: string };

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const abbreviation = searchParams.get('state')?.trim().toUpperCase();
  const state = brazilianStates.find((item) => item.abbreviation === abbreviation);

  if (!state) {
    return NextResponse.json({ error: 'Informe uma sigla de estado brasileiro válida.' }, { status: 400 });
  }

  try {
    const shapeUrl = new URL(`${IBGE_API_BASE}/v3/malhas/estados/${state.abbreviation}`);
    shapeUrl.searchParams.set('intrarregiao', 'municipio');
    shapeUrl.searchParams.set('formato', 'application/vnd.geo+json');
    shapeUrl.searchParams.set('qualidade', 'minima');

    const namesUrl = new URL(`${IBGE_API_BASE}/v1/localidades/estados/${state.id}/municipios`);
    namesUrl.searchParams.set('orderBy', 'nome');

    const [shapesResponse, namesResponse] = await Promise.all([
      fetch(shapeUrl, { next: { revalidate: IBGE_REVALIDATE_SECONDS } }),
      fetch(namesUrl, { next: { revalidate: IBGE_REVALIDATE_SECONDS } })
    ]);

    if (!shapesResponse.ok || !namesResponse.ok) throw new Error('IBGE não retornou as malhas municipais.');

    const [shapes, municipalities] = (await Promise.all([
      shapesResponse.json(),
      namesResponse.json()
    ])) as [IbgeFeatureCollection, IbgeMunicipality[]];

    const names = new Map(municipalities.map((municipality) => [String(municipality.id), municipality.nome]));
    const features: CoverageFeature[] = shapes.features.flatMap((feature) => {
      const id = String(feature.properties?.codarea ?? '');
      const name = names.get(id);
      if (!id || !name || !feature.geometry) return [];

      return [{
        type: 'Feature',
        id,
        geometry: feature.geometry,
        properties: {
          id,
          name,
          stateAbbreviation: state.abbreviation,
          stateName: state.name
        }
      }];
    });

    if (!features.length) throw new Error('A malha municipal veio vazia.');

    return NextResponse.json({ type: 'FeatureCollection', features } satisfies CoverageFeatureCollection);
  } catch {
    return NextResponse.json(
      { error: `Não foi possível carregar a malha municipal de ${state.name} agora. Tente novamente.` },
      { status: 502 }
    );
  }
}
