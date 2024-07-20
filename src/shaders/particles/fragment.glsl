varying vec3 vColor;
varying float alpha;

void main()
{
    float distanceToCenter = length(gl_PointCoord - 0.5);
    // float pct = 1. - smoothstep(0.001,0.01,distanceToCenter) * 0.5 - smoothstep(0.01,0.04,distanceToCenter) * 0.5;
    if(distanceToCenter > 0.5)
        discard;
    
    gl_FragColor = vec4(vColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}