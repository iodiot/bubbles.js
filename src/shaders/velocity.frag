uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uShock;
uniform float uAspect;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

const float width = resolution.x;
const float height = resolution.y;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;

    // Add shock wave when user clicks the mouse
    if (uShock.z > 1.) {
        vec2 shockPos = uShock.xy * 1.25;

        shockPos.x *= uAspect;

        float dist = distance(position.xy, shockPos.xy);
        vec2 dir = normalize(position.xy - shockPos.xy);

        velocity.xy += dir * (1. / dist);
    }

    // Force bubbles to push away from each other
    vec2 selfPosition = texture2D(uPositionTexture, uv).xy;

    vec2 boost = vec2(0, 0);

    for (float y = 0.0; y < height; y++) {
        for (float x = 0.0; x < width; x++)  {
            vec2 ref = vec2(x + 0.5, y + 0.5) / resolution.xy;
            vec2 otherPosition = texture2D(uPositionTexture, ref).xy;

            vec2 dir = (otherPosition - selfPosition);
            float dist = length(dir);

            if (dist < 0.0001) continue;

            if (dist < 0.1) {
                boost += (dir) * (1. / dist) * 5.;
            }
        }
    }

    velocity.xy -= (boost) * 0.005;
    velocity = clamp(velocity, -5.0, 5.0);

    // Reflect the bubbles if they are near the edge of the big circle
    float coolDown = texture2D(uVelocityTexture, uv).w;

	if (length(position) > 1. && coolDown < .9) {
		velocity = 1. * reflect(velocity, normalize(position));
		coolDown = 10.;
	}

	if (coolDown > .9) {
		coolDown -= 1.;
	}

    gl_FragColor = vec4(velocity, coolDown);
}