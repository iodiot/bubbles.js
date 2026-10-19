// Shared by both simulation passes so they agree, texel for texel, on when a
// bubble is recycled (popped, or floated out of the top of the volume).
uniform vec3 uBounds;   // half extents of the bubble volume
uniform float uTime;
uniform float uDelta;

bool needsRespawn(vec4 pos, vec4 vel) {
  return vel.w >= 1.0 || pos.y > uBounds.y + pos.w;
}
