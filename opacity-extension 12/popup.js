// ===== 影プリセット =====
function generateTextShadow(preset, blur, offset, color, alpha) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const a = alpha / 100;
  const rgba = (mult = 1) => `rgba(${r},${g},${b},${a * mult})`;

  switch (preset) {
    case 'float':
      return [`${offset}px ${offset}px ${blur}px ${rgba()}`,`-${offset}px ${offset}px ${blur}px ${rgba(0.6)}`,`0px ${offset * 1.5}px ${blur * 1.5}px ${rgba(0.8)}`].join(', ');
    case 'lifted':
      return [`0 ${offset * 2}px ${blur * 2}px ${rgba(0.8)}`,`0 ${offset}px ${blur}px ${rgba(0.4)}`].join(', ');
    case 'bottom':
      return `${Math.round(offset / 2)}px ${offset}px ${blur}px ${rgba()}`;
    case 'right':
      return `${offset}px ${offset}px ${blur}px ${rgba()}`;
    case 'left':
      return `-${offset}px ${offset}px ${blur}px ${rgba()}`;
    case 'top':
      return `0 -${offset}px ${blur}px ${rgba()}`;
    case 'glow':
      return [`0 0 ${blur}px ${rgba()}`,`0 0 ${blur * 2}px ${rgba(0.6)}`,`0 0 ${blur * 3}px ${rgba(0.3)}`].join(', ');
    case 'neon':
      return [`0 0 ${Math.max(2, blur / 3)}px ${rgba()}`,`0 0 ${blur}px ${rgba(0.8)}`,`0 0 ${blur * 2}px ${rgba(0.6)}`,`0 0 ${blur * 3}px ${rgba(0.4)}`,`0 0 ${blur * 4}px ${rgba(0.2)}`].join(', ');
    case 'outline':
      return [`${offset}px 0 0 ${rgba()}`,`-${offset}px 0 0 ${rgba()}`,`0 ${offset}px 0 ${rgba()}`,`0 -${offset}px 0 ${rgba()}`,`${offset}px ${offset}px 0 ${rgba()}`,`-${offset}px -${offset}px 0 ${rgba()}`,`${offset}px -${offset}px 0 ${rgba()}`,`-${offset}px ${offset}px 0 ${rgba()}`].join(', ');
    case 'emboss':
      return [`${offset}px ${offset}px ${blur}px ${rgba(0.8)}`,`-${offset}px -${offset}px ${blur}px rgba(255,255,255,${a * 0.6})`].join(', ');
    case 'long': {
      const shadows = [];
      const length = Math.max(10, offset * 5);
      for (let i = 1; i <= length; i++) shadows.push(`${i}px ${i}px 0 ${rgba(0.9 - (i / length) * 0.5)}`);
      return shadows.join(', ');
    }
    case 'retro':
      return [`${offset}px ${offset}px 0 ${rgba()}`,`${offset * 2}px ${offset * 2}px 0 ${rgba(0.7)}`,`${offset * 3}px ${offset * 3}px 0 ${rgba(0.4)}`].join(', ');
    case '3d': {
      const shadows = [];
      const depth = Math.max(3, offset);
      for (let i = 1; i <= depth; i++) shadows.push(`${i}px ${i}px 0 ${rgba(0.9 - (i / depth) * 0.3)}`);
      shadows.push(`${depth + 2}px ${depth + 2}px ${blur}px ${rgba(0.5)}`);
      return shadows.join(', ');
    }
    case 'gradient-rb': {
      // 右下方向にグラデーション影（右下に向かって徐々に薄くなる）
      const shadows = [];
      const steps = Math.max(15, offset * 4);
      for (let i = 1; i <= steps; i++) {
        const ratio = i / steps;
        const opacity = (1 - ratio) * (1 - ratio); // 二次関数で自然な減衰
        shadows.push(`${i}px ${i}px ${Math.round(blur * ratio)}px ${rgba(opacity)}`);
      }
      return shadows.join(', ');
    }
    case 'gradient-r': {
      // 右方向にグラデーション影
      const shadows = [];
      const steps = Math.max(15, offset * 4);
      for (let i = 1; i <= steps; i++) {
        const ratio = i / steps;
        const opacity = (1 - ratio) * (1 - ratio);
        shadows.push(`${i}px 0 ${Math.round(blur * ratio)}px ${rgba(opacity)}`);
      }
      return shadows.join(', ');
    }
    case 'gradient-b': {
      // 下方向にグラデーション影
      const shadows = [];
      const steps = Math.max(15, offset * 4);
      for (let i = 1; i <= steps; i++) {
        const ratio = i / steps;
        const opacity = (1 - ratio) * (1 - ratio);
        shadows.push(`0 ${i}px ${Math.round(blur * ratio)}px ${rgba(opacity)}`);
      }
      return shadows.join(', ');
    }
    default:
      return `${offset}px ${offset}px ${blur}px ${rgba()}`;
  }
}

