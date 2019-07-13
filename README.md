# Performance Theta* for the browser

I needed fast any angle path finding. I implemented it in pure JS using only typed arrays but it ended up being to slow. So I re-implemented it in C / Webassembly and it's 60x faster. Enjoy.

Implementation based on Alex J. Champandard's article: http://aigamedev.com/open/tutorial/lazy-theta-star/

The output `.wasm` file is around 4kB.

## Online demo

You can find an interactive demo running directly from git here: https://md5crypt.github.io/thetastar/

## Building

You need to install upstream emscripten to compile the Webassembly part

```bash
git clone https://github.com/emscripten-core/emsdk.git
./emsdk install sdk-upstream-64bit
./emsdk activate sdk-upstream-64bit
source emsdk_env.sh # set up env
```

After that is *should* be a simple `make all` but emscripten changes their s*it so often that it probably will not work when you try it :)

To build the demo first do a `npm install` and then `make all`

## Using the code

You have to options:

1. get the pre-compiled `.wasm` file from the demo folder and use it with thetastar.ts in your project. See the demo code for a good example how do do it.
2. if you already are using Webassembly just dump the c source to your project. The only dependency is malloc.

## thetastar.ts api

A single class named ThetaStar is exported. It's constructor is private and instances should be created via `ThetaStar.create` factory function.

### ThetaStar.create(wasm, memorySize)

An async factory function.

`wasm` is an ArrayBuffer, Resource or a url to the wasm file.

`memorySize` is the amount of memory to allocate. This should be about 24 * max pixel count. For the demo that runs on 1024x1024 bitmaps thats 24 * 1024 * 1024.

The function returns a promise that resolves to the created instance object.

### ThetaStar.loadImageData(data, width, height)

Load an input bitmap into the Webassembly memory. Only one bitmap can be loaded at a time, calling this function again will replace the old bitmap with a new one.

`data` is a Uint8Array with byte per pixel. Any value other than `0` is a "walkable" surface.

`width` / `height` are bitmap dimensions

### ThetaStar.findPath(start, goal, opt)

Run theta* on pre-loaded image data.

`start`, `goal` are coords of the start and end point represented as input bitmap indexes (x + y * width)

`opt` is the theta* heuristic scaler. Use 1 for best paths (no scaling) and values 1 - 2 for faster sub-optimal results. You can play with this value in the interactive demo.

The function returns an array of points (bitmap indexes) that should be connected with lines to create the path or `null` when not path was found.

### ThetaStar.find_closest(x, y)

This is a simple function that finds the closest non-zero bitmap pixel to any arbitrary point. It executes a linear search which should be faster for small bitmaps than any smarter solution.

The function return the found point in form of the input bitmap index.

## theta_star.c api

Two functions are exported that do the same thing as their JavaScript conterparts in `thetastar.ts`:

```c
uint32_t find_closest(grid_t* grid, int32_t x0, int32_t y0);
uint32_t* theta_star(grid_t* grid, uint32_t start, uint32_t goal, double opt);
```

The only difference it the `grid` argument which is a pointer to the following structure holding the bitmap data:

```c
struct grid_t {
	uint32_t xsize;
	uint32_t ysize;
	uint8_t data[0];
};
```
