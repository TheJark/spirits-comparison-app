// app/api/audience-profile/route.ts
//
// Runs the pre-saved segment profile query (see 01_segment_comparison_profile.sql)
// against BigQuery and returns it as JSON for the dashboard to consume.
//
// SETUP:
//   npm install @google-cloud/bigquery
//   Point GOOGLE_APPLICATION_CREDENTIALS at a service account with
//   bigquery.jobUser + bigquery.dataViewer on liveramp_yougov_202405,
//   or configure Application Default Credentials the way the rest of your
//   Converged stack already does.
//
// For a dataset this size, materialize 01_segment_comparison_profile.sql as
// a real table/view once (see the comment in 02_top_differentiators.sql) and
// query that table here rather than re-running the full EAV scan per
// request -- it's the difference between a sub-second dashboard and a
// multi-second one on every filter change.

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { ProfileRow } from '@/lib/profileTypes';
import { generateMockProfileRows } from '@/lib/mockProfileData';

export const dynamic = 'force-dynamic';

const bigquery = new BigQuery();

export type { ProfileRow };

const PROFILE_QUERY = `
  SELECT
    segment_key, segment_name, segment_role, segment_size, category,
    field_name, attribute_label, field_value, value_label,
    segment_count, segment_field_respondents, segment_pct,
    population_count, pop_field_respondents, population_pct,
    index_vs_population
  FROM \`liveramp_yougov_202405.yg_segment_profile\`
`;

export async function GET(_req: NextRequest) {
  try {
    const [rows] = await bigquery.query({ query: PROFILE_QUERY });
    return NextResponse.json({ rows: rows as ProfileRow[], source: 'bigquery' });
  } catch (err) {
    // Outside production (no BigQuery credentials in this environment,
    // running `next dev` locally, etc.) fall back to a realistic mock
    // fixture so the dashboard is still buildable/previewable. Production
    // keeps failing loudly -- a broken BigQuery connection there is a real
    // incident, not something to paper over with fake data.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('audience-profile: BigQuery query failed, serving mock data instead', err);
      return NextResponse.json({ rows: generateMockProfileRows(), source: 'mock' });
    }
    console.error('audience-profile query failed', err);
    return NextResponse.json(
      { error: 'Failed to load audience profile data' },
      { status: 500 }
    );
  }
}
