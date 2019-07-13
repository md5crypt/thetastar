#include <stdint.h>
#include <stdbool.h>

typedef struct {
	uint32_t xsize;
	uint32_t ysize;
	uint8_t data[0];
} grid_t;

uint32_t grid_neighborhood(const grid_t* grid, uint32_t value, uint32_t* output);
bool grid_line_of_sight(const grid_t* grid, uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1);
