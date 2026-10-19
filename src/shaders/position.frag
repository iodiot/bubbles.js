// GPGPU pass 2: integrate position, recycle popped / escaped bubbles.
uniform float uMinRadius;
uniform float uMaxRadius;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);

  if (needsRespawn(pos, vel)) {
    vec4 h = hash43(vec3(uv * 4096.0, fract(uTime * 0.0917) * 1000.0));
    float r = mix(uMinRadius, uMaxRadius, pow(h.w, 5.0)); // many small, few big
    gl_FragColor = vec4(
      (h.x * 2.0 - 1.0) * uBounds.x * 0.9,
      -uBounds.y - r - h.y * 1.5,
      (h.z * 2.0 - 1.0) * uBounds.z * 0.9,
      r);
    return;
  }

  if (vel.w <= 0.0) pos.xyz += vel.xyz * uDelta;
  gl_FragColor = pos;
}
