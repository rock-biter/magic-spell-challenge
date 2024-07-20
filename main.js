import './style.css'
import * as THREE from 'three'
// __controls_import__
// __gui_import__

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as dat from 'lil-gui'
import {
	GLTFLoader,
	GPUComputationRenderer,
	ShaderPass,
} from 'three/examples/jsm/Addons.js'
import simplexNoise4D from './src/shaders/simplex-noise-4d.glsl'
import rotateMat3 from './src/shaders/rotate-mat-3.glsl'
import particlesVertexShader from './src/shaders/particles/vertex.glsl'
import particlesFragmentShader from './src/shaders/particles/fragment.glsl'
import gpgpuParticlesShader from './src/shaders/gpgpu/particles.glsl'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import Stats from 'three/addons/libs/stats.module.js'
import { Matrix4 } from 'three'
import { LoopOnce } from 'three'
import gsap from 'gsap'
import { Vector3 } from 'three'
import { AdditiveBlending } from 'three'

const stats = new Stats()
document.body.appendChild(stats.dom)

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new GLTFLoader(loadingManager)

const deer = {
	model: null,
	material: null,
	uniforms: null,
	animations: {},
}

const debugObject = {
	threshold: 0.33,
	strength: 0.4,
	radius: 0,
	exposure: 1.25,
	intro: 1,
}

