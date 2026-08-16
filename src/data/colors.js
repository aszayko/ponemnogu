export const hairColors = [
  { id: 'black', label: 'Чёрный', swatch: '#211b1c', filter: 'brightness(.28) saturate(.7)' },
  { id: 'darkBrown', label: 'Тёмно-коричневый', swatch: '#4b2b20', filter: 'brightness(.62) saturate(1.15)' },
  { id: 'lightBrown', label: 'Светло-коричневый', swatch: '#9a6242', filter: 'brightness(1.08) saturate(.88)' },
  { id: 'blonde', label: 'Блонд', swatch: '#e5bd69', filter: 'sepia(.58) saturate(.78) brightness(1.34)' },
  { id: 'ginger', label: 'Рыжий', swatch: '#bd592e', filter: 'sepia(.6) saturate(1.9) hue-rotate(338deg) brightness(.94)' },
  { id: 'purple', label: 'Фиолетовый', swatch: '#7140a7', filter: 'sepia(1) saturate(3.6) hue-rotate(228deg) brightness(.72)' },
];

export const eyeColors = [
  { id: 'brown', label: 'Карие', swatch: '#87502c', filter: 'none' },
  { id: 'darkBrown', label: 'Тёмно-карие', swatch: '#40271d', filter: 'brightness(.56) saturate(1.1)' },
  { id: 'green', label: 'Зелёные', swatch: '#4f8759', filter: 'hue-rotate(68deg) saturate(.82) brightness(.82)' },
  { id: 'blue', label: 'Голубые', swatch: '#5387bd', filter: 'hue-rotate(176deg) saturate(1.05) brightness(.9)' },
  { id: 'gray', label: 'Серые', swatch: '#89919e', filter: 'grayscale(.78) brightness(1.08)' },
];

export const hoodieColors = [
  { id: 'purple', label: 'Фиолетовый', swatch: '#7c3aed' },
  { id: 'lime', label: 'Лайм', swatch: '#a8e600' },
  { id: 'blue', label: 'Синий', swatch: '#3976d7' },
  { id: 'black', label: 'Чёрный', swatch: '#272a32' },
  { id: 'pink', label: 'Розовый', swatch: '#e777aa' },
];

export function getColorOption(options, colorId) {
  return options.find(({ id }) => id === colorId) ?? options[0];
}

export function getHoodieColorOption(colorId) {
  return hoodieColors.find(({ id }) => id === colorId)
    ?? hoodieColors.find(({ id }) => id === 'purple');
}
