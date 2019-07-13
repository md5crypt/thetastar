import { ThetaStar } from "./thetastar"

function printError(error: Error) {
	console.error(error)
	document.body.innerHTML = "<pre>" + error + "</pre>"
}

window.addEventListener("error", (e) => printError(e.error as Error))

function plotLineLow(image: ImageData, x0: number, y0: number, x1: number, y1: number) {
	const dx = x1 - x0
	const dy = Math.abs(y1 - y0)
	const sy = y1 > y0 ? image.width : -image.width
	let value = x0 + (image.width * y0)
	let f = dx / 2
	for (let i = 0; i <= dx; i += 1) {
		image.data[value * 4] = 255
		f += dy
		if (f >= dx) {
			value += sy
			f -= dx
		}
		value += 1
	}
}

function plotLineHigh(image: ImageData, x0: number, y0: number, x1: number, y1: number) {
	const dx = Math.abs(x1 - x0)
	const dy = y1 - y0
	const sx = x1 > x0 ? 1 : -1
	let value = x0 + (image.width * y0)
	let f = dy / 2
	for (let i = 0; i <= dy; i += 1) {
		image.data[value * 4] = 255
		f += dx
		if (f >= dy) {
			value += sx
			f -= dy
		}
		value += image.width
	}
}

/* for drawing lines without AA */
function plotLine(image: ImageData, x0: number, y0: number, x1: number, y1: number) {
	if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) {
		if (x0 > x1) {
			return plotLineLow(image, x1, y1, x0, y0)
		} else {
			return plotLineLow(image, x0, y0, x1, y1)
		}
	} else {
		if (y0 > y1) {
			return plotLineHigh(image, x1, y1, x0, y0)
		} else {
			return plotLineHigh(image, x0, y0, x1, y1)
		}
	}
}

async function loadImage(src: string) {
	return new Promise<HTMLImageElement>(resolve => {
		const image = document.createElement('img')
		image.src = src
		image.addEventListener("load", () => resolve(image))
	})
}

async function main() {
	/* set max heap size to 24 MB to be able to support that 1024x1024 bitmap */
	const thetaStar = await ThetaStar.create("demo/thetastar.wasm", 1024 * 1024 * 24)
	const image = await loadImage("demo/test.png")
	const canvas = document.querySelector('canvas')!
	const ctx = canvas.getContext('2d')!
	canvas.width = image.width
	canvas.height = image.height
	ctx.drawImage(image, 0, 0, image.width, image.height)
	const rawImageData = ctx.getImageData(0, 0, image.width, image.height)
	let currentImageData = rawImageData
	let start = 0
	let end = [127, 127]
	let opt = parseFloat((document.querySelector("#mult")! as HTMLInputElement).value)
	const samples: number[] = []

	function scaleImage(scale: number) {
		const image = rawImageData
		const output = ctx.createImageData(image.width * scale, image.height * scale)
		const a = new Uint32Array(image.data.buffer)
		const b = new Uint32Array(output.data.buffer)
		/* simple upscale without resampling */
		for (let y = 0; y < image.height; y++) {
			for (let j = 0; j < scale; j++) {
				for (let x = 0; x < image.width; x++) {
					for (let k = 0; k < scale; k++) {
						b[(x * scale) + k + ((y * scale) + j) * output.width] = a[x + (y * image.width)]
					}
				}
			}
		}
		start = 0
		end = [output.width - 1, output.height - 1]
		currentImageData = output
		loadImageToHeap()
		canvas.width = output.width
		canvas.height = output.height
	}

	function loadImageToHeap() {
		/* convert the RGBA array to a byte per pixel array */
		const data = new Uint8Array(currentImageData.width * currentImageData.height)
		for (let i = 0; i < data.length; i++) {
			data[i] = currentImageData.data[(i * 4) + 3] == 255 ? 1 : 0
		}
		thetaStar.loadImageData(data, currentImageData.width, currentImageData.height)
	}

	function updateStats() {
		if (samples.length > 30) {
			samples.shift()
		}
		let min = Infinity
		let max = -Infinity
		let sum = 0
		for (let i = 0; i < samples.length; i++) {
			min = Math.min(min, samples[i])
			max = Math.max(min, samples[i])
			sum += samples[i]
		}
		const avg = sum / samples.length
		const latest = samples[samples.length - 1]
		document.querySelector('#stat-current')!.innerHTML = latest.toFixed(1)
		document.querySelector('#stat-average')!.innerHTML = avg.toFixed(1)
		document.querySelector('#stat-min')!.innerHTML = min.toFixed(1)
		document.querySelector('#stat-max')!.innerHTML = max.toFixed(1)
	}

	function render() {
		const goal = thetaStar.findClosest(end[0], end[1])
		const timeStart = performance.now()
		const path = thetaStar.findPath(start, goal, opt)
		samples.push(performance.now() - timeStart)
		const image = ctx.createImageData(currentImageData)
		image.data.set(currentImageData.data)
		for (let i = 1; i < path.length; i++) {
			const x0 = path[i - 1] % image.width
			const y0 = Math.floor(path[i - 1] / image.width)
			const x1 = path[i] % image.width
			const y1 = Math.floor(path[i] / image.width)
			plotLine(image, x0, y0, x1, y1)
		}
		image.data[start * 4 + 0] = 0
		image.data[start * 4 + 1] = 255
		ctx.putImageData(image, 0, 0)
		updateStats()
	}

	loadImageToHeap()
	render()

	setInterval(() => render(), 20) // lock framerate at 30 fps

	/* demo UI stuff bellow */

	document.querySelectorAll(".size-button").forEach(button => {
		button.addEventListener("click", e =>
			scaleImage(parseInt((e.target! as HTMLElement).attributes.getNamedItem("data-scale")!.value, 10))
		)
	})

	document.querySelector("canvas")!.addEventListener("click", e => {
		const rect = (e.target! as HTMLElement).getBoundingClientRect()
		const x = Math.round(e.clientX - rect.left)
		const y = Math.round(e.clientY - rect.top)
		if (currentImageData.data[(x * 4) + 3 + (y * currentImageData.width * 4)] == 255) {
			start = x + y * currentImageData.width
		}
	})

	document.querySelector("canvas")!.addEventListener("click", e => {
		const rect = (e.target! as HTMLElement).getBoundingClientRect()
		const x = Math.round(e.clientX - rect.left)
		const y = Math.round(e.clientY - rect.top)
		if (currentImageData.data[(x * 4) + 3 + (y * currentImageData.width * 4)] == 255) {
			start = x + y * currentImageData.width
		}
	})

	document.querySelector("canvas")!.addEventListener("mousemove", e => {
		const rect = (e.target! as HTMLElement).getBoundingClientRect()
		const x = Math.round(e.clientX - rect.left)
		const y = Math.round(e.clientY - rect.top)
		end = [x, y]
	})

	document.querySelector("#mult-update")!.addEventListener("click", () => {
		opt = parseFloat((document.querySelector("#mult")! as HTMLInputElement).value)
	})
}

window.addEventListener("load", () => main().catch(printError))