gltfLoader.load('/3d-models/deer/scene.gltf', (gltf) => {
	deer.model = gltf.scene
	deer.model.scale.setScalar(0.075)
	scene.add(deer.model)

	const matrix = new Matrix4()

	deer.model.traverse((el) => {
		if (el instanceof THREE.Mesh) {
			// el.material = new THREE.MeshStandardMaterial({
			// 	color: new THREE.Color().setHSL(0.5, 1, 1),

			// })
			const mat = el.material
			deer.material = mat
			deer.mesh = el
			console.log(deer.mesh, gltf.scene)

			patronum(mat)

			createGPGPUParticles({ mesh: el })
		}
	})

	deer.matrix = matrix
	console.log('matrix', matrix)

	deer.mixer = new THREE.AnimationMixer(gltf.scene)
	console.log(gltf.animations)

	const animations = {}
	deer.animations = animations

	animations.runJump = deer.mixer.clipAction(gltf.animations[98])
	// runJump.setLoop(false)
	animations.runFront = deer.mixer.clipAction(gltf.animations[43])

	animations.idle2 = deer.mixer.clipAction(gltf.animations[19])
	animations.idle4 = deer.mixer
		.clipAction(gltf.animations[21])
		.setLoop(LoopOnce, 1)

	// deer.animations.runFront.play()
	// deer.animations.runFront.clampWhenFinished = true
	// deer.animations.runJump.clampWhenFinished = true

	// jump

	animations.sleepLoop = deer.mixer.clipAction(gltf.animations[40])
	animations.sleepEnd = deer.mixer
		.clipAction(gltf.animations[39])
		.setLoop(LoopOnce, 1)
	animations.lieLoop = deer.mixer
		.clipAction(gltf.animations[37])
		.setLoop(LoopOnce, 1)
	animations.lieLoop2 = deer.mixer
		.clipAction(gltf.animations[38])
		.setLoop(LoopOnce, 1)
	animations.lieEnd = deer.mixer
		.clipAction(gltf.animations[36])
		.setLoop(LoopOnce, 1)

	animations.sleepEnd.clampWhenFinished = true
	animations.lieLoop.clampWhenFinished = true
	animations.lieLoop2.clampWhenFinished = true
	animations.lieEnd.clampWhenFinished = true
	animations.idle4.clampWhenFinished = true

	// deer.animations.jumpStart = deer.mixer
	// 	.clipAction(gltf.animations[32])
	// 	.setLoop(THREE.LoopOnce, 1)
	// deer.animations.jumpUp = deer.mixer
	// 	.clipAction(gltf.animations[35])
	// 	.setLoop(LoopOnce, 1)
	// deer.animations.jumpHoriz = deer.mixer
	// 	.clipAction(gltf.animations[31])
	// 	.setLoop(LoopOnce, 1)
	// deer.animations.jumpDown = deer.mixer
	// 	.clipAction(gltf.animations[25])
	// 	.setLoop(LoopOnce, 1)
	// deer.animations.jumpEnd = deer.mixer
	// 	.clipAction(gltf.animations[28])
	// 	.setLoop(LoopOnce, 1)

	// deer.animations.jumpStart.play()
	// deer.animations.jumpUp.play()

	// deer.animations.jumpHoriz.play()
	// deer.animations.jumpDown.play()
	// deer.animations.jumpEnd.play()

	let action = deer.animations.sleepLoop

	action.play()

	// setInterval(() => {
	// 	if (action === deer.animations.runFront) {
	// 		action.crossFadeTo(deer.animations.runJump, 0.25, true)
	// 		action = deer.animations.runJump
	// 		// deer.animations.runJump.reset()
	// 	} else {
	// 		action.crossFadeTo(deer.animations.runFront, 0.25, true)
	// 		action = deer.animations.runFront
	// 		// deer.animations.runFront.reset()
	// 	}
	// 	action.reset()
	// 	action.play()
	// }, 5000)

	window.addEventListener(
		'click',
		() => {
			action.crossFadeTo(animations.sleepEnd, 0.5, true)
			animations.sleepEnd.play()
			gsap.to(gpgpu.particlesVariable.material.uniforms.uLife, {
				value: 0.5,
				duration: 0.5,
			})
		},
		{ once: true }
	)

	deer.mixer.addEventListener('finished', (e) => {
		switch (e.action) {
			case animations.sleepEnd:
				animations.sleepEnd.crossFadeTo(animations.lieLoop, 0.5, true)
				animations.lieLoop.play()

				gsap.to(gpgpu.particlesVariable.material.uniforms.uLife, {
					value: 0.3,
					duration: 0.5,
				})

				break
			case animations.lieLoop:
				animations.lieLoop.crossFadeTo(animations.lieLoop2, 0.5, true)
				animations.lieLoop2.play()

				break
			case animations.lieLoop2:
				animations.lieLoop2.crossFadeTo(animations.lieEnd, 0.5, true)
				animations.lieEnd.play()

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, {
					value: 5,
					duration: 0.5,
				})
				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, {
					value: 1,
					duration: 0.5,
				})
				break
			case animations.lieEnd:
				animations.lieEnd.crossFadeTo(animations.idle4, 0.5, true)
				animations.idle4.play()

				gsap.to(gpgpu.particlesVariable.material.uniforms.uLife, {
					value: 2,
					duration: 0.5,
				})

				// gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, {
				// 	value: 15,
				// 	duration: 1,
				// })

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, {
					value: 1.8,
					duration: 0.5,
				})

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, {
					value: 0.2,
					duration: 0.5,
				})

				break
			case animations.idle4:
				animations.idle4.crossFadeTo(animations.runFront, 0.5, true)
				animations.runFront.play()

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, {
					value: 2,
					duration: 2.5,
				})

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, {
					value: 7.9,
					duration: 2.5,
				})

				gsap.to(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, {
					value: 0.04,
					duration: 2.5,
				})

				gsap.to(gpgpu.particlesVariable.material.uniforms.uSpeed, {
					value: 6,
					duration: 3,
				})

				gsap.to(gpgpu.particlesVariable.material.uniforms.uLife, {
					value: 1,
					duration: 2,
				})

				gsap.to(particles.material.uniforms.uSize, {
					value: 0.058,
					// value: 1.3,
					duration: 2,
				})
				break
		}
	})
	// 	console.log('finished', e)

	// 	const animName = e.action._clip.name

	// 	console.log(action)

	// 	if (animName === action._clip.name) {
	// 		action.reset()
	// 		action.play()
	// 	} else {
	// 		action.reset()
	// 		action.play()
	// 		action.crossFadeFrom(e.action, 0.5, true)
	// 	}

	// 	// switch (animName) {
	// 	// 	case 'Arm_Deer|Jump_start_IP':
	// 	// 		deer.animations.jumpUp.clampWhenFinished = true
	// 	// 		deer.animations.jumpUp.play()
	// 	// 		deer.animations.jumpDown.play()
	// 	// 		deer.animations.jumpDown.crossFadeFrom(
	// 	// 			deer.animations.jumpUp,
	// 	// 			0.3,
	// 	// 			true
	// 	// 		)

	// 	// 		// // deer.animations.jumpEnd.play()
	// 	// 		deer.animations.jumpDown.clampWhenFinished = true

	// 	// 	case 'Arm_Deer|Jump_down_low':
	// 	// 		deer.animations.jumpEnd.play()
	// 	// 		break
	// 	// }
	// })

	// setTimeout(() => {
	// 	console.log('cross fade to run')
	// 	// deer.animations.runJum.crossFadeTo(deer.animations.runFront, 0.5,true)
	// 	// deer.animations.runFront.time = 0
	// 	// deer.animations.runFront.enabled = true
	// 	// deer.animations.runFront.setEffectiveTimeScale(1)
	// 	// deer.animations.runFront.setEffectiveWeight(1)
	// 	// deer.animations.runFront.crossFadeFrom(deer.animations.runJum, 0.5, true)
	// 	// deer.animations.runFront.play()

	// 	// deer.animations.idle2.play()
	// }, 3000)

	// runJump.play()

	gpgpu.particlesVariable.material.uniforms.uModelMatrix.value =
		deer.mesh.matrixWorld
	// console.log(deer.model, gltf)
})

