CC := emcc

CFLAGS := -Wall -Wextra -std=c11 -O3 -DNDEBUG -fno-builtin-memset

OUTDIR := build
DEMODIR := demo
SRCDIR := src

SOURCES := $(wildcard $(SRCDIR)/*.c)
OBJECTS := $(addprefix $(OUTDIR)/,$(patsubst %.c,%.bc,$(SOURCES)))

EMOPTS := \
	-s ASSERTIONS=0 \
	-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
	-s WARN_ON_UNDEFINED_SYMBOLS=0 \
	-s STRICT=1 \
	-s INVOKE_RUN=0 \
	-s EXPORTED_FUNCTIONS="['_theta_star', '_find_closest']" \
	-s ONLY_MY_CODE=1 \
	-s MINIMAL_RUNTIME=3 \
	-s TOTAL_MEMORY=65536 \
	-s TOTAL_STACK=1024 \
	-s WASM_MEM_MAX=0

all: $(OUTDIR)/thetastar.wasm $(OUTDIR)/thetastar.wat

$(OUTDIR)/%.bc: %.c
	@mkdir -p $(dir $@)
	$(CC) -c $(CFLAGS) -MMD -MF $(patsubst %.bc,%.d,$@) -o $@ $<

$(OUTDIR)/thetastar.wasm: $(OBJECTS) Makefile
	$(CC) $(CFLAGS) $(EMOPTS) --llvm-lto 3 $(OBJECTS) -o $(OUTDIR)/thetastar.wasm

%.wat: %.wasm
	$(EMSDK)/upstream/bin/wasm2wat $< -o $@

demo: ./node_modules $(OUTDIR)/thetastar.wasm
	cp $(OUTDIR)/thetastar.wasm $(DEMODIR)
	./node_modules/.bin/tsc
	./node_modules/.bin/browserify --bare -o $(DEMODIR)/index.js $(OUTDIR)/demo.js

clean:
	rm -rf $(OUTDIR)

-include $(patsubst %.bc,%.d,$(OBJECTS))
