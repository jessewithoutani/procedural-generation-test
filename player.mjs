import * as THREE from 'three';

class Player {
    constructor(scene, rapier) {
        this.scene = scene;
        const playerGeometry = new THREE.CapsuleGeometry(1, 2, 1, 6);
        const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        rapier.addMesh(this.mesh, 45);
        this.scene.add(this.mesh);
        console.log(`playerload ${JSON.stringify(this.mesh.userData)}`);
    }
}
export {
    Player
}