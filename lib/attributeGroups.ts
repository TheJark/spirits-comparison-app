// lib/attributeGroups.ts
//
// The ~470 characteristic field_names in yg_field_dictionary aren't
// pre-grouped into topics, so this is the mapping the whole dashboard is
// organized around: one logical group per real-world question a brand
// buyer asks ("do they look the same demographically?", "do they buy
// through the same channels?"). Order here is display order everywhere.
//
// Matching is prefix/keyword based against field_name and evaluated in
// order, first match wins -- so more specific rules (e.g. moderation
// reasons, which also start with pdl_alc_) are listed before the broader
// rules they'd otherwise be swallowed by.

export interface AttributeGroup {
  key: string;
  label: string;
  description: string;
  match: RegExp;
}

export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    key: 'demographics',
    label: 'Demographics',
    description: 'Age, income, education, household, and geography',
    match: /^(pdl_profile_gross_personal|pdl_educ|pdl_employee_status|pdl_hhsize|pdl_household_type|pdl_gender|pdl_race|pdl_urbancity|pdl_inputstate|pdlc_region|pdlc_inputzipdma|pdlc_age|pdlc_omni_generation|pdlc_family_life_cycle|pdl_fam_disposable_income)/,
  },
  {
    key: 'moderation',
    label: 'Non-Alcoholic & Moderation',
    description: 'Non-alc substitution, cutting back, and health-driven abstention',
    match: /^(pdl_non_alc|pdl_nonalc|pdl_HS_drink_reasons|pdl_alc_nondrinkers_reason|pdl_alc_outlook_decrease|pdl_alc_outlook_increase|pdl_att_alc_abstain|pdl_health_actions|pdl_illness_diagnosis|pdlc_drinks_consumption|pdl_groc_items_p30d|pdl_grocery_food|pdl_inmarket_nonalcoholic)/,
  },
  {
    key: 'consumption_style',
    label: 'Alcohol Consumption Style',
    description: 'How often, how much, and how people describe their own drinking',
    match: /^(pdl_alc_freq|pdl_alc_mkt_profile|pdl_alcohol_comp_lyr|pdl_alcohol_self_des|pdl_alcohol_units|pdl_drinkers|pdl_fave_alc_bev|pdl_most_consumed_alc|pdl_att_alc|pdl_alc_sect_outlook)/,
  },
  {
    key: 'occasions',
    label: 'Occasions & Locations',
    description: 'When and where people drink',
    match: /^(pdl_alc_drink_places|pdl_alc_drink_\d|pdl_alcohol_occasion|pdl_mostdrunk_occasion)/,
  },
  {
    key: 'alcohol_types',
    label: 'Type of Alcohol Consumed',
    description: 'Which categories and styles people actually drink',
    match: /^(pdl_alc_type_drinkers|pdl_alc_type_home|pdl_alc_type_out|pdlc_types_alcohol_consumed|pdl_beer_type|pdl_wine_varietals)/,
  },
  {
    key: 'purchase_channels',
    label: 'Purchase Channels & Delivery',
    description: 'Where and how often people buy alcohol',
    match: /^(pdl_alc_purch|pdl_alcohol_purchase_frequency|pdl_alcohol_deliver_freq|pdl_alc_delivery|pdl_liquor_retail|pdl_wine_retail)/,
  },
  {
    key: 'spend',
    label: 'Spend',
    description: 'Monthly alcohol spend at retail and on-premise',
    match: /^(pdl_store_alcohol_monthlyspend|pdl_bar_alcohol_monthlyspend|pdl_alc_spend_out|pdl_nonalc_monthly_spend)/,
  },
  {
    key: 'choice_discovery',
    label: 'Choice Factors & Discovery',
    description: 'What drives brand choice and how people find new products',
    match: /^(pdl_alc_choice_out|pdl_reasons_alc|pdl_beer_choice_factors|pdl_HS_brandchoice_factors|pdl_cp_discover_new_prod)/,
  },
  {
    key: 'life_events',
    label: 'Life Events',
    description: 'Major life changes, planned or recent',
    match: /^(pdl_life_events_next12months|pdl_life_events_past12months|pdl_cp_att_milestoneplan)/,
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle & Interests',
    description: 'Leisure interests and how people spend downtime',
    match: /^(pdl_cp_leisure_interests|pdl_general_interests|pdl_cp_leisure_metime|pdl_ways_to_relax|pdlc_animal_owned|pdl_act_livesports_events|pdl_cd_special_features)/,
  },
  {
    key: 'travel',
    label: 'Travel',
    description: 'Business and leisure travel frequency',
    match: /^(pdl_cp_business_travel_freq|pdl_cp_leisure_travel_freq|pdl_travel_business_leisure|pdl_vac_abroad_12m|pdl_vac_home_12m|pdl_inmarket_travel)/,
  },
  {
    key: 'media_digital',
    label: 'Media & Digital',
    description: 'Internet usage, service providers, and gaming',
    match: /^(pdl_athome_internet_provider|pdl_isp_home|pdl_internet_|pdl_playvgs_internet|pdl_vghours_internet|pdl_browsing_hours|pdlc_internet_use_week_seg)/,
  },
];

export const OTHER_GROUP: AttributeGroup = {
  key: 'other',
  label: 'Other Attitudes',
  description: 'Everything that doesn\'t fit a defined group yet',
  match: /.^/, // never matches directly; used only as the fallback
};

const GROUPS_BY_KEY = new Map(ATTRIBUTE_GROUPS.map((g) => [g.key, g]));

export function groupFor(fieldName: string): AttributeGroup {
  for (const g of ATTRIBUTE_GROUPS) {
    if (g.match.test(fieldName)) return g;
  }
  return OTHER_GROUP;
}

export function groupByKey(key: string): AttributeGroup {
  return GROUPS_BY_KEY.get(key) ?? OTHER_GROUP;
}

export const ALL_GROUPS: AttributeGroup[] = [...ATTRIBUTE_GROUPS, OTHER_GROUP];
