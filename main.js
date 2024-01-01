import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

import * as chunks from "./chunks.mjs";
import * as utilities from "./utilities.mjs";
import * as player from "./player.mjs";
import * as input from "./input.mjs";

/*
Rapier 3js source code:
https://github.com/mrdoob/three.js/blob/master/examples/jsm/physics/RapierPhysics.js

return {
	addScene: addScene,
	addMesh: addMesh,
	setMeshPosition: setMeshPosition,
	setMeshVelocity: setMeshVelocity
};
*/

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

scene.background = new THREE.CubeTextureLoader().setPath("textures/skybox/").load([
    "right.png",
    "left.png",
    "top.png",
    "bottom.png",
    "front.png",
    "back.png"
]);
scene.background.minFilter = scene.background.magFilter = THREE.NearestFilter;

// const groundGeometry = new THREE.PlaneGeometry(250, 250);
// const groundMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0xffff00 });
// const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// ground.rotation.set(Math.PI/2, 0, Math.PI);

// scene.add(ground);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let rapierLoaded = false;
let loaded = false;

// ============================================================================================

// Post Processing

const composer = new EffectComposer(renderer);

composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(GammaCorrectionShader));
composer.addPass(new UnrealBloomPass(undefined, 0.2, 1, undefined));
// composer.addPass(new SSAOPass(scene, camera, window.innerWidth, window.innerHeight));

composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
composer.addPass(new FilmPass(0.3));

// ============================================================================================

// Physics

let rapier = null;

// ============================================================================================

// const controls = new PointerLockControls(camera, document.body);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 0);


let world = null;




// scene.fog = new THREE.Fog(0x000000, 30, 85);
scene.fog = new THREE.FogExp2(0x000000, 0.008);

let planetPosition = new THREE.Vector3(500, 500, 500);

let planetGeometry = null; 
let planetMaterial = null; 
let planetMesh = null;

let cloudsMesh = null;

let starMaterial = null;
let starMesh = null;

const cock = new THREE.Clock();
const _input = new input.Input();

const defaultFov = 70;
const zoomedFov = 30;
let fov = defaultFov;
let fovLerped = fov;

const starVector = new THREE.Vector3(1, 0, 1);
let starPosition = starVector.clone().add(new THREE.Vector3(0, -1, 0)).multiplyScalar(-500);

// ==================================================

// Debug info

let fps = null;
let timeData = null;

function loadLighting() {
    // 0x242930
    const ambientLight = new THREE.AmbientLight(0x242930);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xede7df, 1.2);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(starVector.x, starVector.y, starVector.z);
    directionalLight.target = lightTarget
    scene.add(directionalLight);
    scene.add(lightTarget);
}

function loadWorld() {
    world = new chunks.World(Math.round(Math.random() * 1000000), scene, {
        // Chunk Types
        "empty": []
    }, {
        // Prop Types
    }, rapier);
    world.addChunkWeight("empty", 1);

    document.getElementById("seed").innerHTML = `SEED: ${world.seed}`;
    document.getElementById("world-type").innerHTML = 
        `MODIFIER: ${world.modifierKey}<br>
        WORLDTYPE: ${world.worldTypeKey}`;

    // ================================================================================

    // Spawn planet
    
    const planetColors = [0xffffff, 0xbbeaed, 0x66abff, 0xbda78a, 0xdbb581];
    const planetColor = planetColors[Math.floor(planetColors.length * world.seededRandom.random())];

    planetGeometry = new THREE.SphereGeometry(120, 16, 8);
    planetMaterial = new THREE.MeshPhongMaterial({ color: planetColor, fog: false, map: utilities.loadTexture("textures/gas_giant.png") });
    planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planetMesh);

    const cloudsMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, fog: false, map: utilities.loadTexture("textures/clouds.png"), transparent: true, opacity: 0.5 });
    cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(123, 16, 8), cloudsMaterial);
    scene.add(cloudsMesh);

    const ringsMaterial = new THREE.MeshBasicMaterial({ color: 0x727272, fog: false, map: utilities.loadTexture("textures/rings.png"), side: THREE.DoubleSide, transparent: true });
    const ringsMesh = new THREE.Mesh(new THREE.PlaneGeometry(240 * 2, 240 * 2), ringsMaterial);
    scene.add(ringsMesh);

    const planetOrientation = new THREE.Euler(
        world.seededRandom.random() * 2 * Math.PI,
        world.seededRandom.random() * 2 * Math.PI,
        world.seededRandom.random() * 2 * Math.PI
    );
    planetMesh.rotation.set(planetOrientation.x, planetOrientation.y, planetOrientation.z);
    ringsMesh.parent = cloudsMesh.parent = planetMesh;
    ringsMesh.rotation.set(Math.PI/2, 0, Math.PI);
    ringsMesh.position.set(0, 0, 0);

    cloudsMesh.position.set(0, 0, 0);

    // ================================================================================

    // Spawn star

    // starMaterial = new THREE.SpriteMaterial({ map: utilities.loadTexture("textures/water.png"), fog: false, sizeAttenuation: false });
    starMaterial = new THREE.MeshBasicMaterial({ color: 0xf4a980, fog: false });
    starMesh = new THREE.Mesh(new THREE.SphereGeometry(25, 16, 8), starMaterial);
    // starSprite.position.set(starMesh.position.x, starMesh.position.y, starMesh.position.z);

    scene.add(starMesh);
}

function loadDebug() {
    fps = document.querySelector("#fps");
    timeData = document.querySelector("#time");
}

function load() {
    console.log("load");
    loadLighting();
    loadWorld();
    loadDebug();

    input.setupListeners(_input);

    cock.start();
    document.getElementsByTagName("canvas")[0].addEventListener("click", () => {
        //updateWater();
    });

    // Load character

    new player.Player(scene, rapier);

    loaded = true;
    console.log(`rapierloaded ${rapierLoaded}`);
}

// Load Rapier

// document.addEventListener("DOMContentLoaded", () => {
//     if (rapierLoaded) load();
// }, false);

RapierPhysics().then((v) => {
    console.log(`rapierload ${v.addMesh}`);
    rapier = v;
    rapierLoaded = true;
    if (!loaded) load();
});

function update() {
	requestAnimationFrame(update);
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (!loaded) return;
    const delta = cock.getDelta();
    const elapsed = cock.getElapsedTime();

    // ========================================================

    world.update(camera.position, elapsed);

    planetMesh.position.set(camera.position.x, camera.position.y, camera.position.z);
    planetMesh.position.add(planetPosition);
    starMesh.position.set(camera.position.x, camera.position.y, camera.position.z);
    starMesh.position.add(starPosition);
    // starSprite.position.set(starMesh.position.x, starMesh.position.y, starMesh.position.z);

    cloudsMesh.rotation.set(0, elapsed * 0.025, 0);

    // ========================================================

    // Debug info

    fps.innerHTML = `${Math.round(1 / delta)} FPS`;
    timeData.innerHTML = `E: ${utilities.snap(elapsed, 0.01)}s<br>D: ${utilities.snap(delta, 0.01)}s`

    // ========================================================

    if (_input.zoomed) {
        fov = zoomedFov;
    }
    else {
        fov = defaultFov;
    }
    fovLerped = utilities.lerp(fovLerped, fov, 0.5);

    camera.fov = fovLerped;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    composer.render();
}
update();