class Input {
    constructor() {
        this.horizontalAxisRaw = {left: 0, right: 0};
        this.verticalAxisRaw = {up: 0, down: 0};

        this.horizontalAxis = 0;
        this.verticalAxis = 0;

        this.sprinting = 0;
        this.zoomed = false;
        this.locked = true; // tbi
    }
    onKeyDown(event) {
        if (!this.locked) return;
    
        let keyCode = event.key;
    
        if (keyCode == "w" || keyCode == "W" || keyCode == "ArrowUp") this.verticalAxisRaw.up = 1;
        if (keyCode == "s" || keyCode == "S" || keyCode == "ArrowDown") this.verticalAxisRaw.down = 1;
        if (keyCode == "a" || keyCode == "A" || keyCode == "ArrowLeft") this.horizontalAxisRaw.left = 1;
        if (keyCode == "d" || keyCode == "D" || keyCode == "ArrowRight") this.horizontalAxisRaw.right = 1;

        if (keyCode == "q") {
            this.zoomed = true;
        }
    }
    onKeyUp(event) {
        if (!this.locked) {
            this.verticalAxisRaw.up = this.verticalAxisRaw.down = this.horizontalAxisRaw.left = this.horizontalAxisRaw.right = this.sprinting = 0;
            return;
        }
    
        let keyCode = event.key;
    
        if (keyCode == "w" || keyCode == "W" || keyCode == "ArrowUp") this.verticalAxisRaw.up = 0;
        if (keyCode == "s" || keyCode == "S" || keyCode == "ArrowDown") this.verticalAxisRaw.down = 0;
        if (keyCode == "a" || keyCode == "A" || keyCode == "ArrowLeft") this.horizontalAxisRaw.left = 0;
        if (keyCode == "d" || keyCode == "D" || keyCode == "ArrowRight") this.horizontalAxisRaw.right = 0;
    
        if (keyCode == "Shift") this.sprinting = 0;

        if (keyCode == "q") {
            this.zoomed = false;
        }
    }
}

function setupListeners(input) {
    console.log(JSON.stringify(input));
    document.addEventListener("keydown", (event) => input.onKeyDown(event), false);
    document.addEventListener("keyup", (event) => input.onKeyUp(event), false);
}

export {
    Input, setupListeners
}