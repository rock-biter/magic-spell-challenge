uniform float uTime;
uniform float uDeltaTime;
uniform float uSpeed;
uniform float uIntro;
uniform float uLife;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform mat4 uModelMatrix;

uniform mat4 uBindMatrix;
uniform mat4 uBindMatrixInverse;
uniform sampler2D uBoneTexture;
uniform sampler2D uSkinIndexTexture;
uniform sampler2D uSkinWeightTexture;

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
#include ../rotate-mat-3.glsl

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

    base.xyz = ( uModelMatrix * uBindMatrixInverse * skinned ).xyz;

    
    // Dead
    if(particle.a >= 1.0)
    {

        float intro = uIntro;
        float inverseIntro = (1. - intro);
        // mvPosition.y += inverseIntro * 3.;
        base.y -= 2.;
        base.z -= 1.3;
        // base.y += sin(base.z * 3. + uTime) * inverseIntro;

        float angle = (  2. + 2.5 * base.z) * 3.14 * inverseIntro; //smoothstep(0.95,0.,intro);

        base.xyz = rotationMatrix(vec3(0,0,1), angle) * base.xyz;
        base.xyz = rotationMatrix(vec3(0,1,0), angle) * base.xyz;
        base.xyz = rotationMatrix(vec3(1,0,0), -angle) * base.xyz;
        float n = pow(intro,1.5) * (1. + inverseIntro * simplexNoise4d(vec4(base.xyz * 0.1,uTime)) * 3.5);
        base.xyz *= n;
        // float z = base.z;

        base.y += 2. * intro;
        base.z += 1.3 * intro;

        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz;
        particle.x += sin(uTime * 1. + particle.x) * 0.2;
        particle.y += cos(uTime * 1. + particle.y) * 0.2;
        // particle.y += 25.;
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
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1. + 0.0, time * 1.)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1. + 1.0, time * 1.)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1. + 2.0, time * 0.5))
        );
        flowField = normalize(flowField) * 0.5;
        flowField.z = -abs(flowField.z ) * uSpeed;
        particle.xyz += flowField * uDeltaTime * uFlowFieldStrength * uFlowFieldInfluence;
        
        // particle.z += -0.2;
        // particle.z += uDeltaTime * 1.;

        // Decay
        // particle.a += uDeltaTime * 0.3;
        particle.a += uDeltaTime * 0.3 / uLife;
    }
    
    gl_FragColor = particle;
}