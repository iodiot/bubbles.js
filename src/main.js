import * as THREE from "/three.js/build/three.module.js";
import Stats from "/three.js/examples/jsm/libs/stats.module.js";
//import { OrbitControls } from "/three.js/examples/jsm/controls/OrbitControls.js";
import { Utils } from "/src/utils.js";
import { GUI } from "/three.js/examples/jsm/libs/lil-gui.module.min.js";
import { Bubbles } from "/src/bubbles.js";
import { GpuCompute } from "/src/gpu_compute.js";

let params = {
	bubblesCount: 300,
	mouseX: -1,
	mouseY: -1,
	debugMessage: "empty",
	gpuTextureWidth: 32
};

let shaders = {};

let container, stats;

let camera, scene, renderer;

let mouse = new THREE.Vector2();

let bubbles;
let gpuCompute;

loadShaders(shaders);

function loadShaders() {
	let loader = new THREE.FileLoader();

	// Load shaders from files
	loader.load("/src/shaders/bubble.vert", (shader) => { shaders["bubbleVert"] = shader; });
	loader.load("/src/shaders/bubble.frag", (shader) => { shaders["bubbleFrag"] = shader; });
	loader.load("/src/shaders/position.frag", (shader) => { shaders["positionFrag"] = shader; });
	loader.load("/src/shaders/velocity.frag", (shader) => { 
		shaders["velocityFrag"] = shader; 
		init();
		animate();
	});
}

function init() {
	renderer = new THREE.WebGLRenderer();

	container = document.createElement( "div" );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 5000 );
	camera.position.z = 1400;

	scene = new THREE.Scene();

	// Bubbles
	bubbles = new Bubbles(params, shaders["bubbleVert"], shaders["bubbleFrag"], params.gpuTextureWidth);
	bubbles.init();
	bubbles.scale.set(500, 500, 500);
	scene.add(bubbles);

	// GPU Compute
	gpuCompute = new GpuCompute(params.gpuTextureWidth, renderer, shaders["positionFrag"], shaders["velocityFrag"]);

	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	window.addEventListener("resize", onWindowResize);
	window.addEventListener("mousemove", onMouseMove, false);

	createGUI();

	return true;
}

function createGUI() {
	const gui = new GUI({name: "GUI"});

	let f1 = gui.addFolder("Data");
	f1.add(params, "mouseX").listen();
	f1.add(params, "mouseY").listen();
	f1.add(params, "debugMessage").listen();

	let f2 = gui.addFolder("Controls");
	f2.add(params, "bubblesCount").min(100).max(1000).step(50);

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMouseMove(event) {
	event.preventDefault();
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	// For GUI
	params.mouseX = mouse.x.toFixed(3);
	params.mouseY = mouse.y.toFixed(3);

	bubbles.onMouseMove(mouse);
	gpuCompute.onMouseMove(mouse);
}

function animate() {
	requestAnimationFrame( animate );

	render();
	stats.update();
}

function render() {
	const time = performance.now() * 0.0005;

	gpuCompute.update(time);
	


	gpuCompute.compute();

	bubbles.update(time, gpuCompute.getPositionTexture(), gpuCompute.getVelocityTexture());

	// mesh.rotation.x = time * 0.2;
	// mesh.rotation.y = time * 0.4;

	renderer.render(scene, camera);
}