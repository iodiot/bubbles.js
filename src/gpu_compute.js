import * as THREE from "/three.js/build/three.module.js";
import { GPUComputationRenderer } from "/three.js/examples/jsm/misc/GPUComputationRenderer.js";
import { Utils } from "/src/utils.js";

export class GpuCompute extends GPUComputationRenderer {
    constructor(width, renderer, positionFrag, velocityFrag) {
        super(width, width, renderer);

        console.log("width = " + width);

        const dtPosition = this.createTexture();
        const dtVelocity = this.createTexture();

        this.fillPositionTexture( dtPosition );
        this.fillVelocityTexture( dtVelocity );

        this.velocityVariable = this.addVariable( "uVelocityTexture", velocityFrag, dtVelocity );
        this.positionVariable = this.addVariable( "uPositionTexture", positionFrag, dtPosition );

        this.setVariableDependencies( this.velocityVariable, [ this.positionVariable, this.velocityVariable ] );
        this.setVariableDependencies( this.positionVariable, [ this.positionVariable, this.velocityVariable ] );

        this.positionUniforms = this.positionVariable.material.uniforms;
        this.velocityUniforms = this.velocityVariable.material.uniforms;

        this.positionUniforms[ "uTime" ] = { value: 0.0 };
        this.velocityUniforms[ "uTime" ] = { value: 1.0 };
        this.positionUniforms[ "uMouse" ] = { value: new THREE.Vector2(0, 0) };
        this.velocityUniforms[ "uMouse" ] = { value: new THREE.Vector2(0, 0) };


        this.velocityVariable.wrapS = THREE.RepeatWrapping;
        this.velocityVariable.wrapT = THREE.RepeatWrapping;
        this.positionVariable.wrapS = THREE.RepeatWrapping;
        this.positionVariable.wrapT = THREE.RepeatWrapping;

        const error = this.init();

        if ( error !== null ) {
            console.error( error );
        }
    }

    fillPositionTexture( texture ) {
        const theArray = texture.image.data;

        for ( let k = 0, kl = theArray.length; k < kl; k += 4 ) {
            const pos = Utils.getRandomPointInCircle(1);

            theArray[ k + 0 ] = pos.x;
            theArray[ k + 1 ] = pos.y;
            theArray[ k + 2 ] = 0;
            theArray[ k + 3 ] = 1;
        }
    }

    fillVelocityTexture( texture ) {
        const theArray = texture.image.data;

        for ( let k = 0, kl = theArray.length; k < kl; k += 4 ) {
            theArray[ k + 0 ] = Utils.getRandomFloat(-1, 1);
            theArray[ k + 1 ] = Utils.getRandomFloat(-1, 1);
            theArray[ k + 2 ] = 0;
            theArray[ k + 3 ] = 0;
        }
    }

    getPositionTexture() {
        return this.getCurrentRenderTarget(this.positionVariable).texture;
    }

    getVelocityTexture() {
        return this.getCurrentRenderTarget(this.velocityVariable).texture;
    }

    update(time) {
        this.positionUniforms["uTime"].value = time;
        this.velocityUniforms["uTime"].value = time;
    }

    onMouseMove(mouse) {
        var pos = new THREE.Vector2(mouse.x, mouse.y);

        this.positionUniforms["uMouse"].value = pos;
        this.velocityUniforms["uMouse"].value = pos;
	}
}