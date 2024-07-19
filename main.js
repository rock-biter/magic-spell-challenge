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
import particlesVertexShader from './src/shaders/particles/vertex.glsl'
import particlesFragmentShader from './src/shaders/particles/fragment.glsl'
import gpgpuParticlesShader from './src/shaders/gpgpu/particles.glsl'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

import Stats from 'three/addons/libs/stats.module.js'
import { Matrix4 } from 'three'

const stats = new Stats()
document.body.appendChild(stats.dom)

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new GLTFLoader(loadingManager)

const deer = {
	model: null,
	material: null,
	uniforms: null,
}

const debugObject = {
	threshold: 0.33,
	strength: 0.4,
	radius: 0,
	exposure: 1.25,
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
	const runJump = deer.mixer.clipAction(gltf.animations[98])

	runJump.play()

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
	const boneTexture = gpgpu.computation.createTexture()

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
		baseParticlesTexture.image.data[i4 + 3] = Math.random()

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

	// add uniforms params
	gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
		new THREE.Uniform(2)
	gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
		new THREE.Uniform(7.9)
	gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
		new THREE.Uniform(0.04)

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
		uniforms: {
			uSize: new THREE.Uniform(0.055),
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
		.add(particles.material.uniforms.uSize, 'value')
		.min(0)
		.max(1)
		.step(0.001)
		.name('uSize')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence, 'value')
		.min(0)
		.max(1)
		.step(0.001)
		.name('uFlowfieldInfluence')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength, 'value')
		.min(0)
		.max(10)
		.step(0.001)
		.name('uFlowfieldStrength')
	gui
		.add(gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency, 'value')
		.min(0)
		.max(1)
		.step(0.001)
		.name('uFlowfieldFrequency')
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

		let token = '#include <common>'

		shader.vertexShader = shader.vertexShader.replace(
			token,
			/*glsl*/ `
			#include <common>
			${simplexNoise4D}
			uniform vec3 uCamera;
			uniform vec3 uColor;			
			uniform float uTime;
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

			diffuseColor.a = patronum * text * textBig;

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
}
const gui = new dat.GUI()
gui.add(configs, 'example', 0, 10, 0.1).onChange((val) => console.log(val))

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
camera.position.set(7, 7, 10)
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
