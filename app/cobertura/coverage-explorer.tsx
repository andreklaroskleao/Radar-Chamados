'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { brazilianStates, normalizeSearchText } from '@/lib/geography/ibge';
import type { CoverageFeature, CoverageFeatureCollection, GeoJSONGeometry, Position } from '@/lib/geography/types';

const longitudeCorrection = Math.cos((15 * Math.PI) / 180);

function project([longitude, latitude]: Position): Position {
  return [longitude * longitudeCorrection, -latitude];
}

function polygonsOf(geometry: GeoJSONGeometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function coordinatesOf(geometry: GeoJSONGeometry): Position[] {
  return polygonsOf(geometry).flatMap((polygon) => polygon.flat());
}

function geometryPath(geometry: GeoJSONGeometry): string {
  return polygonsOf(geometry)
    .flatMap((polygon) =>
      polygon.map((ring) => {
        const points = ring.map(project);
        if (!points.length) return '';
        return `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(4)},${y.toFixed(4)}`).join(' ')} Z`;
      })
    )
    .filter(Boolean)
    .join(' ');
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function boundsFor(features: CoverageFeature[]): Bounds | null {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const feature of features) {
    for (const coordinate of coordinatesOf(feature.geometry)) {
      const [x, y] = project(coordinate);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return Number.isFinite(bounds.minX) ? bounds : null;
}

function centerFor(feature: CoverageFeature): Position {
  const points = polygonsOf(feature.geometry)[0]?.[0] ?? [];
  if (!points.length) return [0, 0];
  const center: Position = [
    points.reduce((total, point) => total + point[0], 0) / points.length,
    points.reduce((total, point) => total + point[1], 0) / points.length
  ];
  return project(center);
}

function viewBoxFor(features: CoverageFeature[], focus: CoverageFeature | null, zoom: number): string {
  const bounds = boundsFor(focus ? [focus] : features);
  if (!bounds) return '-75 -40 45 48';

  const width = Math.max(bounds.maxX - bounds.minX, 0.3);
  const height = Math.max(bounds.maxY - bounds.minY, 0.3);
  const isFocused = Boolean(focus);
  const padding = Math.max(Math.max(width, height) * (isFocused ? 0.26 : 0.055), isFocused ? 0.28 : 0.55);
  const scale = Math.pow(1.35, zoom);
  const finalWidth = (width + padding * 2) / scale;
  const finalHeight = (height + padding * 2) / scale;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return `${centerX - finalWidth / 2} ${centerY - finalHeight / 2} ${finalWidth} ${finalHeight}`;
}

function formatResponseError(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  return 'Não foi possível carregar a malha geográfica agora. Tente novamente.';
}

function onActivateByKeyboard(event: KeyboardEvent<SVGPathElement>, activate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

type CoverageExplorerProps = {
  initialStates: CoverageFeatureCollection | null;
  initialError: string | null;
};

export function CoverageExplorer({ initialStates, initialError }: CoverageExplorerProps) {
  const [states, setStates] = useState<CoverageFeatureCollection | null>(initialStates);
  const [selectedState, setSelectedState] = useState<CoverageFeature | null>(null);
  const [municipalities, setMunicipalities] = useState<CoverageFeatureCollection | null>(null);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState(!initialStates && !initialError);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [stateSearch, setStateSearch] = useState('');
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [zoom, setZoom] = useState(0);
  const municipalityRequest = useRef<AbortController | null>(null);

  const loadStates = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/geography/states', { signal });
      const payload = (await response.json()) as CoverageFeatureCollection | { error?: string };
      if (!response.ok || !('features' in payload)) throw new Error(formatResponseError(payload));
      setStates(payload);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os estados.');
    } finally {
      if (!signal?.aborted) setLoadingStates(false);
    }
  }, []);

  function retryStates() {
    setLoadingStates(true);
    setError(null);
    void loadStates();
  }

  useEffect(() => {
    return () => municipalityRequest.current?.abort();
  }, []);

  async function selectState(feature: CoverageFeature) {
    municipalityRequest.current?.abort();
    const controller = new AbortController();
    municipalityRequest.current = controller;
    setSelectedState(feature);
    setMunicipalities(null);
    setSelectedMunicipalityId(null);
    setMunicipalitySearch('');
    setStateSearch('');
    setZoom(0);
    setLoadingMunicipalities(true);
    setError(null);

    try {
      const response = await fetch(`/api/geography/municipalities?state=${feature.properties.abbreviation}`, {
        signal: controller.signal
      });
      const payload = (await response.json()) as CoverageFeatureCollection | { error?: string };
      if (!response.ok || !('features' in payload)) throw new Error(formatResponseError(payload));
      setMunicipalities(payload);
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os municípios.');
    } finally {
      if (!controller.signal.aborted) setLoadingMunicipalities(false);
    }
  }

  function returnToBrazil() {
    municipalityRequest.current?.abort();
    setSelectedMunicipalityId(null);
    setSelectedState(null);
    setMunicipalities(null);
    setMunicipalitySearch('');
    setStateSearch('');
    setLoadingMunicipalities(false);
    setZoom(0);
    setError(null);
  }

  const selectedMunicipality = useMemo(
    () => municipalities?.features.find((feature) => feature.id === selectedMunicipalityId) ?? null,
    [municipalities, selectedMunicipalityId]
  );

  const mapFeatures = useMemo(() => {
    if (!selectedState) return states?.features ?? [];
    return municipalities?.features ?? [selectedState];
  }, [municipalities, selectedState, states]);

  const viewBox = useMemo(
    () => viewBoxFor(mapFeatures, selectedMunicipality, zoom),
    [mapFeatures, selectedMunicipality, zoom]
  );

  const stateLabels = useMemo(() => {
    const exact = normalizeSearchText(stateSearch);
    return (states?.features ?? []).find((feature) =>
      normalizeSearchText(feature.properties.name) === exact ||
      normalizeSearchText(feature.properties.abbreviation ?? '') === exact
    ) ?? null;
  }, [states, stateSearch]);

  const municipalityMatch = useMemo(() => {
    const exact = normalizeSearchText(municipalitySearch);
    if (!exact) return null;
    return municipalities?.features.find((feature) => normalizeSearchText(feature.properties.name) === exact) ?? null;
  }, [municipalities, municipalitySearch]);

  const isNationalLevel = !selectedState;
  const renderedFeatures = useMemo(() => mapFeatures.map((feature) => ({
    feature,
    path: geometryPath(feature.geometry),
    center: isNationalLevel && feature.properties.abbreviation ? centerFor(feature) : null
  })), [isNationalLevel, mapFeatures]);
  const isLoading = loadingStates || loadingMunicipalities;
  const activeLabel = selectedMunicipality
    ? `${selectedMunicipality.properties.name}, ${selectedState?.properties.abbreviation}`
    : selectedState
      ? selectedState.properties.name
      : 'Brasil';

  return (
    <main className="coverage-page">
      <div className="coverage-container">
        <div className="coverage-topbar">
          <Link href="/" className="coverage-back-link" aria-label="Voltar ao início do Radar Comercial Regional">
            <span aria-hidden="true">←</span> Radar Comercial Regional
          </Link>
          {process.env.NODE_ENV === 'development' && <Link className="coverage-setup-link" href="/dev/setup">Configuração técnica</Link>}
        </div>

        <header className="coverage-heading">
          <div>
            <p className="eyebrow">INTELIGÊNCIA TERRITORIAL</p>
            <h1>Mapa nacional de cobertura</h1>
            <p>Explore a malha do Brasil por estado e município. Os indicadores de pesquisa serão exibidos quando os dados agregados forem conectados.</p>
          </div>
          <div className="coverage-heading-badge">
            <span className="coverage-live-dot" aria-hidden="true" />
            <span>Limites geográficos oficiais</span>
          </div>
        </header>

        <nav className="coverage-breadcrumbs" aria-label="Nível geográfico atual">
          <button type="button" onClick={returnToBrazil} aria-current={isNationalLevel ? 'page' : undefined}>Brasil</button>
          {selectedState && <span aria-hidden="true">/</span>}
          {selectedState && <button type="button" onClick={() => { setSelectedMunicipalityId(null); setZoom(0); }} aria-current={!selectedMunicipality ? 'page' : undefined}>{selectedState.properties.name}</button>}
          {selectedMunicipality && <><span aria-hidden="true">/</span><span aria-current="page">{selectedMunicipality.properties.name}</span></>}
        </nav>

        <section className="coverage-explorer-grid" aria-label="Mapa e informações da cobertura">
          <div className="coverage-map-card">
            <div className="coverage-map-toolbar">
              <div>
                <span className="coverage-map-kicker">VISÃO GEOGRÁFICA</span>
                <h2>{activeLabel}</h2>
              </div>
              <div className="coverage-map-tools">
                <button type="button" onClick={() => setZoom((value) => Math.min(value + 1, 4))} aria-label="Aproximar mapa" title="Aproximar">+</button>
                <button type="button" onClick={() => setZoom((value) => Math.max(value - 1, 0))} aria-label="Afastar mapa" title="Afastar">−</button>
                <button type="button" onClick={() => { setZoom(0); setSelectedMunicipalityId(null); }} aria-label="Enquadrar área selecionada" title="Enquadrar">⌖</button>
              </div>
            </div>

            <div className="coverage-map-stage">
              {mapFeatures.length > 0 ? (
                <svg className="coverage-map-svg" viewBox={viewBox} role="group" aria-label={isNationalLevel ? 'Mapa interativo dos estados brasileiros' : `Mapa dos municípios de ${selectedState?.properties.name}`}>
                  <g className="coverage-map-shapes">
                    {renderedFeatures.map(({ feature, path, center }) => {
                      const isSelected = feature.id === selectedMunicipalityId ||
                        (municipalities === null && selectedState !== null && feature.id === selectedState.id);
                      const title = isNationalLevel
                        ? `${feature.properties.name} (${feature.properties.abbreviation}) — dados de pesquisa não conectados`
                        : `${feature.properties.name}, ${feature.properties.stateAbbreviation} — cobertura de pesquisa indisponível`;
                      const activate = () => {
                        if (isNationalLevel) void selectState(feature);
                        else setSelectedMunicipalityId(feature.id);
                      };

                      return (
                        <g key={feature.id}>
                          <title>{title}</title>
                          <path
                            d={path}
                            className={`coverage-map-feature${isSelected ? ' is-selected' : ''}`}
                            fillRule="evenodd"
                            role="button"
                            tabIndex={0}
                            aria-label={title}
                            aria-pressed={isSelected}
                            onClick={activate}
                            onKeyDown={(event) => onActivateByKeyboard(event, activate)}
                          />
                          {center && feature.properties.abbreviation && <text className="coverage-map-label" x={center[0]} y={center[1]} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{feature.properties.abbreviation}</text>}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              ) : (
                <div className="coverage-map-empty" role="status">
                  {isLoading ? <span className="coverage-spinner" aria-hidden="true" /> : <span className="coverage-map-empty-icon" aria-hidden="true">◎</span>}
                  <strong>{isLoading ? 'Carregando malha geográfica' : 'Mapa indisponível'}</strong>
                  <span>{error ?? 'Tente carregar novamente.'}</span>
                  {!isLoading && <button type="button" onClick={retryStates}>Tentar novamente</button>}
                </div>
              )}
              {loadingMunicipalities && <div className="coverage-map-loading" role="status"><span className="coverage-spinner" aria-hidden="true" /> Carregando municípios de {selectedState?.properties.name}…</div>}
              {error && mapFeatures.length > 0 && <div className="coverage-map-error" role="alert">{error}<button type="button" onClick={() => selectedState ? void selectState(selectedState) : retryStates()}>Tentar novamente</button></div>}
            </div>

            <div className="coverage-map-footer">
              <div className="coverage-legend" aria-label="Legenda do mapa">
                <span><i className="coverage-legend-swatch" aria-hidden="true" /> Malha geográfica</span>
                <span><i className="coverage-legend-swatch is-active" aria-hidden="true" /> Localidade selecionada</span>
                <span className="coverage-legend-note">Pesquisas: sem dados conectados</span>
              </div>
              <p>Fonte: IBGE · API de Malhas Geográficas v3</p>
            </div>
          </div>

          <aside className="coverage-side-panel" aria-label="Filtros e detalhes">
            <div className="coverage-panel-heading">
              <div className="coverage-panel-icon" aria-hidden="true">⌖</div>
              <div><span className="coverage-panel-kicker">NAVEGAR</span><h2>Encontre uma localidade</h2></div>
            </div>

            <label className="coverage-search-label" htmlFor="state-search">Estado</label>
            <input
              id="state-search"
              className="coverage-search-input"
              type="search"
              list="brazilian-state-options"
              placeholder="Busque por nome ou sigla"
              value={stateSearch}
              onChange={(event) => {
                setStateSearch(event.target.value);
                const match = states?.features.find((feature) =>
                  normalizeSearchText(feature.properties.name) === normalizeSearchText(event.target.value) ||
                  normalizeSearchText(feature.properties.abbreviation ?? '') === normalizeSearchText(event.target.value)
                );
                if (match) void selectState(match);
              }}
              disabled={loadingStates || !states}
              aria-describedby="state-search-hint"
            />
            <datalist id="brazilian-state-options">
              {brazilianStates.flatMap((state) => [
                <option key={`${state.id}-name`} value={state.name} label={state.abbreviation} />,
                <option key={`${state.id}-uf`} value={state.abbreviation} label={state.name} />
              ])}
            </datalist>
            <p id="state-search-hint" className="coverage-field-hint">Ou selecione diretamente no mapa.</p>

            <label className="coverage-search-label" htmlFor="municipality-search">Município</label>
            <input
              id="municipality-search"
              className="coverage-search-input"
              type="search"
              list="municipality-options"
              placeholder={selectedState ? 'Busque no estado selecionado' : 'Selecione um estado primeiro'}
              value={municipalitySearch}
              onChange={(event) => {
                setMunicipalitySearch(event.target.value);
                const match = municipalities?.features.find((feature) => normalizeSearchText(feature.properties.name) === normalizeSearchText(event.target.value));
                if (match) setSelectedMunicipalityId(match.id);
              }}
              disabled={!selectedState || loadingMunicipalities || !municipalities}
              aria-describedby="municipality-search-hint"
            />
            <datalist id="municipality-options">
              {municipalities?.features.map((feature) => <option key={feature.id} value={feature.properties.name} />)}
            </datalist>
            <p id="municipality-search-hint" className="coverage-field-hint">
              {selectedState ? 'A lista é carregada somente após escolher o estado.' : 'A malha municipal é carregada sob demanda.'}
            </p>

            <div className="coverage-panel-divider" />

            <div className="coverage-panel-heading coverage-detail-heading">
              <div className="coverage-panel-icon is-soft" aria-hidden="true">⌁</div>
              <div><span className="coverage-panel-kicker">DETALHES DA ÁREA</span><h2>{activeLabel}</h2></div>
            </div>

            <div className="coverage-data-status" role="status">
              <span className="coverage-status-mark" aria-hidden="true">i</span>
              <div>
                <strong>Dados de pesquisas indisponíveis</strong>
                <p>O Firestore ainda não tem integração de cobertura neste projeto. Nenhum total foi estimado ou inventado.</p>
              </div>
            </div>

            <dl className="coverage-metrics">
              {(selectedMunicipality ? [
                'Pesquisas realizadas',
                'Respostas registradas',
                'Pesquisas em andamento',
                'Pesquisas concluídas',
                'Última atualização'
              ] : selectedState ? [
                'Municípios com pesquisas',
                'Pesquisas disponíveis',
                'Respostas registradas',
                'Pesquisas em andamento'
              ] : [
                'Estados com pesquisas',
                'Municípios com pesquisas',
                'Pesquisas disponíveis',
                'Respostas registradas'
              ]).map((label) => (
                <div className="coverage-metric" key={label}>
                  <dt>{label}</dt>
                  <dd>Indisponível</dd>
                </div>
              ))}
            </dl>

            <div className="coverage-geo-summary">
              <span className="coverage-summary-icon" aria-hidden="true">▦</span>
              <div>
                <strong>{selectedState ? municipalities?.features.length ?? '—' : states?.features.length ?? '—'}</strong>
                <span>{selectedState ? 'municípios na malha deste estado' : 'unidades federativas na malha'}</span>
              </div>
            </div>

            {selectedMunicipality && <p className="coverage-no-results">A geometria e o nome do município foram carregados do IBGE. Categorias, período e resultados aguardam conexão segura com dados agregados.</p>}

            <div className="coverage-panel-actions">
              {selectedState && <button className="coverage-reset-button" type="button" onClick={returnToBrazil}>← Voltar ao mapa do Brasil</button>}
              {process.env.NODE_ENV === 'development' && <Link href="/dev/setup">Revisar diagnóstico Firebase →</Link>}
            </div>
          </aside>
        </section>

        <footer className="coverage-page-footer">
          <span>Malhas geográficas simplificadas do IBGE. A representação de limites não indica cobertura de pesquisa.</span>
          <span>{municipalityMatch && municipalitySearch ? `Correspondência: ${municipalityMatch.properties.name}` : stateLabels && stateSearch ? `Estado: ${stateLabels.properties.abbreviation}` : 'Selecione um estado para explorar seus municípios.'}</span>
        </footer>
        <p className="coverage-live-announcer" aria-live="polite" aria-atomic="true">
          {isLoading ? 'Carregando dados geográficos.' : selectedMunicipality ? `Município selecionado: ${activeLabel}.` : selectedState ? `Estado selecionado: ${activeLabel}.` : 'Visão nacional do Brasil.'}
        </p>
      </div>
    </main>
  );
}
