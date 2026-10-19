// Per-pixel ray/sphere intersection on each quad: the bubble is shaded as a
// true sphere with a front and a back film surface, each reflecting the HDR
// environment through thin-film interference.

uniform sampler2D uEnv;          // equirectangular HDR
uniform float uEnvIntensity;
uniform float uTime;
uniform float uIntensity;
uniform float uThickTop;         // nm, film drains so the top is thinner
uniform float uThickBottom;
uniform float uSwirl;            // marangoni-like swirling of thickness
uniform float uSaturation;       // artistic boost of the interference colours (1 = physical)

varying vec3 vWorldPos;
varying vec3 vCenter;
varying float vRadius;
varying float vCoC;
varying float vPop;
varying float vSeed;
varying float vFade;

vec3 env(vec3 dir) {
  vec2 uv = vec2(atan(dir.z, dir.x) * 0.15915494 + 0.5, asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  return min(texture2D(uEnv, uv).rgb * uEnvIntensity, vec3(64.0));
}

float filmThickness(vec3 n) {
  // Thickness pattern lives on the bubble surface; it slowly swirls over time.
  vec3 q = n * 1.1 + vec3(vSeed * 31.0, vSeed * 17.0, 0.0);
  float sw = snoise(q + vec3(0.0, uTime * 0.18, uTime * 0.11))
           + 0.35 * snoise(q * 2.1 - vec3(uTime * 0.23, 0.0, uTime * 0.07));
  float drain = smoothstep(-1.0, 1.0, -n.y + 0.25 * sw * uSwirl);
  return mix(uThickTop, uThickBottom, drain) * (1.0 + 0.3 * sw * uSwirl);
}

void main() {
  if (vFade <= 0.001 || vPop >= 1.0) discard;

  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPos - ro);
  float r = vRadius;

  vec3 oc = ro - vCenter;
  float b = dot(oc, rd);
  float dPerp = sqrt(max(dot(oc, oc) - b * b, 0.0));

  // Coverage: hard (anti-aliased) edge when in focus, wide soft edge when not.
  float aa = fwidth(dPerp) * 1.2;
  float soft = vCoC + aa;
  float mask = 1.0 - smoothstep(r - soft, r + soft, dPerp);
  if (mask <= 0.0) discard;
  float energy = r * r / (r * r + vCoC * vCoC * 1.5);

  // Front and back surface points (clamped inside the silhouette for the blur halo).
  vec3 q = ro + rd * (-b);
  vec3 radial = (q - vCenter) / max(dPerp, 1e-5);
  float s = min(dPerp, r * 0.999);
  float hgt = sqrt(r * r - s * s);
  vec3 nFront = normalize(radial * s - rd * hgt);
  vec3 nBack = normalize(radial * s + rd * hgt);

  // Popping: a hole tears open from a random point and races around the sphere.
  float holeF = 1.0, holeB = 1.0, rim = 0.0;
  if (vPop > 0.0) {
    vec3 hd = normalize(vec3(sin(vSeed * 91.0), cos(vSeed * 47.0) * 0.6 + 0.3, 0.8));
    float edge = 1.0 - 2.3 * vPop;
    float dF = dot(nFront, hd), dB = dot(nBack, hd);
    holeF = 1.0 - step(edge, dF);
    holeB = 1.0 - step(edge, dB);
    rim = (1.0 - smoothstep(0.0, 0.12, abs(dF - edge))) * (1.0 - vPop);
  }

  vec3 v = -rd;
  vec3 R1 = thinFilm(dot(nFront, v), filmThickness(nFront)) * holeF;
  vec3 R2 = thinFilm(dot(nBack, rd), filmThickness(nBack)) * holeB;

  vec3 g1 = vec3(dot(R1, vec3(0.3333))), g2 = vec3(dot(R2, vec3(0.3333)));
  R1 = max(mix(g1, R1, uSaturation), 0.0);
  R2 = max(mix(g2, R2, uSaturation), 0.0);

  vec3 col = env(reflect(rd, nFront)) * R1;
  col += env(reflect(rd, -nBack)) * R2 * (1.0 - R1);
  col += rim * env(reflect(rd, nFront)) * 0.6;

  float alpha = dot(R1 + R2 * (1.0 - R1), vec3(0.3333)) + rim * 0.2;

  float k = mask * energy * vFade;
  // Premultiplied output: reflections are added, the background is dimmed by alpha.
  gl_FragColor = vec4(col * uIntensity * k, clamp(alpha * k, 0.0, 1.0));

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
