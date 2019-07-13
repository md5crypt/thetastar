(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const thetastar_1 = require("./thetastar");
function printError(error) {
    console.error(error);
    document.body.innerHTML = "<pre>" + error + "</pre>";
}
window.addEventListener("error", (e) => printError(e.error));
function plotLineLow(image, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = Math.abs(y1 - y0);
    const sy = y1 > y0 ? image.width : -image.width;
    let value = x0 + (image.width * y0);
    let f = dx / 2;
    for (let i = 0; i <= dx; i += 1) {
        image.data[value * 4] = 255;
        f += dy;
        if (f >= dx) {
            value += sy;
            f -= dx;
        }
        value += 1;
    }
}
function plotLineHigh(image, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = y1 - y0;
    const sx = x1 > x0 ? 1 : -1;
    let value = x0 + (image.width * y0);
    let f = dy / 2;
    for (let i = 0; i <= dy; i += 1) {
        image.data[value * 4] = 255;
        f += dx;
        if (f >= dy) {
            value += sx;
            f -= dy;
        }
        value += image.width;
    }
}
/* for drawing lines without AA */
function plotLine(image, x0, y0, x1, y1) {
    if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) {
        if (x0 > x1) {
            return plotLineLow(image, x1, y1, x0, y0);
        }
        else {
            return plotLineLow(image, x0, y0, x1, y1);
        }
    }
    else {
        if (y0 > y1) {
            return plotLineHigh(image, x1, y1, x0, y0);
        }
        else {
            return plotLineHigh(image, x0, y0, x1, y1);
        }
    }
}
async function loadImage(src) {
    return new Promise(resolve => {
        const image = document.createElement('img');
        image.src = src;
        image.addEventListener("load", () => resolve(image));
    });
}
async function main() {
    /* set max heap size to 24 MB to be able to support that 1024x1024 bitmap */
    const thetaStar = await thetastar_1.ThetaStar.create("demo/thetastar.wasm", 1024 * 1024 * 24);
    const image = await loadImage("demo/test.png");
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const rawImageData = ctx.getImageData(0, 0, image.width, image.height);
    let currentImageData = rawImageData;
    let start = 0;
    let end = [127, 127];
    let opt = parseFloat(document.querySelector("#mult").value);
    const samples = [];
    function scaleImage(scale) {
        const image = rawImageData;
        const output = ctx.createImageData(image.width * scale, image.height * scale);
        const a = new Uint32Array(image.data.buffer);
        const b = new Uint32Array(output.data.buffer);
        /* simple upscale without resampling */
        for (let y = 0; y < image.height; y++) {
            for (let j = 0; j < scale; j++) {
                for (let x = 0; x < image.width; x++) {
                    for (let k = 0; k < scale; k++) {
                        b[(x * scale) + k + ((y * scale) + j) * output.width] = a[x + (y * image.width)];
                    }
                }
            }
        }
        start = 0;
        end = [output.width - 1, output.height - 1];
        currentImageData = output;
        loadImageToHeap();
        canvas.width = output.width;
        canvas.height = output.height;
    }
    function loadImageToHeap() {
        /* convert the RGBA array to a byte per pixel array */
        const data = new Uint8Array(currentImageData.width * currentImageData.height);
        for (let i = 0; i < data.length; i++) {
            data[i] = currentImageData.data[(i * 4) + 3] == 255 ? 1 : 0;
        }
        thetaStar.loadImageData(data, currentImageData.width, currentImageData.height);
    }
    function updateStats() {
        if (samples.length > 30) {
            samples.shift();
        }
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            min = Math.min(min, samples[i]);
            max = Math.max(min, samples[i]);
            sum += samples[i];
        }
        const avg = sum / samples.length;
        const latest = samples[samples.length - 1];
        document.querySelector('#stat-current').innerHTML = latest.toFixed(1);
        document.querySelector('#stat-average').innerHTML = avg.toFixed(1);
        document.querySelector('#stat-min').innerHTML = min.toFixed(1);
        document.querySelector('#stat-max').innerHTML = max.toFixed(1);
    }
    function render() {
        const goal = thetaStar.findClosest(end[0], end[1]);
        const timeStart = performance.now();
        const path = thetaStar.findPath(start, goal, opt);
        if (path === null) {
            throw new Error("path not found");
        }
        samples.push(performance.now() - timeStart);
        const image = ctx.createImageData(currentImageData);
        image.data.set(currentImageData.data);
        for (let i = 1; i < path.length; i++) {
            const x0 = path[i - 1] % image.width;
            const y0 = Math.floor(path[i - 1] / image.width);
            const x1 = path[i] % image.width;
            const y1 = Math.floor(path[i] / image.width);
            plotLine(image, x0, y0, x1, y1);
        }
        image.data[start * 4 + 0] = 0;
        image.data[start * 4 + 1] = 255;
        ctx.putImageData(image, 0, 0);
        updateStats();
    }
    loadImageToHeap();
    render();
    setInterval(() => render(), 20); // lock framerate at 30 fps
    /* demo UI stuff bellow */
    document.querySelectorAll(".size-button").forEach(button => {
        button.addEventListener("click", e => scaleImage(parseInt(e.target.attributes.getNamedItem("data-scale").value, 10)));
    });
    document.querySelector("canvas").addEventListener("click", e => {
        const rect = e.target.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        if (currentImageData.data[(x * 4) + 3 + (y * currentImageData.width * 4)] == 255) {
            start = x + y * currentImageData.width;
        }
    });
    document.querySelector("canvas").addEventListener("click", e => {
        const rect = e.target.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        if (currentImageData.data[(x * 4) + 3 + (y * currentImageData.width * 4)] == 255) {
            start = x + y * currentImageData.width;
        }
    });
    document.querySelector("canvas").addEventListener("mousemove", e => {
        const rect = e.target.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        end = [x, y];
    });
    document.querySelector("#mult-update").addEventListener("click", () => {
        opt = parseFloat(document.querySelector("#mult").value);
    });
}
window.addEventListener("load", () => main().catch(printError));

},{"./thetastar":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DumbestHeapEver {
    constructor(start = 0, end = 0) {
        this.map = new Map();
        this.end = end;
        this.last = { end: start, prev: null, next: null };
    }
    move(start, end) {
        if (this.map.size != 0) {
            throw new Error("can not move not empty heap");
        }
        this.end = end;
        this.last = { end: start, prev: null, next: null };
    }
    malloc(size) {
        const ptr = this.last.end;
        const top = ptr + ((size + 3) & ~3); // I don't even care
        if (top >= this.end) {
            throw new Error("out of memory");
        }
        const segment = {
            prev: this.last,
            next: null,
            end: top
        };
        this.map.set(ptr, segment);
        this.last.next = segment;
        this.last = segment;
        return ptr;
    }
    free(ptr) {
        const current = this.map.get(ptr);
        this.map.delete(ptr);
        if (!current) {
            throw new Error(`called free with bad address: ${ptr}`);
        }
        if (current.next === null) {
            this.last = current.prev;
            this.last.next = null;
        }
        else {
            current.next.prev = current.prev;
            current.prev.next = current.next;
        }
    }
}
class ThetaStar {
    constructor(heap, memory, exports) {
        this.heap = heap;
        this.memory = memory;
        this.exports = exports;
        this.imageData = null;
    }
    static async create(wasm, memorySize = 0x10000) {
        const memory = new WebAssembly.Memory({
            'initial': Math.ceil(memorySize >> 16),
        });
        const heap = new DumbestHeapEver();
        const env = {
            memory,
            malloc: size => heap.malloc(size),
            free: ptr => heap.free(ptr)
        };
        const callback = (result) => {
            const exports = result.instance.exports;
            heap.move(exports.stackSave(), memory.buffer.byteLength);
            return new ThetaStar(heap, memory.buffer, exports);
        };
        if (wasm instanceof ArrayBuffer) {
            return WebAssembly.instantiate(wasm, { env }).then(callback);
        }
        else if (wasm instanceof Response) {
            return WebAssembly.instantiateStreaming(wasm, { env }).then(callback);
        }
        else {
            return fetch(wasm).then(response => WebAssembly.instantiateStreaming(response, { env })).then(callback);
        }
    }
    loadImageData(data, width, height) {
        if (this.imageData !== null) {
            this.heap.free(this.imageData);
        }
        this.imageData = this.heap.malloc((width * height) + 8);
        const u32 = new Uint32Array(this.memory);
        u32[(this.imageData + 0 /* xsize */) / 4] = width;
        u32[(this.imageData + 4 /* ysize */) / 4] = height;
        const u8 = new Uint8Array(this.memory);
        u8.set(data, this.imageData + 8 /* data */);
    }
    findPath(start, goal, opt = 1) {
        if (this.imageData === null) {
            throw new Error("no image data loaded");
        }
        const ptr = this.exports.theta_star(this.imageData, start, goal, opt);
        if (ptr == 0) {
            return null;
        }
        const u32 = new Uint32Array(this.memory);
        const path = [];
        let current = ptr / 4;
        while (u32[current] != 0xFFFFFFFF) {
            path.push(u32[current]);
            current += 1;
        }
        this.heap.free(ptr);
        return path.reverse();
    }
    findClosest(x0, y0) {
        if (this.imageData === null) {
            throw new Error("no image data loaded");
        }
        return this.exports.find_closest(this.imageData, x0, y0);
    }
}
exports.ThetaStar = ThetaStar;

},{}]},{},[1]);
