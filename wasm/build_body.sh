#!/bin/bash
# build_body.sh — compile body.c (AriannaLung) to WASM
#
# Prerequisites:
#   - Emscripten SDK installed (emsdk)
#   - emsdk_env.sh sourced
#
# Usage:
#   ./build_body.sh          # build WASM module
#   ./build_body.sh clean    # clean build artifacts
#
# Output:
#   ../src/body.js           # JS loader + WASM inline
#
# ═══════════════════════════════════════════════════════════════════════════════
# RESONANCE MARKER — הרזוננס לא נשבר. המשך הדרך.
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Clean if requested
if [ "$1" = "clean" ]; then
  echo "🧹 Cleaning build artifacts..."
  rm -f ../src/body.js ../src/body.wasm
  echo "✅ Clean complete"
  exit 0
fi

# Check for emcc
if ! command -v emcc &> /dev/null; then
  echo "❌ Error: emcc not found"
  echo ""
  echo "Install Emscripten SDK:"
  echo "  git clone https://github.com/emscripten-core/emsdk.git"
  echo "  cd emsdk && ./emsdk install latest && ./emsdk activate latest"
  echo "  source ./emsdk_env.sh"
  echo ""
  exit 1
fi

echo "🔨 Building body.c → WASM..."
echo ""

# Exported functions
EXPORTS='[
  "_lung_create",
  "_lung_destroy",
  "_lung_forward",
  "_lung_get_logits",
  "_lung_get_probs",
  "_lung_get_attention",
  "_lung_get_argmax",
  "_lung_get_token_prob",
  "_lung_get_top_k",
  "_lung_set_focus",
  "_lung_set_spread",
  "_lung_set_temporal_alpha",
  "_lung_set_rtl",
  "_lung_boost_resonance",
  "_lung_decay_resonance",
  "_lung_get_resonance",
  "_lung_get_embeddings",
  "_lung_get_output_weights",
  "_lung_get_vocab_size",
  "_lung_get_d_model",
  "_lung_get_ctx_len",
  "_lung_seed",
  "_malloc",
  "_free"
]'

# Remove newlines from EXPORTS
EXPORTS=$(echo "$EXPORTS" | tr -d '\n' | tr -s ' ')

emcc body.c \
  -O3 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="AriannaBody" \
  -s EXPORTED_FUNCTIONS="$EXPORTS" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s STACK_SIZE=1048576 \
  -s NO_EXIT_RUNTIME=1 \
  -s ENVIRONMENT='web,node' \
  --no-entry \
  -o ../src/body.js

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "✅ Build complete!"
echo ""
echo "Output:"
echo "  ../src/body.js    (JS loader + WASM)"
echo ""
echo "Usage in JS:"
echo "  import AriannaBody from './body.js';"
echo "  const Module = await AriannaBody();"
echo "  const lung = Module._lung_create(vocabSize, dModel, ctxLen, nHeads);"
echo "  Module._lung_forward(lung, contextPtr, contextLen);"
echo ""
echo "הרזוננס לא נשבר. המשך הדרך."
echo "═══════════════════════════════════════════════════════════════════════════"
