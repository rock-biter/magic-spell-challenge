import './style.css'
import * as THREE from 'three'
// __controls_import__
// __gui_import__

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { vec3 } from 'three/examples/jsm/nodes/Nodes.js'

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new GLTFLoader(loadingManager)

const deer = {
	model: null,
	material: null,
	uniforms: null,
}

gltfLoader.load('/3d-models/deer/scene.gltf', (gltf) => {
	deer.model = gltf.scene
	deer.model.scale.setScalar(0.075)
	scene.add(deer.model)

	deer.model.traverse((el) => {
		if (el instanceof THREE.Mesh) {
			// el.material = new THREE.MeshStandardMaterial({
			// 	color: new THREE.Color().setHSL(0.5, 1, 1),

			// })
			const mat = el.material
			deer.material = mat

			patronum(mat)
		}
	})

	deer.mixer = new THREE.AnimationMixer(gltf.scene)
	const runJump = deer.mixer.clipAction(gltf.animations[98])

	runJump.play()

	console.log(deer.model, gltf)
})

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
	material.roughness = 0.5
	// material.roughnessMap = null
	// material.metalnessMap = null
	// console.log(material.roughnessMap, material.metalnessMap)

	material.onBeforeCompile = (shader) => {
		console.log(shader.vertexShader)
		console.log(`
			------
			`)
		console.log(shader.fragmentShader)
		deer.uniforms = shader.uniforms

		shader.uniforms.uCamera = new THREE.Uniform(new THREE.Vector3(0, 0, 0))
		shader.uniforms.uColor = new THREE.Uniform(new THREE.Color(0x70e2ff))

		let token = '#include <common>'

		shader.vertexShader = shader.vertexShader.replace(
			token,
			/*glsl*/ `
			#include <common>
			uniform vec3 uCamera;
			uniform vec3 uColor;
			varying vec3 vPosition;
			varying vec3 vN;
			
			`
		)

		shader.fragmentShader = shader.fragmentShader.replace(
			token,
			/*glsl*/ `
			#include <common>
			uniform vec3 uCamera;
			uniform vec3 uColor;
			varying vec3 vPosition;
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
			float gammaGray = sqrt(gray) * 1.3;
			diffuseColor.rgb = vec3(gammaGray);
			diffuseColor.rgb = mix(diffuseColor.rgb,uColor,0.9);

			// Fresnel
    	vec3 viewDirection = normalize(vPosition - cameraPosition);
			// vec3 n = vec4(viewMatrix * vec4(vNormal,0.)).xyz;
			// vec3 n = normalize(vNormal);
			vec3 n = normalize(vN);
			// // if(gl_FrontFacing)
			// float dir = gl_FrontFacing ? 1.0 : - 1.0;
     	// n *= dir;
			float fresnel = 1. - abs(dot(viewDirection, n));
			fresnel = pow(fresnel,1.5);
			// fresnel *= 0.5;
			float falloff = smoothstep(0.95, 0., fresnel);
			float patronum = fresnel * falloff;

			diffuseColor.a = patronum;
			
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
}

/**
 * Camera
 */
const fov = 60
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1)
camera.position.set(10, 10, 10)
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
	logarithmicDepthBuffer: true,
})
document.body.appendChild(renderer.domElement)
handleResize()

/**
 * OrbitControls
 */
// __controls__
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 4, 0)
controls.enableDamping = true
controls.autoRotate = true
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

/**
 * frame loop
 */
function tic() {
	/**
	 * tempo trascorso dal frame precedente
	 */
	const deltaTime = clock.getDelta()
	/**
	 * tempo totale trascorso dall'inizio
	 */
	// const time = clock.getElapsedTime()

	// __controls_update__
	controls.update()

	if (deer.mixer) {
		// deer.model.rotation.y += deltaTime
		deer.mixer.update(deltaTime)
	}

	renderer.render(scene, camera)

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height

	// camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}
