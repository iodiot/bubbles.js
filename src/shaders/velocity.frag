uniform float uTime;
uniform vec2 uMouse;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

const float width = resolution.x;
const float height = resolution.y;

const float PI = 3.141592653589793;
const float PI_2 = PI * 2.0;

float rand( vec2 co ){
    return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
}

vec2 getScreenNDC(vec3 pos) {
    // https://stackoverflow.com/questions/26965787/how-to-get-accurate-fragment-screen-position-like-gl-fragcood-in-vertex-shader
    vec4 clipSpace = projectionMatrix* modelViewMatrix * vec4(pos, 1.);
    vec3 ndc = clipSpace.xyz / clipSpace.w; //perspective divide/normalize
    vec2 viewPortCoord = ndc.xy; //ndc is -1 to 1 in GL. scale for 0 to 1
    return viewPortCoord;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;

	float coolDown = texture2D(uVelocityTexture, uv).w;

	vec2 screenPos = getScreenNDC(position);

	//velocity.xy = normalize(position.xy - uMouse.xy) * normalize(velocity.xy);

	if (length(position) > 1. && coolDown < .9) {
		velocity = 1.1 * reflect(velocity, normalize(position));
		coolDown = 100.;
	}

	if (coolDown > .9) {
		coolDown -= 1.;
	}

    gl_FragColor = vec4(velocity, coolDown);
}