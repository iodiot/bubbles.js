import * as THREE from "/three.js/build/three.module.js";

export class Utils {

    static getRandomFloat(left, right) {
        return Math.random() * (right - left) + left;
    }

    static getRandomPointInCircle(radius) {
        let r = radius * Math.sqrt(Math.random());
        let theta = Math.random() * 2 * Math.PI;

        return new THREE.Vector2(r * Math.cos(theta), r * Math.sin(theta));
    }

}