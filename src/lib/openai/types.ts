export interface SubjectMetrics {
  list_price: number;
  effective_price: number;
  heated_sqft: number;
  price_per_sqft: number;
}

export interface MarketBaselines {
  filtered_comp_count: number;
  comp_price_per_sqft: {
    p25: number;
    median: number;
    p75: number;
  };
  comp_list_price: {
    p25: number;
    median: number;
    p75: number;
  };
}

export interface PriceGap {
  vs_median_ppsf: number;
  vs_median_list: number;
}

export interface KeyComparable {
  address: string;
  status: string;
  ppsf: number;
  distance_miles: number;
  notes: string;
}

export interface PriceEvaluation {
  classification: 'below_market' | 'market_fair' | 'above_market' | 'insufficient_data';
  subject_metrics: SubjectMetrics;
  market_baselines: MarketBaselines;
  price_gap: PriceGap;
  suggested_price_range: {
    low: number;
    high: number;
  };
  key_comparables: KeyComparable[];
  assumptions: string[];
  confidence: number;
  evidence: string[];
}

export interface SubjectProperty {
  address: string;
  city: string;
  county?: string;
  zip: string;
  community: string;
  builder: string;
  plan?: string;
  status: string;
  list_price: number;
  beds: number;
  baths: number;
  half_baths?: number;
  heated_sqft: number;
  garage_spaces?: number;
  lot_size?: number;
  stories?: number;
  year_built?: number;
  primary_suite_location?: string;
  elevation?: string;
  included_features?: string;
  upgrades_value_estimate?: number;
  energy_features?: string;
  community_amenities?: string;
  hoa?: number;
  special_assessments?: number;
  property_tax_rate?: number;
  coordinates?: [number, number];
  school_district?: string;
  commute_pins?: Array<{
    location: string;
    distance_miles: number;
  }>;
  incentives?: {
    lender_credits?: number;
    closing_cost_help?: number;
    rate_buydown?: number;
    design_studio_credits?: number;
    price_reductions_history?: Array<{
      date: string;
      amount: number;
    }>;
  };
}

export interface ComparableProperty extends SubjectProperty {
  days_on_market?: number;
  pending_flag?: boolean;
  close_price?: number;
  distance_miles?: number;
}

export interface MarketAggregates {
  ppsf_by_sqft_band?: {
    [band: string]: {
      p25: number;
      median: number;
      p75: number;
    };
  };
  ppsf_by_beds?: {
    [beds: string]: {
      p25: number;
      median: number;
      p75: number;
    };
  };
  coefficients?: {
    intercept: number;
    heated_sqft: number;
    bed_bonus: number;
    bath_bonus: number;
    garage_bonus: number;
    new_build_premium: number;
  };
}

export interface EvaluationRequest {
  subject: SubjectProperty;
  comps: ComparableProperty[];
  aggregates?: MarketAggregates;
}