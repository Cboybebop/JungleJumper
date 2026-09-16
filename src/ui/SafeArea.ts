import Phaser from 'phaser';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const CSS_SAFE_AREA_PROBE_ID = 'jungle-jumper-safe-area';

function readCssInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  let probe = document.getElementById(CSS_SAFE_AREA_PROBE_ID);
  if (!probe) {
    probe = document.createElement('div');
    probe.id = CSS_SAFE_AREA_PROBE_ID;
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:fixed', 'pointer-events:none', 'visibility:hidden',
      'padding-top:env(safe-area-inset-top)',
      'padding-right:env(safe-area-inset-right)',
      'padding-bottom:env(safe-area-inset-bottom)',
      'padding-left:env(safe-area-inset-left)',
    ].join(';');
    document.body.appendChild(probe);
  }

  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

export function getSafeArea(scene: Phaser.Scene, minimum = 12): SafeAreaInsets {
  const css = readCssInsets();
  const bounds = scene.game.canvas.getBoundingClientRect();
  const scaleX = bounds.width > 0 ? scene.cameras.main.width / bounds.width : 1;
  const scaleY = bounds.height > 0 ? scene.cameras.main.height / bounds.height : 1;

  return {
    top: Math.max(minimum, Math.ceil(css.top * scaleY)),
    right: Math.max(minimum, Math.ceil(css.right * scaleX)),
    bottom: Math.max(minimum, Math.ceil(css.bottom * scaleY)),
    left: Math.max(minimum, Math.ceil(css.left * scaleX)),
  };
}

