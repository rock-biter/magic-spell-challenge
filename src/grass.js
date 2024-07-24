import { AdditiveBlending, InstancedMesh, Matrix4, Quaternion } from 'three'
import { Uniform } from 'three'
import { MeshBasicMaterial } from 'three'
import { LineBasicMaterial } from 'three'
import { BufferGeometry, Object3D, Vector3 } from 'three'
import simplexNoise4d from './shaders/includes/simplexNoise4d.glsl'
import simplexNoise3d from './shaders/includes/simplexNoise3d.glsl'
import { MeshStandardMaterial } from 'three'

const linePoints = [
	new Vector3(0, 0, 0),
	new Vector3(0, 0.2, 0),
	new Vector3(0, 0.4, 0),
]
const GEOMETRY = new BufferGeometry().setFromPoints(linePoints)

export default class Grass extends Object3D {
	uniforms

	constructor() {
		super()

		this.geometry = GEOMETRY
		this.material = new MeshStandardMaterial({
			color: 0x70e2ff,
			wireframe: true,
			transparent: true,
			opacity: 1,
			blendEquation: AdditiveBlending,
			depthWrite: false,
			// de,
		})

		const count = window.innerWidth < 768 ? 12000 : 20000
		this.mesh = new InstancedMesh(this.geometry, this.material, count)

		this.add(this.mesh)

		this.initMatrixes()

		this.onBeforeCompile()
	}

	initMatrixes() {
		const matrix = new Matrix4()
		const position = new Vector3()
		const scale = new Vector3(1, 1, 1)
		const quaternion = new Quaternion()
		let angle = 0
		let r = 0
		let arc = 0.3

		for (let i = 0; i < this.mesh.count; i++) {
			// const angleStep = (21 * 2 * Math.PI) / this.mesh.count
			const angleStep = r ? arc / r : 2 * Math.PI
			// const angle = i * angleStep
			angle += angleStep

			r += angleStep * 0.04 //+ (0.002 * i) / this.mesh.count //* (1 + Math.sin(i) * 0.2)

			const x = Math.sin(angle) * (r + Math.sin(i) * 0.5)
			const z = Math.cos(angle) * (r + Math.cos(i) * 0.5)

			scale.y = 1 + Math.random() * 2 + Math.pow(Math.random(), 10) * 2
			// scale.y = 1 + Math.pow(Math.random(), 3) * 2

			position.set(x, 0, z)

			matrix.compose(position, quaternion, scale)

			this.mesh.setMatrixAt(i, matrix)
		}

		this.r = r
	}

	onBeforeCompile() {
		this.material.onBeforeCompile = (shader) => {
			this.uniforms = shader.uniforms

			shader.uniforms.uTime = new Uniform(0)
			shader.uniforms.uSpeed = new Uniform(0)
			shader.uniforms.uIntro = new Uniform(0)
			shader.uniforms.uRadius = new Uniform(this.r)

			let token = '#include <common>'

			// add uniforms to vertex shader
			shader.vertexShader = shader.vertexShader.replace(
				token,
				/*glsl*/ `
        ${token}
        ${simplexNoise4d}
				${simplexNoise3d}

        uniform float uTime;
        uniform float uIntro;
        uniform float uSpeed;
        uniform float uRadius;
        varying vec3 vPosition;
        `
			)

			// add uniforms to fragment shader
			shader.fragmentShader = shader.fragmentShader.replace(
				token,
				/*glsl*/ `
        ${token}
        ${simplexNoise4d}
				${simplexNoise3d}

        uniform float uTime;
        uniform float uIntro;
        uniform float uSpeed;
        uniform float uRadius;
        varying vec3 vPosition;
        `
			)

			token = '#include <project_vertex>'

			shader.vertexShader = shader.vertexShader.replace(
				token,
				/*glsl*/ `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_BATCHING
          mvPosition = batchingMatrix * mvPosition;
        #endif
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif

        float size = sqrt(uRadius * uRadius - mvPosition.x * mvPosition.x) ;

        mvPosition.z -= 24. * (uSpeed);

        mvPosition.z = mod(mvPosition.z + size,size * 2.) - size;
        vec4 wPos = modelMatrix * mvPosition;

        mvPosition.x += simplexNoise4d(vec4(wPos.xyz * 0.1,uTime * 0.3)) * 1.5 * wPos.y;
        // mvPosition.z += simplexNoise4d(vec4(wPos.xyz * 0.2,uTime * 0.5)) * 2. * wPos.y;
        
        vPosition = wPos.xyz;

        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
			)

			token = '#include <opaque_fragment>'

			shader.fragmentShader = shader.fragmentShader.replace(
				token,
				/*glsl */ `

        float len = length(vPosition);
        float waveIntro = max(uIntro * 2. - 1., 0.);
        
        float distFactor = 1. - smoothstep(2.* waveIntro,uRadius * waveIntro,len);
        // distFactor = pow(distFactor,1.);
        float glitter = max(simplexNoise4d(vec4(vPosition * 80.,uTime * 0.5)) ,0.) ;
        float noise = simplexNoise4d(vec4(vPosition * 0.1,uTime * 0.1));
        // noise = pow(noise,3.);
        float introFactor = 0.;
        if(uIntro != 1.) {

          float distanceNoise = simplexNoise3d(vPosition * 0.2) * 2.;
          float waveRadius = (uRadius ) * waveIntro + 2. * waveIntro;
          float inWave = 1. - smoothstep(waveRadius,waveRadius - 8. * waveIntro,len + distanceNoise);
          float outWave = 1. - smoothstep(waveRadius,waveRadius + 1. * waveIntro,len + distanceNoise);
          
          introFactor += inWave * outWave * smoothstep(uRadius,0.,waveRadius);
					introFactor = pow(introFactor,3.) * 5.;
        }

        noise = noise * 0.5 + 0.5;

        // noise = pow(noise,2.);
        // diffuseColor.a *= simplexNoise4d(vec4(vPosition * 0.1,uTime * 0.5)) * 0.3 + 0.5 * simplexNoise4d(vec4(vPosition * 20.,uTime * 0.5)) * 0.2;
        // diffuseColor.a *= 0.7;
        // diffuseColor.a = noise * glitter * distFactor * introFactor;
        diffuseColor.a = max( introFactor, noise * glitter * distFactor );
        ${token}

        
        `
			)

			// console.log(shader.fragmentShader)
		}
	}
}
