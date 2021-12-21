import * as THREE from "/three.js/build/three.module.js";
import { Utils } from "/src/utils.js";

export class Bubbles extends THREE.Mesh {
	
	constructor(params, vertexShader, fragmentShader, width) {
		super();

		this.width = width;

		this.params = params;
		this.uniforms = {
			uMap: { value: new THREE.TextureLoader().load("/src/textures/disc.png") },
			uTime: { value: 0.0 },
			uMouse: new THREE.Uniform(new THREE.Vector2(-1, -1)),
			uPositionTexture: { value: null },
			uVelocityTexture: { value: null },
		};

		let material = new THREE.RawShaderMaterial( {
			uniforms: this.uniforms,
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			depthTest: true,
			depthWrite: true
		} );

		this.material = material;
	}

	init() {
		const circleGeometry = new THREE.CircleGeometry(1, 6);

		let geometry = new THREE.InstancedBufferGeometry();
		geometry.index = circleGeometry.index;
		geometry.attributes = circleGeometry.attributes;

		const instances = this.params.bubblesCount;

		// ---
		const aTranslate = [];

		for (let i = 0; i < instances; ++i) {
			const pos =  Utils.getRandomPointInCircle(1);

			aTranslate.push(pos.x, pos.y, 0);
		}

		geometry.setAttribute("aTranslate", new THREE.InstancedBufferAttribute(new Float32Array(aTranslate), 3));

		// ---
		let aScale = [];

		for (let i = 0; i < instances; ++i) {
			const scale = Utils.getRandomFloat(0.1, 3);
			aScale.push(scale);
		}

		geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(new Float32Array(aScale), 1));

		// ---
		const colors = [new THREE.Color("skyblue"), new THREE.Color("red"), new THREE.Color("green"), new THREE.Color("yellow")];

		let aColor = [];

		for (let i = 0; i < instances; ++i) {
			const color = colors[Math.floor(Math.random() * colors.length)];

			aColor.push(color.r, color.g, color.b);
		}

		geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3));

		// ---
		let aReference = [];

		for (let i = 0; i < instances; ++i) {
			const x = (i % this.width) / this.width;
			const y = (i / this.width) / this.width;

			aReference.push(x);
			aReference.push(y);
		}

		geometry.setAttribute("aReference", new THREE.InstancedBufferAttribute(new Float32Array(aReference), 2));

		this.geometry = geometry;
	}

	update(time, positionTexture, velocityTexture) {
		this.material.uniforms["uTime"].value = time;
		this.material.uniforms["uPositionTexture"].value = positionTexture;
		this.material.uniforms["uVelocityTexture"].value = velocityTexture;
	}

	clean() {
		this.geometry.dispose();
	}

	dispose() {
		this.geometry.dispose();
		this.material.dispose();
	}

	onMouseMove(mouse) {
		this.uniforms.uMouse.value.set(mouse.x, mouse.y);
	}
}