const gpgpu = {}
const particles = {}

function createGPGPUParticles({ mesh }) {
	// geometry
	const geometry = mesh.geometry
	const count = geometry.getAttribute('position').count

	// console.log(geometry)

	gpgpu.size = Math.ceil(Math.sqrt(count))
	gpgpu.computation = new GPUComputationRenderer(
		gpgpu.size,
		gpgpu.size,
		renderer
	)

	// Base particles
	const baseParticlesTexture = gpgpu.computation.createTexture()
	const skinIndexTexture = gpgpu.computation.createTexture()
	const skinWeightTexture = gpgpu.computation.createTexture()
	// const boneTexture = gpgpu.computation.createTexture()

	for (let i = 0; i < count; i++) {
		const i3 = i * 3
		const i4 = i * 4

		// Position based on geometry
		baseParticlesTexture.image.data[i4 + 0] =
			geometry.attributes.position.array[i3 + 0]
		baseParticlesTexture.image.data[i4 + 1] =
			geometry.attributes.position.array[i3 + 1]
		baseParticlesTexture.image.data[i4 + 2] =
			geometry.attributes.position.array[i3 + 2]
		baseParticlesTexture.image.data[i4 + 3] = 1 + Math.random()

		skinIndexTexture.image.data[i4 + 0] =
			geometry.attributes.skinIndex.array[i4 + 0]
		skinIndexTexture.image.data[i4 + 1] =
			geometry.attributes.skinIndex.array[i4 + 1]
		skinIndexTexture.image.data[i4 + 2] =
			geometry.attributes.skinIndex.array[i4 + 2]
		skinIndexTexture.image.data[i4 + 3] =
			geometry.attributes.skinIndex.array[i4 + 3]

		skinWeightTexture.image.data[i4 + 0] =
			geometry.attributes.skinWeight.array[i4 + 0]
		skinWeightTexture.image.data[i4 + 1] =
			geometry.attributes.skinWeight.array[i4 + 1]
		skinWeightTexture.image.data[i4 + 2] =
			geometry.attributes.skinWeight.array[i4 + 2]
		skinWeightTexture.image.data[i4 + 3] =
			geometry.attributes.skinWeight.array[i4 + 3]
	}

	// Particles variable
	gpgpu.particlesVariable = gpgpu.computation.addVariable(
		'uParticles',
		gpgpuParticlesShader,
		baseParticlesTexture
	)
	gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [
		gpgpu.particlesVariable,
	])

	// Uniforms
	gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0)
	gpgpu.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0)
	gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(
		baseParticlesTexture
	)

	// add skinned uniform
	gpgpu.particlesVariable.material.uniforms.uBindMatrix = new THREE.Uniform(
		mesh.bindMatrix
	)
	gpgpu.particlesVariable.material.uniforms.uBindMatrixInverse =
		new THREE.Uniform(mesh.bindMatrixInverse)

	gpgpu.particlesVariable.material.uniforms.uSkinIndexTexture =
		new THREE.Uniform(skinIndexTexture)

	gpgpu.particlesVariable.material.uniforms.uSkinWeightTexture =
		new THREE.Uniform(skinWeightTexture)

	gpgpu.particlesVariable.material.uniforms.uBoneTexture = new THREE.Uniform()
	gpgpu.particlesVariable.material.uniforms.uModelMatrix = new THREE.Uniform()
	gpgpu.particlesVariable.material.uniforms.uSpeed = new THREE.Uniform(0)

	// add uniforms params
	gpgpu.particlesVariable.material.uniforms.uIntro = new THREE.Uniform(0) //2
	gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
		new THREE.Uniform(0.3) //2
	gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
		new THREE.Uniform(2.2) //7.9
	gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
		new THREE.Uniform(2) //0.04
	gpgpu.particlesVariable.material.uniforms.uLife = new THREE.Uniform(3) //0.04

	// Init
	gpgpu.computation.init()

	// Debug Particles
	// gpgpu.debug = new THREE.Mesh(
	// 	new THREE.PlaneGeometry(3, 3),
	// 	new THREE.MeshBasicMaterial({
	// 		map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable)
	// 			.texture,
	// 	})
	// )
	// gpgpu.debug.position.x = 3
	// gpgpu.debug.visible = false
	// scene.add(gpgpu.debug)

	// Debug Bone
	gpgpu.debug = new THREE.Mesh(
		new THREE.PlaneGeometry(3, 3),
		new THREE.MeshBasicMaterial({
			map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable)
				.texture,
		})
	)
	gpgpu.debug.position.x = 3
	gpgpu.debug.visible = false
	scene.add(gpgpu.debug)

	// particles
	// Geometry
	const particlesUvArray = new Float32Array(count * 2)
	const sizesArray = new Float32Array(count)

	for (let y = 0; y < gpgpu.size; y++) {
		for (let x = 0; x < gpgpu.size; x++) {
			const i = y * gpgpu.size + x
			const i2 = i * 2

			// UV
			const uvX = (x + 0.5) / gpgpu.size
			const uvY = (y + 0.5) / gpgpu.size

			particlesUvArray[i2 + 0] = uvX
			particlesUvArray[i2 + 1] = uvY

			// Size
			sizesArray[i] = Math.random()
		}
	}

	particles.geometry = new THREE.BufferGeometry()
	particles.geometry.setDrawRange(0, count)
	particles.geometry.setAttribute(
		'aParticlesUv',
		new THREE.BufferAttribute(particlesUvArray, 2)
	)
	// particles.geometry.setAttribute('aColor', geometry.attributes.color)
	particles.geometry.setAttribute(
		'aSize',
		new THREE.BufferAttribute(sizesArray, 1)
	)

	// Material
	particles.material = new THREE.ShaderMaterial({
		vertexShader: particlesVertexShader,
		fragmentShader: particlesFragmentShader,
		transparent: true,
		// blending: AdditiveBlending,
		depthWrite: false,
		uniforms: {
			uSize: new THREE.Uniform(0.04),
			// uSize: new THREE.Uniform(0.0),
			uIntro: new THREE.Uniform(0),
			uResolution: new THREE.Uniform(
				new THREE.Vector2(
					sizes.width * sizes.pixelRatio,
					sizes.height * sizes.pixelRatio
				)
			),
			uParticlesTexture: new THREE.Uniform(),
			uColor: new THREE.Uniform(new THREE.Color(0x70e2ff)),
		},
	})

	// Points
	particles.points = new THREE.Points(particles.geometry, particles.material)
	// particles.points.scale.setScalar(0.075)
	particles.points.frustumCulled = false
	scene.add(particles.points)

	/**
	 * Tweaks
	 */
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uSpeed, 'value')
		.min(-10)
		.max(10)
		.step(0.01)
		.name('uSpeed')
	gui
		.add(particles.material.uniforms.uSize, 'value')
		.min(0)
		.max(10)
		.step(0.001)
		.name('uSize')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, 'value')
		.min(0)
		.max(3)
		.step(0.001)
		.name('uFlowfieldInfluence')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, 'value')
		.min(0)
		.max(20)
		.step(0.001)
		.name('uFlowfieldStrength')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, 'value')
		.min(0)
		.max(3)
		.step(0.001)
		.name('uFlowfieldFrequency')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uLife, 'value')
		.min(0)
		.max(10)
		.step(0.01)
		.name('uLife')
}

