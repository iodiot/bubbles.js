// Instanced camera-facing quads; each instance reads its bubble from the
// GPGPU textures, so the CPU never touches per-bubble data after init.
attribute vec2 aRef;              // texel of this bubble in the sim textures

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uSize;
uniform float uFocus;             // focus distance (world units)
uniform float uAperture;          // depth-of-field strength
uniform vec3 uBounds;

varying vec3 vWorldPos;
varying vec3 vCenter;
varying float vRadius;
varying float vCoC;
varying float vPop;
varying float vSeed;
varying float vFade;

void main() {
  vec4 p = texture2D(uPositions, aRef);
  vec4 v = texture2D(uVelocities, aRef);
  float r = p.w * uSize;

  vec3 viewCenter = (viewMatrix * vec4(p.xyz, 1.0)).xyz;
  float depth = -viewCenter.z;

  // Circle of confusion in world units: out-of-focus bubbles turn into soft bokeh.
  float coc = clamp(uAperture * abs(depth - uFocus) / max(depth, 0.5) * 0.35, 0.0, 0.4);

  float extent = (r + coc) * 1.12 + 0.002 * depth; // margin for perspective + AA
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = p.xyz + (right * position.x + up * position.y) * extent;

  // Fade in at the bottom / out at the top so recycling is never visible.
  vFade = smoothstep(-uBounds.y - 0.6, -uBounds.y + 0.8, p.y) *
          (1.0 - smoothstep(uBounds.y - 1.2, uBounds.y, p.y));

  vWorldPos = world;
  vCenter = p.xyz;
  vRadius = r;
  vCoC = coc;
  vPop = v.w;
  vSeed = fract(dot(aRef, vec2(12.9898, 78.233)) * 43.7585);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
