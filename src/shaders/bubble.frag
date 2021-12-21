precision highp float;

// Uniforms
uniform sampler2D uMap;

// From vertex shader
varying vec2 vUv;
varying vec3 vColor;

void main() {
    vec4 diffuseColor = texture2D(uMap, vUv);

	gl_FragColor = vec4(vColor, diffuseColor.w);

    if ( diffuseColor.w < 0.5 ) 
        discard;
}