/**
 *
 * @param {THREE.MeshStandardMaterial} material
 */
function patronum(material) {
	console.log(material)

	material.depthWrite = false
	material.transparent = true
	// material.opacity = 0.5
	material.side = THREE.DoubleSide
	material.blending = THREE.AdditiveBlending
	// material.blending = THREE.AdditiveBlending
	// material.roughness = 0.5
	// material.roughnessMap = null
	// material.metalnessMap = null
	// console.log(material.roughnessMap, material.metalnessMap)

	material.onBeforeCompile = (shader) => {
		console.log(shader.vertexShader)
		// console.log(`
		// 	------
		// 	`)
		// console.log(shader.fragmentShader)
		deer.uniforms = shader.uniforms

		shader.uniforms.uCamera = new THREE.Uniform(new THREE.Vector3(0, 0, 0))
		shader.uniforms.uColor = new THREE.Uniform(new THREE.Color(0x70e2ff))
		shader.uniforms.uTime = new THREE.Uniform(0)
		shader.uniforms.uIntro = new THREE.Uniform(configs.intro)

		// window.addEventListener('click', () => {
		gsap.to(deer.uniforms.uIntro, {
			value: 1,
			duration: 1.5,
			ease: 'power2.inOut',
		})
		gsap.to(gpgpu.particlesVariable.material.uniforms.uIntro, {
			value: 1,
			duration: 1.5,
			ease: 'power2.inOut',
		})

		// gsap.to(gpgpu.particlesVariable.material.uniforms.uLife, {
		// 	value: 3,
		// 	duration: 0.5,
		// 	ease: 'power2.inOut',
		// 	delay: 1,
		// })

		// gsap.to(particles.material.uniforms.uSize, {
		// 	value: 0.2,
		// 	duration: 1,
		// 	ease: 'power2.inOut',
		// 	delay: 1.2,
		// })
		// })

		let token = '#include <common>'

		shader.vertexShader = shader.vertexShader.replace(
			token,
			/*glsl*/ `
			#include <common>
			${simplexNoise4D}
			${rotateMat3}
			uniform vec3 uCamera;
			uniform vec3 uColor;			
			uniform float uTime;
			uniform float uIntro;
			varying vec3 vPosition;			
			varying vec3 vBasePosition;
			varying vec3 vN;
			
			`
		)

		shader.fragmentShader = shader.fragmentShader.replace(
			token,
			/*glsl*/ `
			#include <common>
			${simplexNoise4D}
			uniform vec3 uCamera;
			uniform vec3 uColor;			
			uniform float uTime;
			uniform float uIntro;
			varying vec3 vPosition;			
			varying vec3 vBasePosition;
			varying vec3 vN;
			
			`
		)

		token = '#include <defaultnormal_vertex>'

		shader.vertexShader = shader.vertexShader.replace(
			token,
			/*glsl*/ `
			// vN = normalMatrix * objectNormal;
			vN = vec4(modelMatrix * vec4(objectNormal,0.)).xyz;
			#include <defaultnormal_vertex>
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
			
			mvPosition = modelMatrix * mvPosition;
			// vPosition = mvPosition.xyz;
			

			float inverseIntro = (1. - uIntro);
			// mvPosition.y += inverseIntro * 3.;
			mvPosition.y -= 2.;
			mvPosition.z -= 1.3;
			// mvPosition.y += sin(mvPosition.z * 3. + uTime) * inverseIntro;

			float angle = (  2. + 2.5 * mvPosition.z) * 3.14 * inverseIntro; //smoothstep(0.95,0.,uIntro);

			mvPosition.xyz = rotationMatrix(vec3(0,0,1), angle) * mvPosition.xyz;
			mvPosition.xyz = rotationMatrix(vec3(0,1,0), angle) * mvPosition.xyz;
			mvPosition.xyz = rotationMatrix(vec3(1,0,0), -angle) * mvPosition.xyz;
			float n = pow(uIntro,1.5) * (1. + inverseIntro * snoise(vec4(mvPosition.xyz * 0.1,uTime)) * 3.5);
			mvPosition.xyz *= n;
			// float z = mvPosition.z;

			mvPosition.y += 2. * uIntro;
			mvPosition.z += 1.3 * uIntro;


			

			vPosition = mvPosition.xyz;
			vBasePosition = vec4(modelMatrix * vec4(position,1.)).xyz;

			gl_Position = projectionMatrix * viewMatrix * mvPosition;
			
			`
		)

		token = '#include <color_fragment>'
		shader.fragmentShader = shader.fragmentShader.replace(
			token,
			/*glsl*/ `
			#include <color_fragment>
			
			// grayscale
			// reference: https://www.shadertoy.com/view/4tlyDN
			float gray = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
			float gammaGray = sqrt(gray);
			diffuseColor.rgb = vec3(gammaGray);
			// diffuseColor.rgb = mix(diffuseColor.rgb,uColor,0.5);
			diffuseColor.rgb = diffuseColor.rgb*uColor;

			// Fresnel
    	vec3 viewDirection = normalize(vPosition - cameraPosition);
			// vec3 n = vec4(viewMatrix * vec4(vNormal,0.)).xyz;
			// vec3 n = normalize(vNormal);
			vec3 n = normalize(vN);
			// // if(gl_FrontFacing)
			float dir = gl_FrontFacing ? 1.0 : - 1.0;
     	// n *= dir;
			float fresnel = 1. - abs(dot(viewDirection, n));
			fresnel = pow(fresnel,1.3) + 0.05;
			// fresnel *= 0.5;
			float falloff = smoothstep(0.98, 0., fresnel);
			float patronum = fresnel * falloff;

			float text = (0.7 + snoise(vec4(vBasePosition * 1.,uTime * 5.)) * 0.3);
			float textBig = smoothstep(-1., 1., snoise(vec4(vBasePosition * 0.005,uTime * .5)));

			textBig = pow(textBig,1.) + 0.3;

			diffuseColor.a = patronum * text * textBig * smoothstep(0.05,0.7,pow(uIntro,2.));

			diffuseColor *= 2.5;
			
			
			`
		)

		// token = `#include <opaque_fragment>`
		// shader.fragmentShader = shader.fragmentShader.replace(
		// 	token,
		// 	/*glsl*/ `

		// 	`
		// )
	}
}

