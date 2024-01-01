function load_background() {
    const planetGeometry = new THREE.SphereGeometry(200, 64, 32); 
    const planetMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);

    planetMesh.position.set(500, 500, 500)
    scene.add(planetMesh);
}