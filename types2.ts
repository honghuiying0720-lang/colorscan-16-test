export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ColorItem {
  name: string;
  hex: string;
  description?: string;
  reason?: string;
}

export interface BodyPartColor {
  part: string;
  color: string;
}

export interface StylingTips {
  fashion_matching: string;
  celebrity_reference: string;
  jewelry_colors: string;
  makeup_details: string;
}

export interface SeasonalProfile {
  season: Season;
  subtype: string;
  temperature: number;
  value_score: number;
  chroma: number;
  clarity: number;
  contrast: number;
  body_part_colors: BodyPartColor[];
  recommended_colors: ColorItem[];
  avoid_colors: ColorItem[];
  detailed_styling_tips: StylingTips;
  makeup_tips: string;
  styling_tips: string;
}

export const SEASONS: Record<Season, string[]> = {
  spring: ['clear_spring', 'light_spring', 'soft_spring', 'bright_spring'],
  summer: ['light_summer', 'soft_summer', 'bright_summer', 'deep_summer'],
  autumn: ['soft_autumn', 'bright_autumn', 'deep_autumn', 'light_autumn'],
  winter: ['soft_winter', 'bright_winter', 'deep_winter', 'clear_winter'],
};

export const ALL_SUBTYPES = [
  ...SEASONS.spring,
  ...SEASONS.summer,
  ...SEASONS.autumn,
  ...SEASONS.winter,
];

export interface XiaohongshuNote {
  title: string;
  shorttitle?: string;
  content: string;
  tags: string[];
}
