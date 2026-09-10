// lib/mockProfileData.ts
//
// Deterministic, realistic-looking ProfileRow[] fixture for local
// development, used only when the BigQuery-backed API route can't reach
// `yg_segment_profile` (e.g. no credentials in this environment). Shares
// real field_name / attribute_label / value_label strings pulled from the
// yg_field_dictionary sample, organized under the same groups as
// lib/attributeGroups.ts, so the dashboard looks and behaves the way it
// will against the live table.
//
// The numbers are synthetic: a population base distribution per attribute,
// then either a hand-authored "persona" (for the dozen or so attributes
// where a specific brand story is worth telling -- e.g. Bushmills skewing
// older and whiskey-heavy, Cutwater skewing young and RTD-heavy) or a
// seeded pseudo-random skew (for breadth across the rest). Everything is
// seeded off (segment, field_name), so output is stable across requests.

import { ProfileRow } from './profileTypes';
import { groupByKey } from './attributeGroups';

type SegmentKey =
  | 'portfolio_total' | 'jose_cuervo' | '1800_tequila' | 'bushmills' | 'proper12'
  | 'cutwater' | 'luxardo' | 'appleton' | 'uncle_nearest';

const SEGMENT_META: Record<SegmentKey, { name: string; role: 'baseline' | 'target'; size: number }> = {
  portfolio_total: { name: 'Total Portfolio (Owned Brands)', role: 'baseline', size: 18400 },
  jose_cuervo: { name: 'Jose Cuervo', role: 'baseline', size: 9800 },
  '1800_tequila': { name: '1800 Tequila', role: 'baseline', size: 4200 },
  bushmills: { name: 'Bushmills', role: 'baseline', size: 2600 },
  proper12: { name: 'Proper No. Twelve', role: 'baseline', size: 3100 },
  cutwater: { name: 'Cutwater', role: 'target', size: 3400 },
  luxardo: { name: 'Luxardo', role: 'target', size: 1200 },
  appleton: { name: 'Appleton Estate', role: 'target', size: 1900 },
  uncle_nearest: { name: 'Uncle Nearest', role: 'target', size: 2600 },
};

const SEGMENT_KEYS = Object.keys(SEGMENT_META) as SegmentKey[];
const POPULATION_SIZE = 240000;

// ---------------------------------------------------------------------------
// Small deterministic PRNG so the fixture is stable across requests without
// needing to store generated numbers anywhere.
// ---------------------------------------------------------------------------
function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed;
  return function rand() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skewWeights(base: number[], seed: string, strength: number): number[] {
  const rand = mulberry32(hashStr(seed));
  const skewed = base.map((w) => Math.max(0.3, w * (1 + (rand() - 0.5) * 2 * strength)));
  return normalizeToPct(skewed);
}

function normalizeToPct(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round(((w / sum) * 100) * 10) / 10);
}

// Legacy owned brands + the combined portfolio skew moderately from the
// population; Proper No. Twelve (younger, RTD-adjacent even though it's
// owned) and the four M&A targets skew harder -- that's the point of
// screening them.
const SKEW_STRENGTH: Record<SegmentKey, number> = {
  portfolio_total: 0.2,
  jose_cuervo: 0.2,
  '1800_tequila': 0.22,
  bushmills: 0.22,
  proper12: 0.3,
  cutwater: 0.38,
  luxardo: 0.38,
  appleton: 0.34,
  uncle_nearest: 0.34,
};

interface AttrSpec {
  field_name: string;
  attribute_label: string;
  values: string[];
  base: number[];
  persona?: Partial<Record<SegmentKey, number[]>>;
}

