// inject instantiateStreaming to lib.dom.d.ts as it's missing
declare global {
	namespace WebAssembly {
		function instantiateStreaming(response: Response, importObject?: any): Promise<WebAssemblyInstantiatedSource>
	}
}

export const enum void_ptr_t {}
export const enum uint32_t {}
export const enum float64_t {}

export const enum grid_t {
	xsize = 0,
	ysize = 4,
	data = 8
}

type void_t = grid_t | void_ptr_t

interface WasmEnv {
	memory: WebAssembly.Memory
	malloc: (size: uint32_t) => void_t
	free: (ptr: void_t) => void
}

interface WasmExports {
	__data_end: number,
	stackSave: () => void_t,
	stackAlloc: (amount: uint32_t) => void_t,
	stackRestore: (ptr: void_t) => void,
	find_closest: (grid: grid_t, x0: uint32_t, y0: uint32_t) => uint32_t
	theta_star: (grid: grid_t, start: uint32_t, goal: uint32_t, opt: float64_t) => void_t
}

interface DumbestHeapEverSegment {
	next: DumbestHeapEverSegment | null
	prev: DumbestHeapEverSegment | null
	end: void_t
}

class DumbestHeapEver {
	private end: void_t
	private last: DumbestHeapEverSegment
	private map: Map<void_t, DumbestHeapEverSegment>

	constructor(start: void_t = 0, end: void_t = 0) {
		this.map = new Map()
		this.end = end
		this.last = {end: start, prev: null, next: null}
	}

	public move(start: void_t, end: void_t) {
		if (this.map.size != 0) {
			throw new Error("can not move not empty heap")
		}
		this.end = end
		this.last = {end: start, prev: null, next: null}
	}

	public malloc(size: number) {
		const ptr = this.last.end
		const top = ptr + ((size + 3) & ~3) // I don't even care
		if (top >= this.end) {
			throw new Error("out of memory")
		}
		const segment: DumbestHeapEverSegment = {
			prev: this.last,
			next: null,
			end: top
		}
		this.map.set(ptr, segment)
		this.last.next = segment
		this.last = segment
		return ptr
	}

	public free(ptr: void_t) {
		const current = this.map.get(ptr)
		this.map.delete(ptr)
		if (!current) {
			throw new Error(`called free with bad address: ${ptr}`)
		}
		if (current.next === null) {
			this.last = current.prev!
			this.last.next = null
		} else {
			current.next.prev = current.prev
			current.prev!.next = current.next
		}
	}
}

export class ThetaStar {
	private heap: DumbestHeapEver
	private memory: ArrayBuffer
	private exports: WasmExports
	private imageData: grid_t | null

	private constructor(heap: DumbestHeapEver, memory: ArrayBuffer, exports: WasmExports) {
		this.heap = heap
		this.memory = memory
		this.exports = exports
		this.imageData = null
	}

	public static async create(wasm: ArrayBuffer | Response | string, memorySize = 0x10000) {
		const memory = new WebAssembly.Memory({
			'initial': Math.ceil(memorySize >> 16),
		})
		const heap = new DumbestHeapEver()
		const env: WasmEnv = {
			memory,
			malloc: size => heap.malloc(size),
			free: ptr => heap.free(ptr)
		}
		const callback = (result: WebAssembly.WebAssemblyInstantiatedSource) => {
			const exports = result.instance.exports as WasmExports
			heap.move(exports.stackSave(), memory.buffer.byteLength)
			return new ThetaStar(heap, memory.buffer, exports)
		}
		if (wasm instanceof ArrayBuffer) {
			return WebAssembly.instantiate(wasm, {env}).then(callback)
		} else if (wasm instanceof Response) {
			return WebAssembly.instantiateStreaming(wasm, {env}).then(callback)
		} else {
			return fetch(wasm).then(response => WebAssembly.instantiateStreaming(response, {env})).then(callback)
		}
	}

	public loadImageData(data: Uint8Array, width: number, height: number) {
		if (this.imageData !== null) {
			this.heap.free(this.imageData)
		}
		this.imageData = this.heap.malloc((width * height) + 8) as grid_t
		const u32 = new Uint32Array(this.memory)
		u32[(this.imageData + grid_t.xsize) / 4] = width
		u32[(this.imageData + grid_t.ysize) / 4] = height
		const u8 = new Uint8Array(this.memory)
		u8.set(data, this.imageData + grid_t.data)
	}

	public findPath(start: number, goal: number, opt = 1) {
		if (this.imageData === null) {
			throw new Error("no image data loaded")
		}
		const ptr = this.exports.theta_star(this.imageData, start, goal, opt)
		if (ptr == 0) {
			return null
		}
		const u32 = new Uint32Array(this.memory)
		const path: number[] = []
		let current = ptr / 4
		while(u32[current] != 0xFFFFFFFF) {
			path.push(u32[current])
			current += 1
		}
		this.heap.free(ptr)
		return path.reverse()
	}

	public findClosest(x0: number, y0: number): number {
		if (this.imageData === null) {
			throw new Error("no image data loaded")
		}
		return this.exports.find_closest(this.imageData, x0, y0)
	}
}