/**
 * Debug
 */
// __gui__
const configs = {
	example: 5,
	baseColor: 0x70e2ff,
	intro: 0,
}
const gui = new dat.GUI()
gui
	.add(configs, 'intro', 0, 1, 0.01)
	.onChange((val) => (deer.uniforms.uIntro.value = val))

gui.addColor(configs, 'baseColor').onChange((val) => {
	console.log(val)
	deer.uniforms?.uColor?.value?.set(val)
})

/**
 * Scene
 */
const scene = new THREE.Scene()
// scene.background = new THREE.Color(0xdedede)

// __box__
/**
 * BOX
 */
// const material = new THREE.MeshNormalMaterial()
// const material = new THREE.MeshStandardMaterial({ color: 'coral' })
// const geometry = new THREE.BoxGeometry(1, 1, 1)
// const mesh = new THREE.Mesh(geometry, material)
// mesh.position.y += 0.5
// scene.add(mesh)

// __floor__
/**
 * Plane
 */
// const groundMaterial = new THREE.MeshStandardMaterial({ color: 'lightgray' })
// const groundGeometry = new THREE.PlaneGeometry(10, 10)
// groundGeometry.rotateX(-Math.PI * 0.5)
// const ground = new THREE.Mesh(groundGeometry, groundMaterial)
// scene.add(ground)

