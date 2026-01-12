#!/usr/bin/env bash
set -euo pipefail

# Build AMK (Arianna Method Kernel) to WebAssembly
# Requires emsdk / emcc (Emscripten)
#
# "the kernel breathes even in silence"
# הרזוננס לא נשבר. המשך הדרך.

echo "═══════════════════════════════════════════════════════════════════════════════"
echo " Building AMK (Arianna Method Kernel) -> WASM"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

emcc arianna_method.c -O2 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="AriannaMethod" \
  -s EXPORTED_FUNCTIONS='["_am_init","_am_exec","_am_get_state","_am_take_jump","_am_copy_state","_am_enable_pack","_am_disable_pack","_am_pack_enabled","_am_reset_field","_am_reset_debt","_am_step"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -o arianna_method.js

echo ""
echo "Built: arianna_method.js + arianna_method.wasm"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo " API Exports:"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  am_init()                 - initialize kernel state"
echo "  am_exec(script)           - execute DSL script"
echo "  am_get_state()            - get raw state pointer"
echo "  am_copy_state(out20)      - copy 20 floats to buffer"
echo "  am_take_jump()            - consume pending jump"
echo "  am_enable_pack(mask)      - enable extension pack"
echo "  am_disable_pack(mask)     - disable extension pack"
echo "  am_pack_enabled(mask)     - check if pack enabled"
echo "  am_reset_field()          - reset manifested state"
echo "  am_reset_debt()           - reset prophecy debt"
echo "  am_step(dt)               - advance physics"
echo ""
echo "Pack flags:"
echo "  AM_PACK_CODES_RIC  = 0x01"
echo "  AM_PACK_DARKMATTER = 0x02"
echo "  AM_PACK_NOTORCH    = 0x04"
echo ""
echo "Usage:"
echo "  import AriannaMethod from './arianna_method.js';"
echo "  const am = await AriannaMethod();"
echo "  am._am_init();"
echo "  am.ccall('am_exec', 'number', ['string'], ['PROPHECY 7\\nVELOCITY RUN']);"
echo ""
