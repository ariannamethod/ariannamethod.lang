# Velocity Operators — Movement as Language
# ariannamethod.lang — velocity_modes.dsl
#
# Demonstrates how kinematic state modulates generation temperature:
# - NOMOVE: Observer effect, cold/precise
# - WALK: Balanced exploration
# - RUN: Chaotic, high entropy
# - BACKWARD: Time rewind, debt forgiveness

# Reset field
RESET_DEBT
RESET_FIELD

# ===================================================================
# MODE 1: NOMOVE — Cold Observer
# ===================================================================

VELOCITY NOMOVE

# Effect:
# - Temperature drops to 0.5 (precise expert dominates)
# - Minimal field influence, meditation mode
# - Low entropy, high certainty
# - Useful for: observing patterns, minimal interference

# Adjust expert weights for NOMOVE mode:
EXPERT_PRECISE 0.8      # Conservative, grounded
EXPERT_STRUCTURAL 0.5   # Grammar-focused
EXPERT_SEMANTIC 0.3     # Meaning-focused
EXPERT_CREATIVE 0.1     # Low exploration

ECHO Mode: NOMOVE — observer effect, cold and precise

# Walk around in NOMOVE. Notice:
# - Words are stable, minimal jitter
# - Entropy metric stays low
# - Field barely responds to your presence

# ===================================================================
# MODE 2: WALK — Balanced Exploration
# ===================================================================

VELOCITY WALK

# Effect:
# - Temperature ~0.85 (balanced mixture)
# - Normal field deformation
# - Moderate entropy
# - Default mode for general navigation

# Balanced expert weights:
EXPERT_STRUCTURAL 0.5
EXPERT_SEMANTIC 0.6
EXPERT_CREATIVE 0.4
EXPERT_PRECISE 0.5

ECHO Mode: WALK — balanced exploration and coherence

# This is the standard mode. Field responds normally.

# ===================================================================
# MODE 3: RUN — Chaotic Generation
# ===================================================================

VELOCITY RUN

# Effect:
# - Temperature ~1.2 (creative expert dominates)
# - High entropy, chaotic generation
# - Rapid field deformation
# - Words become unstable, larger, more varied

# Shift weights toward creativity:
EXPERT_CREATIVE 0.9     # Maximum exploration
EXPERT_SEMANTIC 0.6     # Meaning drift
EXPERT_STRUCTURAL 0.3   # Loose grammar
EXPERT_PRECISE 0.1      # Minimal grounding

ECHO Mode: RUN — high entropy chaos, rapid deformation

# Sprint (hold Shift) in RUN mode. Notice:
# - Entropy spikes dramatically
# - Words become large and chaotic
# - Field "boils" with possibility
# - Perplexity increases (model surprised)

# ===================================================================
# MODE 4: BACKWARD — Time Rewind
# ===================================================================

VELOCITY BACKWARD

# Effect:
# - Temporal debt accumulates
# - Prophecy debt DECREASES (forgiveness)
# - Entropy decreases (past is more certain)
# - Structural expert dominates (rewinding needs grammar)

# Rewind-focused weights:
EXPERT_STRUCTURAL 0.9   # Grammar crucial for unwinding
EXPERT_PRECISE 0.7      # Certainty in the past
EXPERT_SEMANTIC 0.4     # Meaning preserved
EXPERT_CREATIVE 0.2     # Low exploration

ECHO Mode: BACKWARD — temporal rewind, debt forgiveness

# Move backward (S key) in BACKWARD mode. Notice:
# - "debt" metric decreases
# - "temporal_debt" accumulates (new metric)
# - Entropy drops (past is more determined)
# - Field "remembers" what was unsaid

# Theory:
# - Forward time: maximize entropy (2nd law)
# - Backward time: minimize entropy (time reversal)
# - Prophecy debt can be "paid back" by rewinding

# ===================================================================
# Advanced: Dynamic Mode Switching
# ===================================================================

# Observe quietly
VELOCITY NOMOVE

# Sprint through chaos
# VELOCITY RUN

# Rewind mistakes
# VELOCITY BACKWARD

# Return to normal
# VELOCITY WALK

# Each mode creates a different "personality" for the field.
# Velocity is not just navigation—it's linguistic modulation.
