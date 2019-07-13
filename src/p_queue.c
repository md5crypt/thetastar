#include <stdlib.h>
#include <string.h>
#include "p_queue.h"

static void p_queue_heap_up(p_queue_t* queue, uint32_t item) {
	uint32_t a = item;
	while (a > 0) {
		uint32_t b = (a - 1) >> 1;
		if (queue->items[a].weight > queue->items[b].weight) {
			break;
		}
		p_queue_item_t tmp = queue->items[a];
		queue->items[a] = queue->items[b];
		queue->items[b] = tmp;
		queue->map[queue->items[a].value] = a;
		queue->map[queue->items[b].value] = b;
		a = b;
	}
}

static void p_queue_heap_down(p_queue_t* queue, uint32_t item) {
	uint32_t a = item;
	while (true) {
		uint32_t left = ((a << 1) + 1);
		uint32_t right = left + 1;
		if (left >= queue->bottom) {
			break;
		}
		uint32_t b;
		if ((right < queue->bottom) && (queue->items[left].weight > queue->items[right].weight)) {
			b = right;
		} else {
			b = left;
		}
		if (queue->items[a].weight <= queue->items[b].weight) {
			break;
		}
		p_queue_item_t tmp = queue->items[a];
		queue->items[a] = queue->items[b];
		queue->items[b] = tmp;
		queue->map[queue->items[a].value] = a;
		queue->map[queue->items[b].value] = b;
		a = b;
	}
}

void p_queue_create(p_queue_t* queue, uint32_t size) {
	uint8_t* memory = (uint8_t*)malloc((sizeof(p_queue_item_t) + sizeof(uint32_t)) * size);
	queue->bottom = 0;
	queue->items = (p_queue_item_t*)memory;
	queue->map = (uint32_t*)(memory + (sizeof(p_queue_item_t) * size));
	memset(queue->map, 0xFF, size * sizeof(uint32_t));
	memset(queue->items, 0, size * sizeof(p_queue_item_t));
}

void p_queue_free(p_queue_t* queue) {
	free(queue->items);
}

void p_queue_push(p_queue_t* queue, uint32_t value, uint32_t weight) {
	if (queue->map[value] != 0xFFFFFFFF) {
		uint32_t item = queue->map[value];
		uint32_t old = queue->items[item].weight;
		queue->items[item].weight = weight;
		if (old < weight) {
			p_queue_heap_up(queue, item);
		} else {
			p_queue_heap_down(queue, item);
		}
	} else {
		queue->items[queue->bottom] = (p_queue_item_t) {.weight = weight, .value = value};
		queue->map[value] = queue->bottom;
		queue->bottom += 1;
		p_queue_heap_up(queue, queue->bottom - 1);
	}
}

uint32_t p_queue_pop(p_queue_t* queue) {
	queue->bottom -= 1;
	uint32_t value = queue->items[0].value;
	queue->map[value] = 0xFFFFFFFF;
	if (queue->bottom > 0) {
		queue->items[0] = queue->items[queue->bottom];
		queue->map[queue->items[0].value] = 0;
		p_queue_heap_down(queue, 0);
	}
	return value;
}
