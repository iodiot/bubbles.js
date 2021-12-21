uniform float uTime;

void main()	{
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;

    gl_FragColor = vec4(position + velocity * 0.001, 1.0);
}