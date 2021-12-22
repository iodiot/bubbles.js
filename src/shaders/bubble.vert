precision highp float;

// Uniforms
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform vec2 uMouse;
uniform sampler2D uPositionTexture;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 aTranslate;
attribute float aRadius;
attribute vec3 aColor;
attribute vec2 aReference;

varying vec2 vUv;
varying vec3 vColor;

vec2 getScreenNDC(vec3 pos) {
    vec4 clipSpace = projectionMatrix* modelViewMatrix * vec4(pos, 1.);
    vec3 ndc = clipSpace.xyz / clipSpace.w; //perspective divide/normalize
    vec2 viewPortCoord = ndc.xy; //ndc is -1 to 1 in GL. scale for 0 to 1
    return viewPortCoord;
}

void main() {
    vec4 texPos = vec4(texture2D(uPositionTexture, aReference).xy, 0., 1.);

    vec4 mvPosition = modelViewMatrix * vec4(texPos.xy, .0, 1.);

    //vec2 bubblePositionOnScreen = getScreenNDC(aTranslate.xyz);

    mvPosition.xyz += position * aRadius;

    vUv = uv;
    vColor = aColor;

    gl_Position = projectionMatrix * mvPosition;
}
