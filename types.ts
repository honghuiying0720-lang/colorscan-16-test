export interface FiveDimensions {
  temperature: number; // 0-100 (Cold -> Warm)
  value_score: number; // 0-100 (Deep -> Light)
  chroma: number;      // 0-100 (Muted -> Bright)
  clarity: number;     // 0-100 (Cloudy -> Clear)
  contrast: number;    // 0-100 (Low -> High)
}

export interface BodyPartColor {
  part: string;
  color: string; // Hex
}

export interface ColorRecommendation {
  name: string;
  hex: string;
  description?: string;
  reason?: string;
}

export interface AnalysisResult {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  subtype: string; // e.g., 'clear_spring'
  season_display_name?: string; // e.g., '净春型' (Added for UI convenience if AI returns it, or mapped manually)
  temperature: number;
  value_score: number;
  chroma: number;
  clarity: number;
  contrast: number;
  body_part_colors: BodyPartColor[];
  recommended_colors: ColorRecommendation[];
  avoid_colors: ColorRecommendation[];
  detailed_styling_tips: string;
  makeup_tips: string;
  styling_tips: string;
  star_reference?: string; // From the prompt requirements
  accessories_tips?: string; // From the prompt requirements
}

export type Step = 'landing' | 'upload' | 'analyzing' | 'result';