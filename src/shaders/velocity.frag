// GPGPU pass 1: integrate velocity.
// textureVelocity.xyz = velocity, .w = pop progress (0 = intact, (0,1) = popping)
// texturePosition.xyz = position, .w = radius
uniform float uRise;        // buoyancy
uniform float uFlow;        // curl-noise flow strength
uniform float uFlowScale;   // curl-noise spatial frequency
uniform float uDrag;        // how quickly bubbles follow the air flow
uniform float uPopRate;     // spontaneous pops per bubble per second
uniform vec3 uRayOrigin;    // pointer ray (world space)
uniform vec3 uRayDir;
uniform float uPointer;     // 1 when the pointer is over the canvas
uniform float uWindRadius;
uniform float uWindForce;
uniform float uClick;       // 1 on the frame the user clicked
uniform float uPopRadius;
uniform float uBurst;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  float r = pos.w;

  if (needsRespawn(pos, vel)) {
    gl_FragColor = vec4(0.0, uRise * 0.5, 0.0, 0.0);
    return;
  }

  float pop = vel.w;
  if (pop > 0.0) {
    // Popping: the film tears open in ~0.15 s; the bubble just drifts meanwhile.
    gl_FragColor = vec4(vel.xyz * 0.95, pop + uDelta / 0.15);
    return;
  }

  // Air flow: rising, swirling, divergence-free.
  vec3 q = pos.xyz * uFlowScale + vec3(0.0, -uTime * 0.12, uTime * 0.05);
  vec3 target = curlNoise(q) * uFlow;
  // Bigger bubbles carry more buoyant air relative to drag and rise faster.
  target.y += uRise * (0.55 + 2.2 * r);

  // Soft side walls keep the swarm framed.
  vec3 edge = smoothstep(uBounds * 0.75, uBounds * 1.05, abs(pos.xyz)) * sign(pos.xyz);
  target.xz -= edge.xz * 1.6;

  vel.xyz += (target - vel.xyz) * (1.0 - exp(-uDrag * uDelta));

  // Pointer: wind that blows bubbles away from the cursor ray, click pops + burst.
  vec3 toP = pos.xyz - uRayOrigin;
  float t = dot(toP, uRayDir);
  vec3 off = toP - uRayDir * t;
  float d = length(off);
  vec3 away = off / max(d, 1e-4);
  if (uPointer > 0.5 && t > 0.0) {
    float w = exp(-d * d / (uWindRadius * uWindRadius));
    vel.xyz += away * w * uWindForce * uDelta;
  }
  if (uClick > 0.5 && t > 0.0) {
    if (d < uPopRadius + r) {
      pop = 1e-4;
    } else {
      float w = exp(-d * d / (4.0 * uPopRadius * uPopRadius));
      vel.xyz += (away + vec3(0.0, 0.3, 0.0)) * w * uBurst;
    }
  }

  // Bubbles don't live forever: random spontaneous pops.
  float h = hash13(vec3(uv * 4096.0, fract(uTime * 0.1371) * 1000.0));
  if (h < uPopRate * uDelta) pop = 1e-4;

  vel.xyz = clamp(vel.xyz, vec3(-8.0), vec3(8.0));
  gl_FragColor = vec4(vel.xyz, pop);
}
