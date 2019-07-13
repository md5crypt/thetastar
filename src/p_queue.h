#pragma once

#include <stdint.h>
#include <stdbool.h>

typedef struct {
	uint32_t value;
	uint32_t weight;
} p_queue_item_t;


typedef struct {
	p_queue_item_t* items;
	uint32_t* map;
	uint32_t bottom;
} p_queue_t;

static inline bool p_queue_has(const p_queue_t* queue, uint32_t value) {
	return queue->map[value] != 0xFFFFFFFF;
}

static inline uint32_t p_queue_size(const p_queue_t* queue) {
	return queue->bottom;
}

void p_queue_create(p_queue_t* queue, uint32_t size);
void p_queue_free(p_queue_t* queue);
void p_queue_push(p_queue_t* queue, uint32_t value, uint32_t weight);
uint32_t p_queue_pop(p_queue_t* queue);
