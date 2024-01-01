import * as THREE from 'three';

class Player {
    constructor(scene, rapier) {
        this.scene = scene;
        const playerGeometry = new THREE.CapsuleGeometry(1, 2, 1, 6);
        const playerMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.rapier = rapier;

        this.scene.add(this.mesh);
        this.mesh.position.set(0, 160, 0);
        this.rapier.addMesh(this.mesh, 45);
        // this.rapier.setMeshVelocity(this.mesh, new THREE.Vector3(0, 0.5, 0));

        console.log(`playerload ${JSON.stringify(this.mesh.userData)}`);
    }
}
export {
    Player
}