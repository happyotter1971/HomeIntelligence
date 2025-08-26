// Enhanced pricing evaluation types for deterministic analysis

export interface RecordRaw {
  id: string;
  price: number;
  sqft: number;
  beds?: number;
  baths_full?: number;
  baths_half?: number;
  garage?: number;
  lot_sqft?: number;
  year_built?: number;
  status: string;
  address?: string;
  subdivision?: string;
  school_zone?: string;
  mls_id?: string;
  plan_name?: string;
  lat?: number;
  lng?: number;
  list_date?: Date;
  sold_date?: Date;
  property_type?: string;
  builder?: string;
  community?: string;
}

export interface RecordClean {
  id: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number; // baths_full + 0.5 * baths_half
  garage: number;
  lot_sqft?: number;
  year_built: number;
  is_new: boolean;
  price_ppsf: number;
  status: ListingStatus;
  address?: string;
  subdivision: string;
  school_zone: string;
  dedupe_id: string;
  lat?: number;
  lng?: number;
  list_date: Date;
  sold_date?: Date;
  days_on_market: number;
  month_index: number; // yyyy*12 + mm
  property_type: string;
}

export interface Subject {
  id: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  garage: number;
  lot_sqft?: number;
  year_built: number;
  is_new: boolean;
  subdivision: string;
  school_zone: string;
  lat?: number;
  lng?: number;
  month_index: number;
  property_type: string;
}

export type ListingStatus = 'sold' | 'pending' | 'active' | 'spec' | 'quick-move-in' | 'under-construction' | 'to-be-built';

export interface HedonicModel {
  coef: Record<string, number>;
  intercept: number;
  rmseLog: number;
  alpha: number; // Selected ridge parameter
  features: string[]; // Feature names in order
}

export interface CompAdjusted {
  id: string;
  original_price: number;
  price_adj: number;
  ppsf_adj: number;
  total_adjustment_pct: number;
  time_adj_pct: number;
  other_adj_pct: number;
  distance_miles: number;
  comp_record: RecordClean;
}

export interface ValueResult {
  status: 'success' | 'insufficient_data' | 'error';
  classification: 'Below' | 'Market Fair' | 'Above' | 'Insufficient Data';
  confidence: number; // 0-100
  median_ppsf: number;
  suggested_price_range: {
    low: number;
    high: number;
  };
  price_gap: {
    delta_ppsf: number;
    total_delta: number; // delta_ppsf * subject.sqft
  };
  explain: {
    top3: Array<{
      id: string;
      raw_ppsf: number;
      adjusted_ppsf: number;
      distance_miles: number;
    }>;
    band: {
      median: number;
      band_pct: number;
      fair_range: {
        low: number;
        high: number;
      };
      subject_ppsf: number;
    };
    recon: {
      p_med: number;
      p_hed: number;
      diff_pct: number;
      flag: boolean;
    };
  };
  model_stats?: {
    comp_count: number;
    adjusted_comps: CompAdjusted[];
    hedonic_model?: HedonicModel;
    penalties: number;
  };
}

// Feature engineering types
export interface FeatureVector {
  log_sqft: number;
  beds: number;
  baths: number;
  garage: number;
  is_new: number; // 0 or 1
  year: number;
  log_lot?: number;
  primary_main?: number; // 0 if absent
  month: number;
  sz_0_2k: number; // Size bucket indicators
  sz_2_3k: number;
  sz_3k_plus: number;
  // Optional subdivision one-hots if safe
  [subdivision_key: `sub_${string}`]: number;
}

export interface TrainingData {
  records: RecordClean[];
  features: FeatureVector[];
  targets: number[]; // log(price)
}

// Statistical utilities
export interface RobustStats {
  median: number;
  p25: number;
  p75: number;
  mad: number; // Median Absolute Deviation
  iqr: number;
  mean: number;
  std: number;
  cv: number; // Coefficient of variation
}

// Comparable selection criteria
export interface CompSelectionCriteria {
  strict: {
    same_subdivision: boolean;
    same_school_zone: boolean;
    radius_miles: number;
    days_lookback: number;
    beds_tolerance: number;
    sqft_tolerance_pct: number;
    year_tolerance: number;
    property_type_match: boolean;
  };
  relaxed: {
    radius_miles: number;
    days_lookback: number;
    beds_tolerance: number;
    sqft_tolerance_pct: number;
    year_tolerance: number;
  };
}

// Quality control penalties
export interface QualityPenalties {
  large_adjustments: number; // +5 if any |total_adjustment_pct| > 12%
  time_drift: number; // +5 if avg |time_adj_pct| > 3%
  sqft_mismatch: number; // +10 if implied sqft variance > 10%
}

// Confidence scoring components
export interface ConfidenceComponents {
  sample_size_score: number; // S: min(40, 10*ln(1+n))
  match_quality_score: number; // M: 30*(1 - avg_feature_distance)
  consistency_score: number; // C: 30*(1 - cv/0.2)
  penalties: number; // Total penalties
  final_confidence: number; // Clamped 0-100
}

// Narrative input for LLM
export interface NarrativeInput {
  subject_ppsf: number;
  median_ppsf: number;
  band_pct: number;
  classification: string;
  price_gap: {
    delta_ppsf: number;
    total_delta: number;
  };
  comps_count: number;
  range25_75: {
    p25: number;
    p75: number;
  };
}