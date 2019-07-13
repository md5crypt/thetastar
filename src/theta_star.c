#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "theta_star.h"
#include "p_queue.h"

typedef struct {
	uint32_t parent;
	uint32_t weight;
} node_info_t;

static inline uint32_t abs_int32(int32_t a) {
	return (a < 0) ? -a : a;
}

static inline uint32_t distance(uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1) {
	int32_t dx = x0 - x1;
	int32_t dy = y0 - y1;
	return (uint32_t)(sqrt((dx * dx) + (dy * dy)) * (1 << 16));
}

static inline uint32_t distance_scaled(uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1, double scale) {
	int32_t dx = x0 - x1;
	int32_t dy = y0 - y1;
	return (uint32_t)(sqrt((dx * dx) + (dy * dy)) * scale * (1 << 16));
}

uint32_t find_closest(grid_t* grid, int32_t x0, int32_t y0) {
	uint32_t index = 0;
	uint32_t result = 0;
	uint32_t result_value = 0xFFFFFFFF;
	int32_t dy = 0 - y0;
	for (uint32_t y = 0; y < grid->ysize; y++) {
		int32_t dx = 0 - x0;
		for (uint32_t x = 0; x < grid->xsize; x++) {
			if (grid->data[index]) {
				uint32_t dist = (dx * dx) + (dy * dy);
				if (dist < result_value) {
					result_value = dist;
					result = index;
				}
			}
			index += 1;
			dx += 1;
		}
		dy += 1;
	}
	return result;
}

uint32_t* theta_star(grid_t* grid, uint32_t start, uint32_t goal, double opt) {
	if ((grid->data[start] == 0) || (grid->data[goal] == 0)) {
		return NULL;
	}
	p_queue_t queue;
	node_info_t* node_info = (node_info_t*)malloc(grid->xsize * grid->ysize * sizeof(node_info_t));
	for (uint32_t i = 0; i < grid->xsize * grid->ysize; i++) {
		node_info[i].parent = 0xFFFFFFFF;
		node_info[i].weight = 0xFFFFFFFF;
	}
	p_queue_create(&queue, grid->xsize * grid->ysize);
	uint32_t goal_x = goal % grid->xsize;
	uint32_t goal_y = goal / grid->xsize;
	node_info[start].parent = start;
	node_info[start].weight = 0;
	p_queue_push(&queue, start, distance(start % grid->xsize, start / grid->xsize, goal_x, goal_y));
	uint32_t neighborhood[8];
	while (p_queue_size(&queue) > 0) {
		uint32_t current = p_queue_pop(&queue);
		uint32_t x = current % grid->xsize;
		uint32_t y = current / grid->xsize;
		uint32_t parent = node_info[current].parent;
		uint32_t px = parent % grid->xsize;
		uint32_t py = parent / grid->xsize;
		uint32_t neighborhood_size = grid_neighborhood(grid, current, neighborhood);
		if (!grid_line_of_sight(grid, px, py, x, y)) {
			node_info[current].weight = 0xFFFFFFFF;
			for (uint32_t i = 0; i < neighborhood_size; i++) {
				uint32_t node = neighborhood[i];
				if (!p_queue_has(&queue, node) && (node_info[node].parent != 0xFFFFFFFF)) {
					uint32_t weight = node_info[node].weight;
					if (abs_int32(current - node) > grid->xsize) {
						weight += (uint32_t)(sqrt(2) * (1 << 16));
					} else {
						weight += (1 << 16);
					}
					if (weight < node_info[current].weight) {
						node_info[current].weight = weight;
						node_info[current].parent = node;
					}
				}
			}
			parent = node_info[current].parent;
			px = parent % grid->xsize;
			py = parent / grid->xsize;
		}
		if (current == goal) {
			break;
		}
		for (uint32_t i = 0; i < neighborhood_size; i++) {
			uint32_t node = neighborhood[i];
			if ((node_info[node].parent == 0xFFFFFFFF) || p_queue_has(&queue, node)) {
				uint32_t new_x = node % grid->xsize;
				uint32_t new_y = node / grid->xsize;
				uint32_t weight = node_info[parent].weight + distance(px, py, new_x, new_y);
				if (node_info[node].weight > weight) {
					node_info[node].weight = weight;
					node_info[node].parent = parent;
					p_queue_push(&queue, node, weight + distance_scaled(goal_x, goal_y, new_x, new_y, opt));
				}
			}
		}
	}
	p_queue_free(&queue);
	if (node_info[goal].parent == 0xFFFFFFFF) {
		free(node_info);
		return NULL;
	}
	uint32_t current = goal;
	uint32_t size = 0;
	while (current != start) {
		if (size > 1000) {
			break;
		}
		node_info[size].weight = current;
		size += 1;
		current = node_info[current].parent;
	}
	node_info[size].weight = start;
	size += 1;
	uint32_t* output = (uint32_t*)node_info;
	for (uint32_t i = 0; i < size; i++) {
		output[i] = node_info[i].weight;
	}
	output[size] = 0xFFFFFFFF;
	return output;
}
