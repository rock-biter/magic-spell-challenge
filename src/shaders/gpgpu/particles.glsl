uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;

uniform mat4 uBindMatrix;
uniform mat4 uBindMatrixInverse;
uniform highp sampler2D uBoneTexture;
uniform highp sampler2D uSkinIndexTexture;
uniform highp sampler2D uSkinWeightTexture;

mat4 getBoneMatrix( const in float i ) {

    int size = textureSize( uBoneTexture, 0 ).x;
    int j = int( i ) * 4;
    int x = j % size;
    int y = j / size;
    vec4 v1 = texelFetch( uBoneTexture, ivec2( x, y ), 0 );
    vec4 v2 = texelFetch( uBoneTexture, ivec2( x + 1, y ), 0 );
    vec4 v3 = texelFetch( uBoneTexture, ivec2( x + 2, y ), 0 );
    vec4 v4 = texelFetch( uBoneTexture, ivec2( x + 3, y ), 0 );

    return mat4( v1, v2, v3, v4 );

}

#include ../includes/simplexNoise4d.glsl

void main()
{
    float time = uTime * 0.2;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);
    vec4 skinIndex = texture(uSkinIndexTexture,uv);
    vec4 skinWeight = texture(uSkinWeightTexture,uv);

    // none matrix
    mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );

    vec4 skinVertex = uBindMatrix * vec4( base.xyz, 1.0 );

    vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;

    base.xyz = ( uBindMatrixInverse * skinned ).xyz;

    
    // Dead
    if(particle.a >= 1.0)
    {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz;
        // particle.xyz = base.xyz * (0.5 + simplexNoise4d(vec4(base.xyz,time * 3.)) * 0.25 );

        // particle.y *= 0.8;
        // particle.y += 40.;
        // particle.x *= 1.75;
        // particle.z += 10.;
    }

    // Alive
    else
    {
        // Strength
        float strength = simplexNoise4d(vec4(base.xyz * 0.2, time + 1.0));
        float influence = (uFlowFieldInfluence - 0.5) * (- 2.0);
        strength = smoothstep(influence, 1.0, strength);

        // Flow field
        vec3 flowField = vec3(
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 3. + 0.0, time * 1.)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1. + 1.0, time * 1.)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 3. + 2.0, time * 1.))
        );
        flowField = normalize(flowField);
        flowField.z = -abs(flowField.z * 10.);
        particle.xyz += flowField * uDeltaTime * uFlowFieldStrength * uFlowFieldInfluence;
        // particle.z += uDeltaTime * 1.;

        // Decay
        particle.a += uDeltaTime * 0.3;
    }
    
    gl_FragColor = particle;
}