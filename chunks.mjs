import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import * as utilities from "./utilities.mjs";

const renderDiameter = 16 * 2;
const chunkQuality = 8;
const groundTiling = 4;
const waterTileSize = 8;

const modifiers = {
    stalagmites: (height) => {
        if (height < 0) {
            return -((-height) ** 0.4 * 5);
        }
        return height ** 0.4 * 5;
    },
    mountains: (height) => {
        if (height >= 15) {
            return (height - 15) * 0.75 + height * 0.25;
        }
        return height * 0.25;
    },
    tibet: (height) => {
        return 25 / (1 + 3 * Math.E ** (0.1 * height)) - 4.5;
    },
    sine: (height) => {
        return 4.5 * Math.sin(0.1 * height);
    },
    extremeMountains: (height) => {
        if (height <= 0) {
            return height * 0.15;
        }
        return height;
    }
};

const worldTypes = {
    water: {
        modifiers: ["tibet", "mountains", "extremeMountains"],
        groundTextures: ["textures/ground.png", "textures/snow.png"],
        groundColors: [0xc4b19f, 0xd1bec3, 0xffffff, 0xffddba],
        ocean: 1,
    },
    rocky: {
        modifiers: ["tibet", "stalagmites", "mountains", "extremeMountains"],
        groundTextures: ["textures/ground.png", "textures/snow.png"],
        groundColors: [0xc4b19f, 0xd1bec3, 0xffffff, 0xffddba, 0xaeb5bf],
        ocean: 0,
    },
    ice: {
        modifiers: ["tibet", "mountains", "extremeMountains"],
        groundTextures: ["textures/snow.png"],
        groundColors: [0xffffff, 0xaeb5bf],
        ocean: 2,
    }
}

class World {
    constructor(seed, scene, chunkTypes, propTypes, rapier) {
        this.scene = scene;
        this.rapier = rapier;

        this.seed = seed;
        this.seededRandom = new utilities.SeededRandom(this.seed);

        const key = Object.keys(worldTypes)[Math.floor(this.seededRandom.random(this.seed) * Object.keys(worldTypes).length)];
        this.worldType = worldTypes[key];

        console.log(key);

        this.chunks = {};
        this.propTypes = propTypes;
        this.chunkTypes = chunkTypes;
        this.chunkTable = [];

        console.log(JSON.stringify(this.worldType.groundTextures));

        const path = this.worldType.groundTextures[Math.floor(this.seededRandom.random(this.seed + 1) * this.worldType.groundTextures.length)];
        const groundTexture = utilities.loadTexture(path);

        const groundColor = this.worldType.groundColors[Math.floor(this.seededRandom.random(this.seed + 2) * this.worldType.groundColors.length)];

        groundTexture.repeat = new THREE.Vector2(groundTiling, groundTiling);
        console.log(path);
        this.groundMaterial = new THREE.MeshPhongMaterial({ 
            color: groundColor, 
            map: groundTexture, 
            flatShading: true,
            shininess: 0
        });

        this.chunkPositions = [];

        // ======================================================

        this.modifier = modifiers[
            this.worldType.modifiers[
                Math.floor(this.worldType.modifiers.length * this.seededRandom.random(this.seed + 3))
            ]
        ];
        this.perlin = new ImprovedNoise();

        // Add ocean

        this.ocean = this.worldType.ocean;
        console.log(`ocean ${this.ocean}`);
        if (this.ocean != 0) {
            this.oceanGeometry = new THREE.PlaneGeometry(512, 512, 512 / waterTileSize, 512 / waterTileSize);
            this.oceanGeometry.dynamic = true;

            const oceanTextures = ["go away lol", "textures/water.png", "textures/ice.png"];
            const oceanColors = ["why are you looking at this lmaooo", 0x909496, 0xe6ffff];

            const oceanTexture = utilities.loadTexture(oceanTextures[this.ocean]);
            oceanTexture.repeat = new THREE.Vector2(512 / waterTileSize, 512 / waterTileSize);
            const oceanColor = oceanColors[this.ocean];
            // b: 0xb5daff g: 0xbdff91
            this.oceanMaterial = new THREE.MeshPhongMaterial({
                color: oceanColor, 
                transparent: true, 
                opacity: 0.7,
                map: oceanTexture, 
                reflectivity: 0, 
                shininess: 0,
                combine: THREE.AddOperation
            });

            this.oceanMesh = new THREE.Mesh(this.oceanGeometry, this.oceanMaterial);
            this.scene.add(this.oceanMesh);
            this.oceanMesh.rotation.set(-Math.PI/2, 0, 0);
        }
    }
    loadChunk(chunkPosition) {
        let chunkId = generateChunkId(chunkPosition);
        if (!(chunkId in this.chunks)) {
            const newChunk = new Chunk(chunkPosition, this);
            this.chunks[chunkId] = newChunk;
            newChunk.render();
        }
        else {
            this.chunks[chunkId].render();
        }
    }
    addChunkWeight(name, weight) {
        for (let i = 0; i < weight; i++) {
            this.chunkTable.push(name);
        }
    }
    surroundingChunks(position) {
        const centralChunk = worldToChunkPosition(position);
        let _chunkPositions = [];
        for (let i = 0; i < renderDiameter; i++) {
            for (let j = 0; j < renderDiameter; j++) {
                let cur = centralChunk.clone();
                cur.add(new THREE.Vector2(-renderDiameter / 2 + i, -renderDiameter / 2 + j));
                _chunkPositions.push(cur);
            }
        }
        return _chunkPositions;
    }

