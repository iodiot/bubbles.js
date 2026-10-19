import * as THREE from 'three';
import noise from '../shaders/noise.glsl?raw';
import thinfilm from '../shaders/thinfilm.glsl?raw';
import vert from '../shaders/bubble.vert?raw';
import frag from '../shaders/bubble.frag?raw';

export interface LookParams {
  size: number;
  intensity: number;
  envIntensity: number;
  thickTop: number;
  thickBottom: number;
  swirl: number;
  saturation: number;
  focus: number;
  aperture: number;
}

/**
 * One instanced draw call for every bubble. The quad corners are expanded in
 * the vertex shader; shading is a per-pixel ray/sphere hit with thin-film
 * interference (see bubble.frag / thinfilm.glsl).
 */
export class Bubbles extends THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial> {
  constructor(size: number, bounds: THREE.Vector3, env: THREE.Texture) {
    const quad = new THREE.PlaneGeometry(2, 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    const count = size * size;
    const ref = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      ref[i * 2] = ((i % size) + 0.5) / size;
      ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
    }
    geometry.setAttribute('aRef', new THREE.InstancedBufferAttribute(ref, 2));
    geometry.instanceCount = count;

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: noise + thinfilm + frag,
      uniforms: {
        uPositions: { value: null },
        uVelocities: { value: null },
        uEnv: { value: env },
        uEnvIntensity: { value: 1 },
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uSize: { value: 1 },
        uThickTop: { value: 200 },
        uThickBottom: { value: 800 },
        uSwirl: { value: 1 },
        uSaturation: { value: 1 },
        uFocus: { value: 10 },
        uAperture: { value: 0 },
        uBounds: { value: bounds },
      },
      transparent: true,
      depthWrite: false,
      // Premultiplied "over": reflections add, transmission dims the background.
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    super(geometry, material);
    this.frustumCulled = false; // instances move on the GPU
  }

  setEnv(env: THREE.Texture) { this.material.uniforms.uEnv.value = env; }

  update(time: number, positions: THREE.Texture, velocities: THREE.Texture, p: LookParams) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uPositions.value = positions;
    u.uVelocities.value = velocities;
    u.uSize.value = p.size;
    u.uIntensity.value = p.intensity;
    u.uThickTop.value = p.thickTop;
    u.uThickBottom.value = p.thickBottom;
    u.uSwirl.value = p.swirl;
    u.uSaturation.value = p.saturation;
    u.uFocus.value = p.focus;
    u.uAperture.value = p.aperture;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
