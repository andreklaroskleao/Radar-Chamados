'use client';
import { useEffect, useState } from 'react';
import { brazilianStates } from '@/lib/geography/ibge';

type Municipality = { id: number | string; nome: string };
export function MunicipalityPicker({ stateCode, cityCode, onStateChange, onCityChange }: {
  stateCode: string; cityCode: string; onStateChange: (value: string) => void; onCityChange: (value: string) => void;
}) {
  const [cities, setCities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true); setCities([]); onCityChange('');
    fetch('/api/locations/municipalities?state=' + encodeURIComponent(stateCode))
      .then((response) => response.ok ? response.json() as Promise<Municipality[]> : Promise.reject())
      .then((list) => { if (alive) setCities(list); })
      .catch(() => { if (alive) setCities([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [stateCode]);
  return <div className="field-row">
    <label>Estado<select value={stateCode} onChange={(event) => onStateChange(event.target.value)}>
      {brazilianStates.map((state) => <option key={state.abbreviation} value={state.abbreviation}>{state.name} ({state.abbreviation})</option>)}
    </select></label>
    <label>Município<select required value={cityCode} onChange={(event) => onCityChange(event.target.value)} disabled={loading || cities.length === 0}>
      <option value="">{loading ? 'Carregando municípios…' : 'Selecione o município'}</option>
      {cities.map((city) => <option key={String(city.id)} value={String(city.id)}>{city.nome}</option>)}
    </select><small>Identificador oficial do município pelo IBGE.</small></label>
  </div>;
}