    update(playerPosition, time = 0) {
        const newChunkPositions = this.surroundingChunks(playerPosition);
        for (let i = 0; i < this.chunkPositions.length; i++) {
            const cur = this.chunkPositions[i];
            if (!(cur in newChunkPositions)) {
                const curChunk = this.chunks[generateChunkId(cur)];
                if (curChunk) curChunk.unrender();
            }
        }
        this.chunkPositions = newChunkPositions;
        
        for (let i = 0; i < this.chunkPositions.length; i++) {
            this.loadChunk(this.chunkPositions[i]);
        }
        this.updateWater(playerPosition, time);
    }

    updateWater(playerPosition, time = 0) {
        if (this.ocean == 0) {
            return;
        }

        this.oceanMesh.position.set(utilities.snap(playerPosition.x, waterTileSize), 0, utilities.snap(playerPosition.z, waterTileSize));

        if (this.ocean == 2) {
            return;
        }

        const modifiedTime = time * 0.8;
    
        let vertices = this.oceanGeometry.attributes.position;
    
        for (let i = 0; i < vertices.count; i++) {
            const worldPosition = this.oceanMesh.localToWorld(new THREE.Vector3(vertices.getX(i), vertices.getY(i), vertices.getZ(i)));
    
            const x = worldPosition.x + modifiedTime;
            const y = worldPosition.y;
            const z = worldPosition.z + modifiedTime;
    
            // const newZ = (Math.sin(x + modifiedTime) + Math.cos(-(z + modifiedTime))) * 0.7;
            const newZ = (this.perlin.noise(x, y, z), this.perlin.noise(x * 0.9, y, z * 0.9)) * 0.7;
    
            vertices.setXYZ(i, vertices.getX(i), vertices.getY(i), newZ);
        }
    
        this.oceanGeometry.attributes.position.needsUpdate = true;
        this.oceanGeometry.computeVertexNormals();
    }

    generateHeight(position) {
        let height = 0;
        let quality = 1;

        for (let i = 0; i < 4; i++) {
            height += this.perlin.noise((position.x + this.seed * 15) / quality, 0, (position.z + this.seed * 15) / quality) * quality;
            quality *= 5;
        }
        return this.modifier(height);
    }
}

// =================================================================================

class Chunk {
    constructor(chunkPosition, world) {
        this.world = world;

        this.chunkId = generateChunkId(chunkPosition);
        this.chunkPosition = chunkPosition;
        this.seed = this.world.seed + chunkPosition.x + chunkPosition.y;
        this.type = this.world.chunkTable[Math.floor(this.world.seededRandom.random() * this.world.chunkTable.length)];

        this.worldChunkPosition = new THREE.Vector3(chunkPosition.x, 0, chunkPosition.y);
        this.worldChunkPosition.multiplyScalar(16);

        this.children = [];
        this.rendered = false;

        // const chunkProps = this.world.chunkTypes[this.type];
        // // alert(this.type)
        // if (chunkProps.length > 0) {
        //     for (let i = 0; i < 1 + this.world.seededRandom.random(this.seed) * 3; i++) {
        //         const position = new THREE.Vector3(
        //             this.world.seededRandom.random(this.seed + i + 2) * 16, 0,
        //             this.world.seededRandom.random(this.seed + i + 4) * 16
        //         );
        //         position.add(this.worldChunkPosition);
        //         const prop = chunkProps[Math.floor(this.world.seededRandom.random(this.seed + i) * chunkProps.length)];
        //         // alert(prop);
        //         this.children.push(this.world.propTypes[prop](position, this.chunkId));
        //     }
        // }
        
        // Create terrain plane

        const planeGeometry = new THREE.PlaneGeometry(16, 16, chunkQuality, chunkQuality);
        const planeMaterial = this.world.groundMaterial;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.set(-Math.PI/2, 0, Math.PI);
        plane.position.set(8, 0, 8);
        plane.position.add(this.worldChunkPosition);
        this.children.push(plane);

        let vertices = planeGeometry.attributes.position;

        for (let i = 0; i < vertices.count; i++) {
            const worldPosition = plane.localToWorld(new THREE.Vector3(vertices.getX(i), vertices.getY(i), vertices.getZ(i)));

            const x = worldPosition.x;
            const y = worldPosition.y;
            const z = worldPosition.z;

            const newZ = this.world.generateHeight(new THREE.Vector3(x, y, z));

            vertices.setXYZ(i, vertices.getX(i), vertices.getY(i), newZ);
        }
        planeGeometry.computeVertexNormals();
        
        // console.log(JSON.stringify(this.world.rapier));
        this.world.rapier.addMesh(plane);

        // console.log(`newchunk ${this.children}`)
    }

    render() {
        if (this.rendered) return;

        this.rendered = true;
        for (let i = 0; i < this.children.length; i++) {
            const cur = this.children[i];
            if (!cur) { // Remove null items
                this.children.splice(i, 1);
                continue;
            }

            this.world.scene.add(cur);
        }
        // console.log(`rendered ${this.chunkId} ${this.children}`);
    }
    unrender() {
        this.rendered = false;
        for (let i = 0; i < this.children.length; i++) {
            const cur = this.children[i];
            if (!cur) { // Remove null items
                this.children.splice(i, 1);
                continue;
            }

            this.world.scene.remove(cur);
        }
        // console.log(`unrendered ${this.chunkId}`);
    }

    remove(child) {
        for (let i = 0; i < this.children.length; i++) {
            const cur = this.children[i];
            if (cur == child) {
                alert("balls");
                this.children.splice(i, 1);
                this.world.scene.remove(child);
            }
        }
    }
}

// =================================================================================

function generateChunkId(chunkPosition) {
    return btoa(`${chunkPosition.x} ${chunkPosition.y}`);
}

function worldToChunkPosition(position) {
    return new THREE.Vector2(
        Math.floor(position.x / 16),
        Math.floor(position.z / 16));
}

export {
    generateChunkId, worldToChunkPosition, World, Chunk
}