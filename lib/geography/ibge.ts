export const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api';
export const IBGE_REVALIDATE_SECONDS = 60 * 60 * 24;

export const brazilianStates = [
  { id: '11', abbreviation: 'RO', name: 'Rondônia', region: 'Norte' },
  { id: '12', abbreviation: 'AC', name: 'Acre', region: 'Norte' },
  { id: '13', abbreviation: 'AM', name: 'Amazonas', region: 'Norte' },
  { id: '14', abbreviation: 'RR', name: 'Roraima', region: 'Norte' },
  { id: '15', abbreviation: 'PA', name: 'Pará', region: 'Norte' },
  { id: '16', abbreviation: 'AP', name: 'Amapá', region: 'Norte' },
  { id: '17', abbreviation: 'TO', name: 'Tocantins', region: 'Norte' },
  { id: '21', abbreviation: 'MA', name: 'Maranhão', region: 'Nordeste' },
  { id: '22', abbreviation: 'PI', name: 'Piauí', region: 'Nordeste' },
  { id: '23', abbreviation: 'CE', name: 'Ceará', region: 'Nordeste' },
  { id: '24', abbreviation: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste' },
  { id: '25', abbreviation: 'PB', name: 'Paraíba', region: 'Nordeste' },
  { id: '26', abbreviation: 'PE', name: 'Pernambuco', region: 'Nordeste' },
  { id: '27', abbreviation: 'AL', name: 'Alagoas', region: 'Nordeste' },
  { id: '28', abbreviation: 'SE', name: 'Sergipe', region: 'Nordeste' },
  { id: '29', abbreviation: 'BA', name: 'Bahia', region: 'Nordeste' },
  { id: '31', abbreviation: 'MG', name: 'Minas Gerais', region: 'Sudeste' },
  { id: '32', abbreviation: 'ES', name: 'Espírito Santo', region: 'Sudeste' },
  { id: '33', abbreviation: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
  { id: '35', abbreviation: 'SP', name: 'São Paulo', region: 'Sudeste' },
  { id: '41', abbreviation: 'PR', name: 'Paraná', region: 'Sul' },
  { id: '42', abbreviation: 'SC', name: 'Santa Catarina', region: 'Sul' },
  { id: '43', abbreviation: 'RS', name: 'Rio Grande do Sul', region: 'Sul' },
  { id: '50', abbreviation: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  { id: '51', abbreviation: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste' },
  { id: '52', abbreviation: 'GO', name: 'Goiás', region: 'Centro-Oeste' },
  { id: '53', abbreviation: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste' }
] as const;

export type BrazilianState = (typeof brazilianStates)[number];

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

