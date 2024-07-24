vec3 noise4d(vec4 v ) {

  float f1 = v.z * 15. + v.w * 3.;
  float f2 = v.z * 20. + v.w * 3.;
  float f3 = v.x * 10. + v.y * 10. + v.w * 3.;
  float x = 2. * cos(f1 + sin(3. * f2) + cos(5. * f1)) + sin(0.4 * f1);
  float y = cos(f2 + sin(3. * f1) + cos(5. * f1)) + sin(0.4 * f2); //sin(f1 + v.w + x) + cos(f2 + v.w * 2.3 - x) * 0.2;
  float z = cos(f3 + sin(3. * f3) + cos(5. * f3)) + sin(0.4 * f3); //sin(f1 + v.w + x) + cos(f2 + v.w * 2.3 - x) * 0.2;
  return vec3(x,y,-abs(z));
 
}