const SPECS: Record<string, AttrSpec[]> = {
  demographics: [
    {
      field_name: 'pdlc_age_break_2',
      attribute_label: 'Age (6-way)',
      values: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
      base: [12, 20, 18, 17, 17, 16],
      persona: {
        jose_cuervo: [10, 19, 19, 18, 18, 16],
        '1800_tequila': [9, 18, 19, 19, 18, 17],
        bushmills: [7, 14, 17, 20, 21, 21],
        proper12: [18, 27, 20, 15, 12, 8],
        portfolio_total: [11, 19, 19, 18, 18, 15],
        cutwater: [22, 30, 19, 13, 10, 6],
        luxardo: [8, 16, 20, 22, 19, 15],
        appleton: [14, 24, 21, 17, 14, 10],
        uncle_nearest: [17, 26, 21, 16, 12, 8],
      },
    },
    {
      field_name: 'pdl_urbancity',
      attribute_label: 'Type of Area Living In',
      values: ['Urban', 'Suburban', 'Rural'],
      base: [31, 47, 22],
      persona: {
        jose_cuervo: [33, 46, 21],
        '1800_tequila': [34, 45, 21],
        bushmills: [26, 45, 29],
        proper12: [42, 41, 17],
        portfolio_total: [32, 46, 22],
        cutwater: [46, 40, 14],
        luxardo: [52, 37, 11],
        appleton: [38, 42, 20],
        uncle_nearest: [40, 41, 19],
      },
    },
    {
      field_name: 'pdl_profile_gross_personal',
      attribute_label: 'Income - gross personal',
      values: ['Under $30,000', '$30,000 - $59,999', '$60,000 - $99,999', '$100,000 - $149,999', '$150,000+'],
      base: [18, 27, 26, 17, 12],
      persona: {
        luxardo: [10, 18, 26, 26, 20],
        proper12: [22, 29, 24, 15, 10],
        uncle_nearest: [16, 24, 26, 20, 14],
      },
    },
    {
      field_name: 'pdl_educ',
      attribute_label: 'Education',
      values: ['High school or less', 'Some college', "Bachelor's degree", 'Graduate degree'],
      base: [30, 27, 27, 16],
    },
    {
      field_name: 'pdlc_region',
      attribute_label: 'Region',
      values: ['Northeast', 'Midwest', 'South', 'West'],
      base: [17, 21, 38, 24],
    },
    {
      field_name: 'pdlc_family_life_cycle',
      attribute_label: 'Family Life Cycle',
      values: ['Young single', 'Young couple, no kids', 'Family with young children', 'Family with older children', 'Older couple, no kids at home', 'Older single'],
      base: [14, 13, 22, 20, 19, 12],
    },
  ],
  consumption_style: [
    {
      field_name: 'pdl_alcohol_self_des',
      attribute_label: 'Alcohol consumption - self description',
      values: ['Special occasion drinker', 'Social drinker', 'Weekend drinker', 'After work drinker', 'Daily drinker', 'Anytime, anywhere drinker'],
      base: [16, 29, 20, 15, 12, 8],
      persona: {
        jose_cuervo: [17, 30, 19, 14, 12, 8],
        '1800_tequila': [17, 29, 20, 14, 12, 8],
        bushmills: [14, 24, 19, 19, 16, 8],
        proper12: [12, 31, 23, 17, 10, 7],
        portfolio_total: [16, 29, 20, 15, 12, 8],
        cutwater: [11, 33, 26, 15, 9, 6],
        luxardo: [15, 27, 18, 20, 13, 7],
        appleton: [14, 30, 22, 15, 11, 8],
        uncle_nearest: [13, 29, 21, 17, 12, 8],
      },
    },
    {
      field_name: 'pdl_most_consumed_alc',
      attribute_label: 'Most consumed alcohol type',
      values: ['Beer', 'Wine', 'Vodka', 'Tequila', 'Whiskey', 'Rum', 'Infused Liquors', 'None of these'],
      base: [24, 16, 14, 10, 13, 9, 4, 10],
      persona: {
        jose_cuervo: [16, 12, 10, 34, 9, 6, 4, 9],
        '1800_tequila': [15, 11, 9, 38, 8, 6, 4, 9],
        bushmills: [18, 13, 9, 4, 38, 5, 4, 9],
        proper12: [17, 11, 10, 6, 32, 6, 5, 13],
        portfolio_total: [18, 12, 10, 20, 20, 6, 4, 10],
        cutwater: [14, 9, 15, 9, 7, 10, 26, 10],
        luxardo: [10, 15, 8, 7, 10, 8, 32, 10],
        appleton: [12, 10, 9, 8, 10, 34, 7, 10],
        uncle_nearest: [13, 10, 9, 7, 36, 8, 7, 10],
      },
    },
    {
      field_name: 'pdl_fave_alc_bev',
      attribute_label: 'Favorite alcoholic beverage',
      values: ['Beer', 'Wine', 'Vodka', 'Bourbon', 'Tequila', 'Rum', 'Gin', 'Cognac/Brandy'],
      base: [22, 17, 13, 12, 11, 9, 8, 8],
    },
    {
      field_name: 'pdl_drinkers',
      attribute_label: 'Alcohol - drinkers',
      values: ['Non-drinker', 'Light drinker', 'Moderate drinker', 'Heavy drinker'],
      base: [14, 34, 38, 14],
    },
    {
      field_name: 'pdl_alcohol_units_2018',
      attribute_label: 'Units of alcohol consumed per week',
      values: ['1-3 units', '4-7 units', '8-14 units', '15+ units', "Not applicable - I don't drink alcohol"],
      base: [28, 26, 20, 12, 14],
    },
  ],
  occasions: [
    {
      field_name: 'pdl_alc_drink_places',
      attribute_label: 'Places people consume alcohol - p3m',
      values: ['Home', 'Bars / Pubs', 'Restaurants', 'Outdoor events', 'Event venues', 'Breweries'],
      base: [34, 20, 18, 12, 9, 7],
      persona: {
        cutwater: [30, 18, 14, 20, 11, 7],
        luxardo: [22, 32, 24, 8, 8, 6],
      },
    },
    {
      field_name: 'pdl_alcohol_occasion_bar_l4w',
      attribute_label: 'Occasions for purchasing alcohol from bar/pub/restaurant - last 4 weeks',
      values: ['Regular night out', 'Special celebration', 'Friend catch-up', 'After work drinks', 'On a date', 'Watching a live event'],
      base: [21, 20, 19, 16, 13, 11],
    },
    {
      field_name: 'pdl_alcohol_occasion_shop_l4w',
      attribute_label: 'Occasions of consuming alcohol purchased from shops - last 4 weeks',
      values: ['House party', 'Staying in with partner/spouse', 'Family get-together', 'Pre-drink', 'Regular/everyday drink', 'Alone'],
      base: [16, 22, 18, 12, 20, 12],
    },
  ],
  alcohol_types: [
    {
      field_name: 'pdlc_types_alcohol_consumed',
      attribute_label: 'Type of alcohol consumed',
      values: ['Domestic beer', 'Craft/microbrew beer', 'Wine', 'Vodka', 'Gin', 'Bourbon', 'Blended scotch', 'Tequila', 'Rum', "Cordials/Liqueurs", 'Cognac/Brandy', 'Hard seltzer'],
      base: [16, 10, 14, 12, 6, 9, 5, 8, 7, 4, 4, 5],
      persona: {
        bushmills: [12, 8, 12, 10, 6, 8, 22, 5, 5, 4, 4, 4],
        uncle_nearest: [11, 9, 11, 10, 5, 26, 6, 6, 6, 4, 3, 3],
        appleton: [12, 9, 11, 10, 5, 8, 5, 6, 24, 4, 3, 3],
        luxardo: [12, 9, 13, 9, 6, 7, 5, 6, 6, 20, 4, 3],
      },
    },
    {
      field_name: 'pdl_alc_type_home',
      attribute_label: 'Type of alcohol consumed - home',
      values: ['Beer', 'Wine', 'Tequila', 'Whiskey', 'Gin', 'Rum', 'Vodka', 'Hard seltzer'],
      base: [23, 18, 10, 13, 7, 9, 13, 7],
    },
  ],
  purchase_channels: [
    {
      field_name: 'pdl_alc_purch_source',
      attribute_label: 'Sources of alcohol purchase',
      values: ['Grocery stores', 'Liquor stores', 'Bars', 'Delivery apps', 'Bodegas/convenience', 'Specialty beer shops'],
      base: [28, 26, 17, 11, 12, 6],
      persona: {
        cutwater: [22, 20, 15, 25, 12, 6],
        luxardo: [18, 34, 16, 14, 10, 8],
      },
    },
    {
      field_name: 'pdl_alcohol_deliver_freq_US',
      attribute_label: 'Frequency of using alcohol delivery services',
      values: ['Often', 'Sometimes', 'Less often', 'Never'],
      base: [8, 19, 29, 44],
      persona: {
        jose_cuervo: [8, 19, 28, 45],
        '1800_tequila': [8, 18, 28, 46],
        bushmills: [6, 15, 27, 52],
        proper12: [12, 23, 29, 36],
        portfolio_total: [8, 18, 28, 46],
        cutwater: [19, 29, 28, 24],
        luxardo: [11, 22, 30, 37],
        appleton: [10, 20, 29, 41],
        uncle_nearest: [13, 24, 29, 34],
      },
    },
    {
      field_name: 'pdl_alcohol_purchase_frequency',
      attribute_label: 'Frequency of - Purchasing alcohol',
      values: ['Weekly or more', 'Monthly', 'Less often', 'Never'],
      base: [24, 33, 29, 14],
    },
  ],
  spend: [
    {
      field_name: 'pdl_store_alcohol_monthlyspend',
      attribute_label: 'Alcohol - store monthly spend',
      values: ['$0-$20', '$20.01-$40', '$40.01-$60', '$60.01-$100', '$100.01+'],
      base: [26, 28, 20, 15, 11],
      persona: {
        luxardo: [14, 22, 24, 21, 19],
      },
    },
    {
      field_name: 'pdl_bar_alcohol_monthlyspend',
      attribute_label: 'Alcohol - bar and restaurant monthly spend',
      values: ['$0-$20', '$20.01-$40', '$40.01-$60', '$60.01-$100', '$100.01+'],
      base: [30, 27, 19, 14, 10],
      persona: {
        luxardo: [16, 24, 24, 20, 16],
      },
    },
  ],
  choice_discovery: [
    {
      field_name: 'pdl_cp_discover_new_prod',
      attribute_label: 'Discover new products',
      values: ['Social media influencers', 'Word of mouth', 'Search engines', 'TV/radio commercials', 'Online marketplaces', 'Product reviews'],
      base: [13, 22, 15, 18, 14, 18],
      persona: {
        jose_cuervo: [12, 22, 14, 20, 13, 19],
        '1800_tequila': [12, 21, 14, 20, 14, 19],
        bushmills: [8, 20, 13, 26, 11, 22],
        proper12: [19, 23, 16, 14, 15, 13],
        portfolio_total: [12, 21, 14, 21, 13, 19],
        cutwater: [27, 20, 17, 10, 17, 9],
        luxardo: [16, 26, 15, 12, 14, 17],
        appleton: [20, 24, 16, 12, 16, 12],
        uncle_nearest: [24, 25, 15, 10, 16, 10],
      },
    },
    {
      field_name: 'pdl_alc_choice_out',
      attribute_label: 'Factors influencing alcohol choice at bars/pubs/restaurants',
      values: ['Price', 'Alcohol brand', 'Variety offered', 'Promotions and offers', 'Atmosphere', 'Personal preference'],
      base: [22, 16, 14, 11, 15, 22],
    },
    {
      field_name: 'pdl_reasons_alc',
      attribute_label: 'Reasons for frequent consumption - alcohol type',
      values: ['Like the taste', 'Affordable', 'Wide range of flavors', 'Alcohol content', 'Easily available', 'Experience after drinking'],
      base: [30, 18, 14, 10, 16, 12],
    },
  ],
  moderation: [
    {
      field_name: 'pdl_nonalc_drink_freq',
      attribute_label: 'Frequency of consumption: Non-alcoholic drink',
      values: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'],
      base: [18, 26, 20, 20, 16],
      persona: {
        cutwater: [22, 28, 19, 17, 14],
      },
    },
    {
      field_name: 'pdl_nonalc_drink_factors',
      attribute_label: "Reasons people consume non-alcoholic drink",
      values: ['Health consciousness', "Don't like hangovers", 'Cheaper option', 'Dietary restrictions', 'Easy availability'],
      base: [30, 22, 14, 17, 17],
    },
    {
      field_name: 'pdl_alc_outlook_decrease',
      attribute_label: 'Reasons for decreased alcohol consumption - p12m',
      values: ['Health concerns', "Don't like taste as much", "Can't afford it", 'Decreased desire', 'Bad experience'],
      base: [34, 12, 20, 20, 14],
    },
  ],
  life_events: [
    {
      field_name: 'pdl_life_events_next12months_2017',
      attribute_label: 'Life events planned in the next 12 months',
      values: ['Move homes', 'Get married', 'Start first job', 'Change jobs', 'Purchase first home', 'Have a child', 'None planned'],
      base: [12, 6, 5, 13, 9, 8, 47],
      persona: {
        cutwater: [17, 9, 9, 18, 13, 11, 23],
        proper12: [16, 8, 8, 17, 12, 10, 29],
      },
    },
  ],
  lifestyle: [
    {
      field_name: 'pdl_cp_leisure_interests',
      attribute_label: 'Leisure interests',
      values: ['Food and cooking', 'Travel and tourism', 'Sports', 'Music', 'Technology', 'Health and fitness', 'Arts and culture'],
      base: [19, 18, 17, 16, 13, 12, 5],
      persona: {
        luxardo: [23, 20, 12, 15, 12, 11, 7],
      },
    },
    {
      field_name: 'pdl_cp_leisure_metime',
      attribute_label: 'Me time activities',
      values: ['Watch TV / movies', 'Cook', 'Read', 'Exercise', 'Listen to music', 'Sleep'],
      base: [26, 15, 14, 16, 17, 12],
    },
  ],
  travel: [
    {
      field_name: 'pdl_cp_business_travel_freq',
      attribute_label: 'Business travel frequency',
      values: ['Weekly', 'Monthly', 'A few times a year', 'Rarely', 'Never'],
      base: [4, 10, 26, 31, 29],
      persona: {
        luxardo: [7, 14, 28, 29, 22],
        appleton: [5, 12, 28, 30, 25],
      },
    },
    {
      field_name: 'pdl_vac_abroad_12m_2020',
      attribute_label: 'Vacations taken - last 12 months - abroad',
      values: ['None', '1 trip', '2 trips', '3+ trips'],
      base: [58, 26, 11, 5],
      persona: {
        appleton: [42, 31, 18, 9],
        luxardo: [46, 29, 16, 9],
      },
    },
  ],
  media_digital: [
    {
      field_name: 'pdl_internet_use_week',
      attribute_label: 'Internet browsing - hours per week',
      values: ['Under 10 hours', '10-20 hours', '21-35 hours', '36-50 hours', '50+ hours'],
      base: [20, 27, 25, 16, 12],
      persona: {
        cutwater: [12, 22, 27, 21, 18],
        uncle_nearest: [14, 24, 26, 20, 16],
      },
    },
    {
      field_name: 'pdl_playvgs_internet',
      attribute_label: 'Play internet video games',
      values: ['Yes, daily', 'Yes, weekly', 'Yes, occasionally', 'No'],
      base: [10, 17, 24, 49],
      persona: {
        cutwater: [17, 22, 25, 36],
      },
    },
  ],
  other: [
    {
      field_name: 'attitudes_agree_dont_drink',
      attribute_label: "I don't drink alcohol (5-point scale)",
      values: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
      base: [10, 8, 12, 30, 40],
    },
    {
      field_name: 'personality_multi_wellness',
      attribute_label: 'I actively try to live a healthier lifestyle this year',
      values: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
      base: [18, 32, 28, 14, 8],
    },
  ],
};

