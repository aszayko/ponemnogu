import { assetUrl } from '../utils/assetUrl.js';

export const avatarAssets = {
  base: {
    male: {
      purple: assetUrl('assets/avatar/base/colors/avatar_male_purple.png'),
      lime: assetUrl('assets/avatar/base/colors/avatar_male_lime.png'),
      blue: assetUrl('assets/avatar/base/colors/avatar_male_blue.png'),
      black: assetUrl('assets/avatar/base/colors/avatar_male_black.png'),
      pink: assetUrl('assets/avatar/base/colors/avatar_male_pink.png'),
    },
    female: {
      purple: assetUrl('assets/avatar/base/colors/avatar_female_purple.png'),
      lime: assetUrl('assets/avatar/base/colors/avatar_female_lime.png'),
      blue: assetUrl('assets/avatar/base/colors/avatar_female_blue.png'),
      black: assetUrl('assets/avatar/base/colors/avatar_female_black.png'),
      pink: assetUrl('assets/avatar/base/colors/avatar_female_pink.png'),
    },
  },
  glow: assetUrl('assets/avatar/fx/avatar_glow.png'),
};

export const hairStyles = [
  { id: 'hair_01_short_neat', label: 'Аккуратная', src: assetUrl('assets/avatar/hair/hair_01_short_neat.png') },
  { id: 'hair_02_short_messy', label: 'Взъерошенная', src: assetUrl('assets/avatar/hair/hair_02_short_messy.png') },
  { id: 'hair_03_straight_shoulder', label: 'До плеч', src: assetUrl('assets/avatar/hair/hair_03_straight_shoulder.png') },
  { id: 'hair_05_long_wavy', label: 'Длинные мягкие волны', src: assetUrl('assets/avatar/hair/hair_05_long_wavy.png') },
  { id: 'hair_06_bun', label: 'Пучок', src: assetUrl('assets/avatar/hair/hair_06_bun.png') },
];

export const avatarLayerConfig = {
  base: {
    male: { x: 0, y: 0, scale: 1, zIndex: 10 },
    female: { x: 0, y: 0, scale: 1, zIndex: 10 },
  },
  glow: { x: 0, y: -5, scale: 0.72, opacity: 0.68, zIndex: 0 },
  eyes: {
    male: {
      left: { x: 45.8, y: 15.25, size: 2.05 },
      right: { x: 54.2, y: 15.25, size: 2.05 },
      opacity: 0.82,
      zIndex: 30,
    },
    female: {
      left: { x: 45.55, y: 17.15, size: 2.1 },
      right: { x: 54.45, y: 17.15, size: 2.1 },
      opacity: 0.82,
      zIndex: 30,
    },
    colors: {
      brown: '#8a4b25',
      darkBrown: '#3b2118',
      green: '#3f8d58',
      blue: '#438ac8',
      gray: '#8793a3',
    },
  },
  hair: {
    hair_01_short_neat: {
      male: { x: 0, y: -36, scale: 0.42, zIndex: 20 },
      female: { x: 0, y: -36.5, scale: 0.43, zIndex: 20 },
    },
    hair_02_short_messy: {
      male: { x: 0, y: -35.5, scale: 0.35, zIndex: 20 },
      female: { x: 0, y: -36, scale: 0.36, zIndex: 20 },
    },
    hair_03_straight_shoulder: {
      male: { x: -0.6, y: -29, scale: 0.49, zIndex: 20 },
      female: { x: -0.4, y: -29, scale: 0.47, zIndex: 20 },
    },
    hair_05_long_wavy: {
      male: { x: 0, y: -23, scale: 0.58, zIndex: 20 },
      female: { x: 0, y: -23, scale: 0.59, zIndex: 20 },
    },
    hair_06_bun: {
      male: { x: 0, y: -34.5, scale: 0.48, zIndex: 20 },
      female: { x: 0, y: -36, scale: 0.46, zIndex: 20 },
    },
  },
};

export function getAvatarBaseSource(bodyType, hoodieColor) {
  const normalizedBodyType = bodyType === 'male' ? 'male' : 'female';
  return avatarAssets.base[normalizedBodyType][hoodieColor]
    ?? avatarAssets.base[normalizedBodyType].purple;
}

export function getHairStylesForBodyType(bodyType) {
  return hairStyles.filter(({ id }) => avatarLayerConfig.hair[id]?.[bodyType]);
}

export function getDefaultHairStyle(bodyType) {
  return getHairStylesForBodyType(bodyType)[0]?.id ?? hairStyles[0].id;
}
