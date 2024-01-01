import * as THREE from 'three';

class SeededRandom {
    constructor(startingSeed = 0) {
        this.seed = startingSeed;
        this.psuedoRandRaw = "N3S89tcUXs1rws$npmZ*NvYzMObuka(FirAGJ9B!%$0mv(jESlAgFW#R44^qodqfHJ2HT^PQpUV&T#dj)CX*Ley65xbk0K%D3El8ax!wBcI7YI5ft2ZeKgyhz1iRnMQ@&P6O7@CLoVuGhDW)";
        this.psuedoRand = [];

        for (let i = 0; i < this.psuedoRandRaw.length; i++) {
            const cur = (this.psuedoRandRaw.charCodeAt(i) - 33) / (127 - 33);
            this.psuedoRand.push(cur);
            // console.log(cur)
        }
    }
    random(seed) {
        let usingSeed = seed;
        if (seed == undefined) {
            usingSeed = this.seed;
            this.seed++;
        }
        return this.psuedoRand[Math.floor(Math.abs(usingSeed % this.psuedoRand.length))];
    }
}
function snap(value, size) {
    return Math.round(value / size) * size;
}
function lerp(a, b, alpha) {
    return a + alpha * (b - a);
}

function loadTexture(path) {
    let texture = new THREE.TextureLoader().load(path);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

export {
    snap, lerp, loadTexture, SeededRandom
}