// ===== グラデーション（半透明オーバーレイ用） =====
// strength: 0-100 グラデーションの強さ（不透明度）
// 0なら完全透明、100なら完全に色がのる
function generateGradient(style, top, bottom, position, strength = 50) {
  const a = strength / 100;
  // 16進カラー + 透明度 → rgba文字列
  const toRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const t = (hex) => toRgba(hex, a);            // 主要色（指定された強さ）
  const trans = 'rgba(0,0,0,0)';                 // 透明
  const p = position;

  switch (style) {
    case 'bottom-dark':
      // 上：透明 → 下：暗い（元の色の上に暗いグラデが乗って盛り上がり）
      return `linear-gradient(to bottom, ${trans} 0%, ${trans} ${p}%, ${t(bottom)} 100%)`;
    case 'bottom-bright':
      // 上：透明 → 下：明るい（凹み）
      return `linear-gradient(to bottom, ${t(bottom)} 0%, ${trans} ${p}%, ${t(top)} 100%)`;
    case 'metallic':
      return `linear-gradient(to bottom, ${toRgba('#ffffff', a*0.8)} 0%, ${toRgba('#ffffff', a*0.4)} 20%, ${toRgba('#000000', a*0.5)} 50%, ${toRgba('#000000', a*0.7)} 51%, ${toRgba('#000000', a*0.3)} 80%, ${toRgba('#ffffff', a*0.5)} 100%)`;
    case 'chrome':
      return `linear-gradient(to bottom, ${toRgba('#ffffff', a*0.8)} 0%, ${toRgba('#000000', a*0.3)} 30%, ${toRgba('#000000', a*0.8)} 50%, ${toRgba('#000000', a*0.3)} 70%, ${toRgba('#ffffff', a*0.8)} 100%)`;
    case 'gold':
      return `linear-gradient(to bottom, ${toRgba('#fceabb', a)} 0%, ${toRgba('#f8b500', a)} 40%, ${toRgba('#b78628', a)} 60%, ${toRgba('#f8b500', a)} 80%, ${toRgba('#fceabb', a)} 100%)`;
    case 'silver':
      return `linear-gradient(to bottom, ${toRgba('#f5f5f5', a)} 0%, ${toRgba('#d3d3d3', a)} 40%, ${toRgba('#808080', a)} 60%, ${toRgba('#d3d3d3', a)} 80%, ${toRgba('#f5f5f5', a)} 100%)`;
    case 'rainbow':
      return `linear-gradient(to bottom, ${toRgba('#ff0000', a)}, ${toRgba('#ff7f00', a)}, ${toRgba('#ffff00', a)}, ${toRgba('#00ff00', a)}, ${toRgba('#0000ff', a)}, ${toRgba('#4b0082', a)}, ${toRgba('#9400d3', a)})`;
    case 'sunset':
      return `linear-gradient(to bottom, ${toRgba('#ff6e7f', a)} 0%, ${toRgba('#bfe9ff', a)} 100%)`;
    case 'ice':
      return `linear-gradient(to bottom, ${toRgba('#ffffff', a)} 0%, ${toRgba('#a8d8ea', a)} 40%, ${toRgba('#6fa8dc', a)} 100%)`;
    case 'fire':
      return `linear-gradient(to bottom, ${toRgba('#ffeb3b', a)} 0%, ${toRgba('#ff9800', a)} 40%, ${toRgba('#f44336', a)} 80%, ${toRgba('#b71c1c', a)} 100%)`;
    default:
      return `linear-gradient(to bottom, ${t(top)}, ${t(bottom)})`;
  }
}

// スライダー表示の更新ヘルパー
function bindSlider(sliderId, valId, suffix) {
  const slider = document.getElementById(sliderId);
  const val = document.getElementById(valId);
  slider.addEventListener('input', () => {
    val.textContent = slider.value + suffix;
    updatePreview();
  });
}

bindSlider('bgOpacity',        'bgVal',          '%');
bindSlider('textBlur',         'textBlurVal',    'px');
bindSlider('textOffset',       'textOffsetVal',  'px');
bindSlider('textShadowAlpha',  'textAlphaVal',   '%');
bindSlider('gradientPosition', 'gradientPosVal', '%');
bindSlider('gradientPadding',  'gradientPaddingVal', 'px');
bindSlider('gradientStrength', 'gradientStrengthVal', '%');
bindSlider('imgBlur',          'imgBlurVal',     'px');
bindSlider('imgOffset',        'imgOffsetVal',   'px');
bindSlider('imgShadowAlpha',   'imgAlphaVal',    '%');