/**
 * render sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelRatio: Math.min(window.devicePixelRatio, 2),
}

/**
 * Camera
 */
const fov = 60
const camera = new THREE.PerspectiveCamera(
	fov,
	sizes.width / sizes.height,
	0.01,
	5000
)
camera.position.set(12, 12, 17)
camera.lookAt(new THREE.Vector3(0, 4, 0))

/**
 * Show the axes of coordinates system
 */
// __helper_axes__
const axesHelper = new THREE.AxesHelper(1)
scene.add(axesHelper)

/**
 * renderer
 */
const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	// logarithmicDepthBuffer: true,
})
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = Math.pow(debugObject.exposure, 4.0)
document.body.appendChild(renderer.domElement)

/**
 * OrbitControls
 */
// __controls__
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 4, 0)
controls.enableDamping = true
// controls.autoRotate = true
controls.autoRotateSpeed = 3

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 3.5)
const directionalLight = new THREE.DirectionalLight(0xffffff, 4.5)
directionalLight.position.set(3, 10, 7)
scene.add(ambientLight)

/**
 * Three js Clock
 */
// __clock__
const clock = new THREE.Clock()
let prevTime = 0

// BLOOM effect
const renderScene = new RenderPass(scene, camera)

const bloomPass = new UnrealBloomPass(
	new THREE.Vector2(window.innerWidth, window.innerHeight),
	1.5,
	0.4,
	0.85
)

