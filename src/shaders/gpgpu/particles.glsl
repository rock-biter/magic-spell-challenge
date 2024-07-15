uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;

#include ../includes/simplexNoise4d.glsl

void main()
{
    float time = uTime * 0.2;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);
    
    // Dead
    if(particle.a >= 1.0)
    {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz * (0.5 + simplexNoise4d(vec4(base.xyz,time * 3.)) * 0.25 );

        particle.y *= 0.8;
        particle.y += 40.;
        particle.x *= 1.75;
        particle.z += 10.;
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