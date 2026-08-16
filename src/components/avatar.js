import {
  avatarAssets,
  avatarLayerConfig,
  getAvatarBaseSource,
  getDefaultHairStyle,
  hairStyles,
} from '../data/avatarConfig.js';
import { getColorOption, getHoodieColorOption, hairColors } from '../data/colors.js';

function applyLayerConfig(element, config) {
  element.style.setProperty('--layer-x', `${config.x}%`);
  element.style.setProperty('--layer-y', `${config.y}%`);
  element.style.setProperty('--layer-scale', config.scale);
  element.style.zIndex = config.zIndex;

  if (config.opacity !== undefined) {
    element.style.opacity = config.opacity;
  }
}

function getCompatibleHairStyle(bodyType, hairStyleId) {
  const requestedStyle = hairStyles.find(({ id }) => id === hairStyleId);
  if (requestedStyle && avatarLayerConfig.hair[requestedStyle.id]?.[bodyType]) {
    return requestedStyle;
  }

  const fallbackId = getDefaultHairStyle(bodyType);
  return hairStyles.find(({ id }) => id === fallbackId) ?? hairStyles[0];
}

export function createAvatarPreview(initialAvatar) {
  const preview = document.createElement('div');
  preview.className = 'avatar-preview';
  preview.setAttribute('role', 'img');
  preview.innerHTML = `
    <div class="avatar-stage">
      <img class="avatar-layer" data-layer="glow" alt="" aria-hidden="true" />
      <img class="avatar-layer avatar-layer--base" data-layer="base" alt="" aria-hidden="true" />
      <img class="avatar-layer" data-layer="hair" alt="" aria-hidden="true" />
      <span class="avatar-iris-tint avatar-iris-tint--left" data-layer="irisLeft" aria-hidden="true"></span>
      <span class="avatar-iris-tint avatar-iris-tint--right" data-layer="irisRight" aria-hidden="true"></span>
    </div>
  `;

  const layers = Object.fromEntries(
    [...preview.querySelectorAll('[data-layer]')].map((layer) => [layer.dataset.layer, layer]),
  );

  function update(avatar) {
    const bodyType = avatar.bodyType === 'male' ? 'male' : 'female';
    const hairStyle = getCompatibleHairStyle(bodyType, avatar.hairStyle);
    const hoodieColor = getHoodieColorOption(avatar.hoodieColor);

    layers.glow.src = avatarAssets.glow;
    layers.base.src = getAvatarBaseSource(bodyType, hoodieColor.id);
    layers.hair.src = hairStyle.src;
    layers.hair.style.filter = getColorOption(hairColors, avatar.hairColor).filter;

    applyLayerConfig(layers.glow, avatarLayerConfig.glow);
    applyLayerConfig(layers.base, avatarLayerConfig.base[bodyType]);
    applyLayerConfig(layers.hair, avatarLayerConfig.hair[hairStyle.id][bodyType]);

    const irisConfig = avatarLayerConfig.eyes[bodyType];
    const irisColor = avatarLayerConfig.eyes.colors[avatar.eyeColor]
      ?? avatarLayerConfig.eyes.colors.brown;

    [['irisLeft', irisConfig.left], ['irisRight', irisConfig.right]].forEach(([layerName, config]) => {
      const iris = layers[layerName];
      iris.style.setProperty('--iris-x', `${config.x}%`);
      iris.style.setProperty('--iris-y', `${config.y}%`);
      iris.style.setProperty('--iris-size', `${config.size}%`);
      iris.style.setProperty('--iris-color', irisColor);
      iris.style.background = `radial-gradient(circle, transparent 0 28%, ${irisColor} 32% 70%, transparent 73%)`;
      iris.style.opacity = irisConfig.opacity;
      iris.style.zIndex = irisConfig.zIndex;
    });

    preview.setAttribute(
      'aria-label',
      `Предпросмотр персонажа: ${bodyType === 'male' ? 'мужской' : 'женский'} образ`,
    );
  }

  update(initialAvatar);
  return { element: preview, update };
}
