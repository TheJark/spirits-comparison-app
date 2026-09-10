// lib/profileTypes.ts
//
// Shared shape for one row of `liveramp_yougov_202405.yg_segment_profile`
// (see the SQL that builds it). Both the real BigQuery-backed API route and
// the local mock-data generator produce arrays of this type, so the
// dashboard components never need to know which one they're looking at.

export interface ProfileRow {
  segment_key: string;
  segment_name: string;
  segment_role: 'baseline' | 'target';
  segment_size: number;
  category: string;
  field_name: string;
  attribute_label: string;
  field_value: string;
  value_label: string;
  segment_count: number;
  segment_field_respondents: number;
  segment_pct: number;
  population_count: number;
  pop_field_respondents: number;
  population_pct: number;
  index_vs_population: number;
}

export const MIN_SAMPLE = 30;

export const BASELINE_SEGMENT_KEYS = [
  'portfolio_total',
  'jose_cuervo',
  '1800_tequila',
  'bushmills',
  'proper12',
] as const;

export const TARGET_SEGMENT_KEYS = [
  'cutwater',
  'luxardo',
  'appleton',
  'uncle_nearest',
] as const;
