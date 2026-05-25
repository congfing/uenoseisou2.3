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
      const shadows = [];
      const steps = Math.max(15, offset * 4);
      for (let i = 1; i <= steps; i++) {
        const ratio = i / steps;
        const opacity = (1 - ratio) * (1 - ratio);
        shadows.push(`${i}px ${i}px ${Math.round(blur * ratio)}px ${rgba(opacity)}`);
      }
      return shadows.join(', ');
    }
    case 'gradient-r': {
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

// ===== グラデーション（半透明オーバーレイ） =====
function generateGradient(style, top, bottom, position, strength = 50) {
  const a = strength / 100;
  const toRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const t = (hex) => toRgba(hex, a);
  const trans = 'rgba(0,0,0,0)';
  const p = position;

  switch (style) {
    case 'bottom-dark':
      return `linear-gradient(to bottom, ${trans} 0%, ${trans} ${p}%, ${t(bottom)} 100%)`;
    case 'bottom-bright':
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

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

// ===== 背景透過 =====
function applyBgOpacity(opacity, removeBgImage) {
  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    const bg = style.backgroundColor;

    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        el.style.setProperty('background-color', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`, 'important');
        el.dataset.bgModified = 'true';
      }
    }

    if (removeBgImage) {
      const bgImg = style.backgroundImage;
      if (bgImg && bgImg !== 'none') {
        el.style.setProperty('background-image', 'none', 'important');
        el.dataset.bgImgModified = 'true';
      }
    }
  });
}

// ===== 文字影 =====
function applyTextShadow(preset, blur, offset, color, alpha) {
  const shadow = generateTextShadow(preset, blur, offset, color, alpha);

  document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, div, label, button').forEach(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (hasText) {
      el.style.setProperty('text-shadow', shadow, 'important');
      el.dataset.textShadowModified = 'true';
    }
  });
}

// ===== 文字の背景グラデーション（元の背景色に重ねる、正方形固定） =====
function applyTextGradient(style, top, bottom, position, padding, strength) {
  const gradient = generateGradient(style, top, bottom, position, strength);

  document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, button').forEach(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (hasText) {
      el.style.setProperty('background-image', gradient, 'important');
      el.style.setProperty('padding', padding + 'px', 'important');
      el.style.setProperty('border-radius', '0px', 'important');  // 正方形固定
      const display = window.getComputedStyle(el).display;
      if (display === 'inline') {
        el.style.setProperty('display', 'inline-block', 'important');
        el.dataset.gradientDisplayChanged = 'true';
      }
      el.dataset.textGradientModified = 'true';
    }
  });
}

// ===== 画像影 =====
function applyImgShadow(blur, offset, color, alpha) {
  const { r, g, b } = hexToRgb(color);
  const a = alpha / 100;
  const dropShadow = `drop-shadow(${offset}px ${offset * 1.5}px ${blur}px rgba(${r},${g},${b},${a}))`;

  document.querySelectorAll('img').forEach(el => {
    el.style.setProperty('filter', dropShadow, 'important');
    el.style.setProperty('transform', `translateY(-${Math.round(offset / 2)}px)`, 'important');
    el.style.setProperty('transition', 'filter 0.3s, transform 0.3s', 'important');
    el.dataset.imgShadowModified = 'true';
  });
}

// ===== リセット =====
function resetAll() {
  document.querySelectorAll('[data-bg-modified]').forEach(el => {
    el.style.removeProperty('background-color');
    delete el.dataset.bgModified;
  });
  document.querySelectorAll('[data-bg-img-modified]').forEach(el => {
    el.style.removeProperty('background-image');
    delete el.dataset.bgImgModified;
  });
  document.querySelectorAll('[data-text-shadow-modified]').forEach(el => {
    el.style.removeProperty('text-shadow');
    delete el.dataset.textShadowModified;
  });
  document.querySelectorAll('[data-text-gradient-modified]').forEach(el => {
    el.style.removeProperty('background-image');
    el.style.removeProperty('padding');
    el.style.removeProperty('border-radius');
    if (el.dataset.gradientDisplayChanged) {
      el.style.removeProperty('display');
      delete el.dataset.gradientDisplayChanged;
    }
    delete el.dataset.textGradientModified;
  });
  document.querySelectorAll('[data-img-shadow-modified]').forEach(el => {
    el.style.removeProperty('filter');
    el.style.removeProperty('transform');
    el.style.removeProperty('transition');
    delete el.dataset.imgShadowModified;
  });
}

// ===== 設定を適用するメイン関数 =====
function applySettings(s) {
  resetAll();
  if (s.bgEnable) {
    applyBgOpacity(parseInt(s.bgOpacity) / 100, s.removeBgImage);
  }
  if (s.textShadowEnable) {
    applyTextShadow(s.textShadowPreset || 'float', parseInt(s.textBlur), parseInt(s.textOffset), s.textShadowColor, parseInt(s.textShadowAlpha));
  }
  if (s.gradientEnable) {
    applyTextGradient(
      s.gradientStyle || 'bottom-dark',
      s.gradientTop || '#ffffff',
      s.gradientBottom || '#333333',
      parseInt(s.gradientPosition),
      parseInt(s.gradientPadding) || 4,
      parseInt(s.gradientStrength) || 50
    );
  }
  if (s.imgShadowEnable) {
    applyImgShadow(parseInt(s.imgBlur), parseInt(s.imgOffset), s.imgShadowColor, parseInt(s.imgShadowAlpha));
  }
}

// ===== ページ読み込み時に自動適用 =====
chrome.storage.local.get(null, (data) => {
  if (data && (data.bgEnable || data.textShadowEnable || data.gradientEnable || data.imgShadowEnable)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => applySettings(data));
    } else {
      applySettings(data);
    }

    const observer = new MutationObserver(() => applySettings(data));
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => applySettings(data), 1000);
    setTimeout(() => applySettings(data), 3000);
  }
});

// ===== メッセージ受信 =====
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'applyEffects') {
    applySettings(msg.settings);
  } else if (msg.action === 'reset') {
    resetAll();
  }
});
