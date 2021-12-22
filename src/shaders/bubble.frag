precision highp float;

// Uniforms
uniform sampler2D uMap;

// From vertex shader
varying vec2 vUv;
varying vec3 vColor;

void main() {
    vec4 texColor = texture2D(uMap, vUv);

	gl_FragColor = texColor * vec4(vColor, texColor.w);

    if (texColor.w < 0.5) 
        discard;
}
