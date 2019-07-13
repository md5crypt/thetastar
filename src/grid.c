#include "grid.h"

#define DIAGONAL_MOVES 1

uint32_t grid_neighborhood(const grid_t* grid, uint32_t value, uint32_t* output) {
	uint32_t i = 0;
	uint32_t x = value % grid->xsize;
	uint32_t y = value / grid->xsize;
	if (x < (grid->xsize - 1)) {
		if (grid->data[value + 1]) {
			output[i] = value + 1;
			i += 1;
		}
#ifdef DIAGONAL_MOVES
		if (y > 0) {
			if (grid->data[value + 1 - grid->xsize]) {
				output[i] = value + 1 - grid->xsize;
				i += 1;
			}
		}
		if (y < (grid->ysize - 1)) {
			if (grid->data[value + 1 + grid->xsize]) {
				output[i] = value + 1 + grid->xsize;
				i += 1;
			}
		}
#endif
	}
	if (x > 0) {
		if (grid->data[value - 1]) {
			output[i] = value - 1;
			i += 1;
		}
#ifdef DIAGONAL_MOVES
		if (y > 0) {
			if (grid->data[value - 1 - grid->xsize]) {
				output[i] = value - 1 - grid->xsize;
				i += 1;
			}
		}
		if (y < (grid->ysize - 1)) {
			if (grid->data[value - 1 + grid->xsize]) {
				output[i] = value - 1 + grid->xsize;
				i += 1;
			}
		}
#endif
	}
	if ((y < (grid->ysize - 1)) && grid->data[value + grid->xsize]) {
		output[i] = value + grid->xsize;
		i += 1;
	}
	if ((y > 0) && grid->data[value - grid->xsize]) {
		output[i] = value - grid->xsize;
		i += 1;
	}
	return i;
}


static inline uint32_t abs(int32_t a) {
	return (a < 0) ? -a : a;
}

static inline bool plot_low(const grid_t* grid, uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1) {
	int32_t dx = x1 - x0;
	int32_t dy = y1 - y0;
	int32_t sy;
	if (dy < 0) {
		dy = -dy;
		sy = -grid->xsize;
	} else {
		sy = grid->xsize;
	}
	uint32_t value = x0 + (grid->xsize * y0);
	uint32_t f = dx / 2;
	for (uint32_t i = 1; i <= (uint32_t)dx; i += 1) {
		f += dy;
		if (f >= (uint32_t)dx) {
			value += sy;
			f -= dx;
		}
		value += 1;
		if (grid->data[value] == 0) {
			return false;
		}
	}
	return true;
}

static inline bool plot_high(const grid_t* grid, uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1) {
	int32_t dx = x1 - x0;
	int32_t dy = y1 - y0;
	int32_t sx;
	if (dx < 0) {
		dx = -dx;
		sx = -1;
	} else {
		sx = 1;
	}
	uint32_t value = x0 + (grid->xsize * y0);
	uint32_t f = dy / 2;
	for (uint32_t i = 1; i <= (uint32_t)dy; i += 1) {
		f += dx;
		if (f >= (uint32_t)dy) {
			value += sx;
			f -= dy;
		}
		value += grid->xsize;
		if (grid->data[value] == 0) {
			return false;
		}
	}
	return true;
}

bool grid_line_of_sight(const grid_t* grid, uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1) {
	if (abs(x1 - x0) > abs(y1 - y0)) {
		if (x0 > x1) {
			return plot_low(grid, x1, y1, x0, y0);
		} else {
			return plot_low(grid, x0, y0, x1, y1);
		}
	} else {
		if (y0 > y1) {
			return plot_high(grid, x1, y1, x0, y0);
		} else {
			return plot_high(grid, x0, y0, x1, y1);
		}
	}
}
