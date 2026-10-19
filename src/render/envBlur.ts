import * as THREE from 'three';

/**
 * Small, pre-filtered copy of an equirectangular HDR for the bubble reflections.
 * Bubbles are tiny on screen; sampling the full-res HDRI through a curved
 * mirror aliases into sparkly noise, so we reflect a softly blurred version
 * (roughly what mip-mapping would give, without the equirect seam issues).
 */
export function blurredEquirect(src: THREE.DataTexture, width = 256, passes = 2): THREE.DataTexture {
  const sw = src.image.width, sh = src.image.height;
  const s = src.image.data as Float32Array;
  const w = width, h = width / 2;
  const fx = sw / w, fy = sh / h;
  let out = new Float32Array(w * h * 4);

  // Box downsample.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = Math.floor(y * fy); j < Math.floor((y + 1) * fy); j++) {
        for (let i = Math.floor(x * fx); i < Math.floor((x + 1) * fx); i++) {
          const k = (j * sw + i) * 4;
          r += s[k]; g += s[k + 1]; b += s[k + 2]; n++;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 1;
    }
  }

  // Separable 5-tap blur, wrapping horizontally, clamping vertically.
  const kernel = [1, 4, 6, 4, 1].map((v) => v / 16);
  for (let p = 0; p < passes; p++) {
    for (const horizontal of [true, false]) {
      const next = new Float32Array(out.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0;
          for (let t = -2; t <= 2; t++) {
            const xx = horizontal ? (x + t + w) % w : x;
            const yy = horizontal ? y : Math.min(h - 1, Math.max(0, y + t));
            const k = (yy * w + xx) * 4, c = kernel[t + 2];
            r += out[k] * c; g += out[k + 1] * c; b += out[k + 2] * c;
          }
          const o = (y * w + x) * 4;
          next[o] = r; next[o + 1] = g; next[o + 2] = b; next[o + 3] = 1;
        }
      }
      out = next;
    }
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.flipY = src.flipY;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
