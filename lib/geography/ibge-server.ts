import type { CoverageFeature, CoverageFeatureCollection, GeoJSONGeometry } from './types';
import { brazilianStates, IBGE_API_BASE, IBGE_REVALIDATE_SECONDS } from './ibge';

type IbgeFeature = {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties?: { codarea?: string };
};

type IbgeFeatureCollection = { type: 'FeatureCollection'; features: IbgeFeature[] };

export async function getBrazilStateBoundaries(): Promise<CoverageFeatureCollection> {
  const url = new URL(`${IBGE_API_BASE}/v3/malhas/paises/BR`);
  url.searchParams.set('intrarregiao', 'UF');
  url.searchParams.set('formato', 'application/vnd.geo+json');
  url.searchParams.set('qualidade', 'minima');

  const response = await fetch(url, { next: { revalidate: IBGE_REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`IBGE respondeu HTTP ${response.status}`);

  const source = (await response.json()) as IbgeFeatureCollection;
  const states = new Map<string, (typeof brazilianStates)[number]>(brazilianStates.map((state) => [state.id, state]));
  const features: CoverageFeature[] = source.features.flatMap((feature) => {
    const state = states.get(String(feature.properties?.codarea ?? ''));
    if (!state || !feature.geometry) return [];

    return [{
      type: 'Feature',
      id: state.abbreviation,
      geometry: feature.geometry,
      properties: {
        id: state.id,
        name: state.name,
        abbreviation: state.abbreviation,
        region: state.region
      }
    }];
  });

  if (features.length !== brazilianStates.length) {
    throw new Error('A malha recebida não contém todas as unidades federativas esperadas.');
  }

  return { type: 'FeatureCollection', features };
}
