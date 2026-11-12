export type Position = [number, number];

export type GeoJSONGeometry =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export type CoverageProperties = {
  id: string;
  name: string;
  abbreviation?: string;
  region?: string;
  stateAbbreviation?: string;
  stateName?: string;
};

export type CoverageFeature = {
  type: 'Feature';
  id: string;
  geometry: GeoJSONGeometry;
  properties: CoverageProperties;
};

export type CoverageFeatureCollection = {
  type: 'FeatureCollection';
  features: CoverageFeature[];
};
