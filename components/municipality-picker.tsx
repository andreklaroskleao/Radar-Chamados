'use client';
import { useCallback, useEffect, useState } from 'react';
import { brazilianStates } from '@/lib/geography/ibge';

type Municipality = { id: number | string; nome: string };
const municipalityCache = new Map<string, Municipality[]>();

export function MunicipalityPicker({ stateCode, cityCode, onStateChange, onCityChange }: {
  stateCode: string; cityCode: string; onStateChange: (value: string) => void; onCityChange: (value: string) => void;
}) {
  const [result, setResult] = useState<{ stateCode: string; cities: Municipality[]; error: string }>(
    { stateCode: '', cities: [], error: '' }
  );
  const [retry, setRetry] = useState(0);
  const cachedCities = municipalityCache.get(stateCode) || [];
  const cities = result.stateCode === stateCode ? result.cities : cachedCities;
  const loading = result.stateCode !== stateCode && cities.length === 0;

  const loadMunicipalities = useCallback(async (signal: AbortSignal) => {
    const state = brazilianStates.find((item) => item.abbreviation === stateCode);
    if (!state) {
      setResult({ stateCode, cities: [], error: 'Selecione uma unidade federativa válida.' });
      return;
    }

    const cached = municipalityCache.get(stateCode);
    if (cached?.length) {
      setResult({ stateCode, cities: cached, error: '' });
      return;
    }

    const urls = [
      '/api/locations/municipalities?state=' + encodeURIComponent(stateCode),
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.id}/municipios?orderBy=nome`
    ];
    let failure: unknown;

    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as Municipality[];
        if (!Array.isArray(payload) || payload.length === 0 || payload.some((city) => !city.id || !city.nome)) {
          throw new Error('Resposta de municípios inválida');
        }
        municipalityCache.set(stateCode, payload);
        setResult({ stateCode, cities: payload, error: '' });
        return;
      } catch (error) {
        if (signal.aborted) return;
        failure = error;
      }
    }

    setResult({
      stateCode,
      cities: [],
      error: failure instanceof TypeError
        ? 'Não foi possível conectar ao serviço de municípios. Confira a conexão e tente novamente.'
        : 'O serviço de municípios não respondeu. Tente carregar novamente.'
    });
  }, [stateCode]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadMunicipalities(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadMunicipalities, retry]);

  const error = result.stateCode === stateCode ? result.error : '';
  return <div className="field-row">
    <label>Estado<select value={stateCode} onChange={(event) => onStateChange(event.target.value)}>
      {brazilianStates.map((state) => <option key={state.abbreviation} value={state.abbreviation}>{state.name} ({state.abbreviation})</option>)}
    </select></label>
    <label>Município<select required value={cityCode} onChange={(event) => onCityChange(event.target.value)} disabled={loading || cities.length === 0}>
      <option value="">{loading ? 'Carregando municípios…' : 'Selecione o município'}</option>
      {cities.map((city) => <option key={String(city.id)} value={String(city.id)}>{city.nome}</option>)}
    </select><small>Identificador oficial do município pelo IBGE.</small></label>
    {error && <p className="form-message" role="status">{error} <button type="button" className="text-button" onClick={() => setRetry((current) => current + 1)}>Tentar novamente</button></p>}
  </div>;
}

