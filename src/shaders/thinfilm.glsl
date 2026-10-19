// Thin-film interference of a soap film (water, n = 1.33) in air.
// Airy reflectance of a single film, s and p polarisation averaged,
// integrated over 8 wavelengths with the analytic CIE 1931 fit from
// Wyman, Sloan & Shirley (JCGT 2013) and converted to linear sRGB.

const float FILM_IOR = 1.33;

float cieGauss(float x, float mu, float s1, float s2) {
  float t = (x - mu) / (x < mu ? s1 : s2);
  return exp(-0.5 * t * t);
}

vec3 cieXYZ(float l) {
  float x = 1.056 * cieGauss(l, 599.8, 37.9, 31.0) + 0.362 * cieGauss(l, 442.0, 16.0, 26.7)
          - 0.065 * cieGauss(l, 501.1, 20.4, 26.2);
  float y = 0.821 * cieGauss(l, 568.8, 46.9, 40.5) + 0.286 * cieGauss(l, 530.9, 16.3, 31.1);
  float z = 1.217 * cieGauss(l, 437.0, 11.8, 36.0) + 0.681 * cieGauss(l, 459.0, 26.0, 13.8);
  return vec3(x, y, z);
}

const mat3 XYZ_TO_SRGB = mat3(
   3.2406, -0.9689,  0.0557,
  -1.5372,  1.8758, -0.2040,
  -0.4986,  0.0415,  1.0570);

float airy(float r, float cosDelta) {
  float r2 = r * r;
  return 2.0 * r2 * (1.0 - cosDelta) / (1.0 + r2 * r2 - 2.0 * r2 * cosDelta);
}

// cosI: cosine of incidence angle, d: film thickness in nanometres.
vec3 thinFilm(float cosI, float d) {
  cosI = clamp(cosI, 1e-3, 1.0);
  float sinT = sqrt(1.0 - cosI * cosI) / FILM_IOR;
  float cosT = sqrt(1.0 - sinT * sinT);
  float rs = (cosI - FILM_IOR * cosT) / (cosI + FILM_IOR * cosT);
  float rp = (FILM_IOR * cosI - cosT) / (FILM_IOR * cosI + cosT);
  float opd = 4.0 * 3.14159265 * FILM_IOR * d * cosT; // phase = opd / lambda

  vec3 xyz = vec3(0.0);
  vec3 white = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float l = 410.0 + float(i) * 40.0;
    float c = cos(opd / l);
    float R = 0.5 * (airy(rs, c) + airy(rp, c));
    vec3 w = cieXYZ(l);
    xyz += R * w;
    white += w;
  }
  vec3 rgb = XYZ_TO_SRGB * xyz;
  vec3 rgbWhite = XYZ_TO_SRGB * white;
  return max(rgb / rgbWhite, 0.0);
}