bloomPass.threshold = debugObject.threshold
bloomPass.strength = debugObject.strength
bloomPass.radius = debugObject.radius

const outputPass = new OutputPass()

const composer = new EffectComposer(
	renderer,
	new THREE.WebGLRenderTarget(
		sizes.width * sizes.pixelRatio,
		sizes.height * sizes.pixelRatio,
		{ type: THREE.HalfFloatType, samples: 1 }
	)
)

composer.addPass(renderScene)
composer.addPass(bloomPass) // this create a glitch (why??)
composer.addPass(outputPass)

// const effect1 = new ShaderPass(DotScreenShader)
// effect1.uniforms['scale'].value = 4
// composer.addPass(effect1)

const bloomFolder = gui.addFolder('bloom')

bloomFolder.add(debugObject, 'threshold', 0.0, 1.0).onChange(function (value) {
	bloomPass.threshold = Number(value)
})

bloomFolder.add(debugObject, 'strength', 0.0, 3.0).onChange(function (value) {
	bloomPass.strength = Number(value)
})

bloomFolder
	.add(debugObject, 'radius', 0.0, 1.0)
	.step(0.01)
	.onChange(function (value) {
		bloomPass.radius = Number(value)
	})

const toneMappingFolder = gui.addFolder('tone mapping')

toneMappingFolder
	.add(debugObject, 'exposure', 0.1, 2)
	.onChange(function (value) {
		renderer.toneMappingExposure = Math.pow(value, 4.0)
		// tic()
	})

handleResize()
/**
 * frame loop
 */
function tic() {
	/**
	 * tempo trascorso dal frame precedente
	 */
	// const deltaTime = clock.getDelta()
	/**
	 * tempo totale trascorso dall'inizio
	 */
	const time = clock.getElapsedTime()
	const deltaTime = time - prevTime
	prevTime = time

	// __controls_update__
	controls.update()

	if (deer.mixer) {
		// deer.model.rotation.y += deltaTime
		// console.log(deer.mixer._actions)
		deer.mixer.update(deltaTime)
		// console.log(deer.mesh)
		gpgpu.particlesVariable.material.uniforms.uBoneTexture.value =
			deer.mesh.skeleton.boneTexture

		// console.log('boneT', deer.mesh.skeleton.boneTexture)
		// if (deer.mesh.skeleton.boneTexture) {
		// 	deer.mesh.skeleton.boneTexture
		// }
	}

	if (deer.uniforms) {
		deer.uniforms.uTime.value = time
	}

	// GPGPU Update
	if (gpgpu.computation) {
		gpgpu.particlesVariable.material.uniforms.uTime.value = time
		gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime
		gpgpu.computation.compute()

		particles.material.uniforms.uParticlesTexture.value =
			gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
	}

	stats.update()

	// renderer.render(scene, camera)
	composer.render()

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight
	sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

	camera.aspect = sizes.width / sizes.height

	// camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)
	composer.setSize(sizes.width, sizes.height)

	// Materials
	if (particles.material) {
		particles.material.uniforms.uResolution.value.set(
			sizes.width * sizes.pixelRatio,
			sizes.height * sizes.pixelRatio
		)
	}

	renderer.setPixelRatio(sizes.pixelRatio)
	composer.setPixelRatio(sizes.pixelRatio)
	// composer.reset()
}