// プレビュー更新
function updatePreview() {
  const preview = document.getElementById('textPreview');

  // 影
  const preset = document.getElementById('textShadowPreset').value;
  const blur = parseInt(document.getElementById('textBlur').value);
  const offset = parseInt(document.getElementById('textOffset').value);
  const shadowColor = document.getElementById('textShadowColor').value;
  const alpha = parseInt(document.getElementById('textShadowAlpha').value);
  const shadowEnable = document.getElementById('textShadowEnable').checked;

  // グラデーション
  const gradientEnable = document.getElementById('gradientEnable').checked;
  const gradStyle = document.getElementById('gradientStyle').value;
  const gradTop = document.getElementById('gradientTop').value;
  const gradBottom = document.getElementById('gradientBottom').value;
  const gradPos = parseInt(document.getElementById('gradientPosition').value);
  const gradPadding = parseInt(document.getElementById('gradientPadding').value);
  const gradStrength = parseInt(document.getElementById('gradientStrength').value);

  // 一度リセット
  preview.style.textShadow = '';
  preview.style.background = '';
  preview.style.backgroundImage = '';
  preview.style.backgroundColor = '';
  preview.style.padding = '';
  preview.style.borderRadius = '';
  preview.style.display = '';

  if (gradientEnable) {
    preview.style.backgroundColor = '#ffe082';
    const gradient = generateGradient(gradStyle, gradTop, gradBottom, gradPos, gradStrength);
    preview.style.backgroundImage = gradient;
    preview.style.padding = gradPadding + 'px';
    preview.style.borderRadius = '0px';  // 正方形
  } else {
    preview.style.background = '#f5f5f5';
  }

  if (shadowEnable) {
    preview.style.textShadow = generateTextShadow(preset, blur, offset, shadowColor, alpha);
  }
}

document.getElementById('textShadowPreset').addEventListener('change', updatePreview);
document.getElementById('textShadowColor').addEventListener('input', updatePreview);
document.getElementById('textShadowEnable').addEventListener('change', updatePreview);
document.getElementById('gradientStyle').addEventListener('change', updatePreview);
document.getElementById('gradientTop').addEventListener('input', updatePreview);
document.getElementById('gradientBottom').addEventListener('input', updatePreview);
document.getElementById('gradientEnable').addEventListener('change', updatePreview);

// 設定を読み込む
chrome.storage.local.get(null, (data) => {
  if (data.bgEnable !== undefined)         document.getElementById('bgEnable').checked         = data.bgEnable;
  if (data.bgOpacity !== undefined)        { document.getElementById('bgOpacity').value        = data.bgOpacity;       document.getElementById('bgVal').textContent         = data.bgOpacity + '%'; }
  if (data.removeBgImage !== undefined)    document.getElementById('removeBgImage').checked    = data.removeBgImage;

  if (data.textShadowEnable !== undefined) document.getElementById('textShadowEnable').checked = data.textShadowEnable;
  if (data.textShadowPreset !== undefined) document.getElementById('textShadowPreset').value   = data.textShadowPreset;
  if (data.textBlur !== undefined)         { document.getElementById('textBlur').value         = data.textBlur;        document.getElementById('textBlurVal').textContent   = data.textBlur + 'px'; }
  if (data.textOffset !== undefined)       { document.getElementById('textOffset').value       = data.textOffset;      document.getElementById('textOffsetVal').textContent = data.textOffset + 'px'; }
  if (data.textShadowColor !== undefined)  document.getElementById('textShadowColor').value    = data.textShadowColor;
  if (data.textShadowAlpha !== undefined)  { document.getElementById('textShadowAlpha').value  = data.textShadowAlpha; document.getElementById('textAlphaVal').textContent  = data.textShadowAlpha + '%'; }

  if (data.gradientEnable !== undefined)   document.getElementById('gradientEnable').checked   = data.gradientEnable;
  if (data.gradientStyle !== undefined)    document.getElementById('gradientStyle').value      = data.gradientStyle;
  if (data.gradientTop !== undefined)      document.getElementById('gradientTop').value        = data.gradientTop;
  if (data.gradientBottom !== undefined)   document.getElementById('gradientBottom').value     = data.gradientBottom;
  if (data.gradientPosition !== undefined) { document.getElementById('gradientPosition').value = data.gradientPosition; document.getElementById('gradientPosVal').textContent = data.gradientPosition + '%'; }
  if (data.gradientPadding !== undefined)  { document.getElementById('gradientPadding').value  = data.gradientPadding;  document.getElementById('gradientPaddingVal').textContent = data.gradientPadding + 'px'; }
  if (data.gradientStrength !== undefined) { document.getElementById('gradientStrength').value = data.gradientStrength; document.getElementById('gradientStrengthVal').textContent = data.gradientStrength + '%'; }

  if (data.imgShadowEnable !== undefined)  document.getElementById('imgShadowEnable').checked  = data.imgShadowEnable;
  if (data.imgBlur !== undefined)          { document.getElementById('imgBlur').value          = data.imgBlur;         document.getElementById('imgBlurVal').textContent    = data.imgBlur + 'px'; }
  if (data.imgOffset !== undefined)        { document.getElementById('imgOffset').value        = data.imgOffset;       document.getElementById('imgOffsetVal').textContent  = data.imgOffset + 'px'; }
  if (data.imgShadowColor !== undefined)   document.getElementById('imgShadowColor').value     = data.imgShadowColor;
  if (data.imgShadowAlpha !== undefined)   { document.getElementById('imgShadowAlpha').value   = data.imgShadowAlpha;  document.getElementById('imgAlphaVal').textContent   = data.imgShadowAlpha + '%'; }

  updatePreview();
});