function buildRowsForAttribute(spec: AttrSpec, groupKeyName: string): ProfileRow[] {
  const group = groupByKey(groupKeyName);
  const populationPct = normalizeToPct(spec.base);
  const responseRate = 0.9;
  const popRespondents = Math.round(POPULATION_SIZE * responseRate);
  const popCounts = populationPct.map((p) => Math.round((p / 100) * popRespondents));

  const rows: ProfileRow[] = [];

  for (const segmentKey of SEGMENT_KEYS) {
    const meta = SEGMENT_META[segmentKey];
    const pct = spec.persona?.[segmentKey]
      ? normalizeToPct(spec.persona[segmentKey]!)
      : skewWeights(spec.base, `${segmentKey}::${spec.field_name}`, SKEW_STRENGTH[segmentKey]);

    const segRespondents = Math.round(meta.size * responseRate);

    spec.values.forEach((value_label, i) => {
      const segment_pct = pct[i];
      const segment_count = Math.round((segment_pct / 100) * segRespondents);
      const population_pct = populationPct[i];
      const population_count = popCounts[i];
      const index_vs_population = population_pct > 0
        ? Math.round((segment_pct / population_pct) * 100)
        : 100;

      rows.push({
        segment_key: segmentKey,
        segment_name: meta.name,
        segment_role: meta.role,
        segment_size: meta.size,
        category: '',
        field_name: spec.field_name,
        attribute_label: spec.attribute_label,
        field_value: String(i + 1),
        value_label,
        segment_count,
        segment_field_respondents: segRespondents,
        segment_pct,
        population_count,
        pop_field_respondents: popRespondents,
        population_pct,
        index_vs_population,
      });
    });
  }

  return rows;
}

let cached: ProfileRow[] | null = null;

export function generateMockProfileRows(): ProfileRow[] {
  if (cached) return cached;
  const rows: ProfileRow[] = [];
  for (const [groupKeyName, specs] of Object.entries(SPECS)) {
    for (const spec of specs) {
      rows.push(...buildRowsForAttribute(spec, groupKeyName));
    }
  }
  cached = rows;
  return rows;
}
