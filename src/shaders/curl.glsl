// Divergence-free "curl noise" velocity field (Bridson et al. 2007):
// curl of a vector potential built from three decorrelated simplex fields.
vec3 potential(vec3 p) {
  return vec3(
    snoise(p),
    snoise(p + vec3(31.416, -47.853, 12.793)),
    snoise(p + vec3(-233.145, -113.408, -185.31))
  );
}

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 px0 = potential(p - dx), px1 = potential(p + dx);
  vec3 py0 = potential(p - dy), py1 = potential(p + dy);
  vec3 pz0 = potential(p - dz), pz1 = potential(p + dz);
  float x = (py1.z - py0.z) - (pz1.y - pz0.y);
  float y = (pz1.x - pz0.x) - (px1.z - px0.z);
  float z = (px1.y - px0.y) - (py1.x - py0.x);
  return vec3(x, y, z) / (2.0 * e);
}