document.getElementById('applyBtn').addEventListener('click', () => {
  const settings = {
    bgEnable:         document.getElementById('bgEnable').checked,
    bgOpacity:        document.getElementById('bgOpacity').value,
    removeBgImage:    document.getElementById('removeBgImage').checked,

    textShadowEnable: document.getElementById('textShadowEnable').checked,
    textShadowPreset: document.getElementById('textShadowPreset').value,
    textBlur:         document.getElementById('textBlur').value,
    textOffset:       document.getElementById('textOffset').value,
    textShadowColor:  document.getElementById('textShadowColor').value,
    textShadowAlpha:  document.getElementById('textShadowAlpha').value,

    gradientEnable:   document.getElementById('gradientEnable').checked,
    gradientStyle:    document.getElementById('gradientStyle').value,
    gradientTop:      document.getElementById('gradientTop').value,
    gradientBottom:   document.getElementById('gradientBottom').value,
    gradientPosition: document.getElementById('gradientPosition').value,
    gradientPadding:  document.getElementById('gradientPadding').value,
    gradientStrength: document.getElementById('gradientStrength').value,

    imgShadowEnable:  document.getElementById('imgShadowEnable').checked,
    imgBlur:          document.getElementById('imgBlur').value,
    imgOffset:        document.getElementById('imgOffset').value,
    imgShadowColor:   document.getElementById('imgShadowColor').value,
    imgShadowAlpha:   document.getElementById('imgShadowAlpha').value,
  };

  chrome.storage.local.set(settings);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'applyEffects', settings });
  });

  const status = document.getElementById('status');
  status.textContent = '✓ 適用しました';
  setTimeout(() => status.textContent = '', 2000);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.storage.local.clear();

  document.getElementById('bgEnable').checked         = false;
  document.getElementById('bgOpacity').value          = 100; document.getElementById('bgVal').textContent         = '100%';
  document.getElementById('removeBgImage').checked    = false;
  document.getElementById('textShadowEnable').checked = false;
  document.getElementById('textShadowPreset').value   = 'float';
  document.getElementById('textBlur').value           = 6;   document.getElementById('textBlurVal').textContent   = '6px';
  document.getElementById('textOffset').value         = 2;   document.getElementById('textOffsetVal').textContent = '2px';
  document.getElementById('textShadowColor').value    = '#000000';
  document.getElementById('textShadowAlpha').value    = 50;  document.getElementById('textAlphaVal').textContent  = '50%';
  document.getElementById('gradientEnable').checked   = false;
  document.getElementById('gradientStyle').value      = 'bottom-dark';
  document.getElementById('gradientTop').value        = '#ffffff';
  document.getElementById('gradientBottom').value     = '#333333';
  document.getElementById('gradientPosition').value   = 50;  document.getElementById('gradientPosVal').textContent = '50%';
  document.getElementById('gradientPadding').value    = 4;   document.getElementById('gradientPaddingVal').textContent = '4px';
  document.getElementById('gradientStrength').value   = 50;  document.getElementById('gradientStrengthVal').textContent = '50%';
  document.getElementById('imgShadowEnable').checked  = false;
  document.getElementById('imgBlur').value            = 16;  document.getElementById('imgBlurVal').textContent    = '16px';
  document.getElementById('imgOffset').value          = 8;   document.getElementById('imgOffsetVal').textContent  = '8px';
  document.getElementById('imgShadowColor').value     = '#000000';
  document.getElementById('imgShadowAlpha').value     = 40;  document.getElementById('imgAlphaVal').textContent   = '40%';

  updatePreview();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'reset' });
  });

  const status = document.getElementById('status');
  status.textContent = '✓ リセットしました';
  setTimeout(() => status.textContent = '', 2000);
});
