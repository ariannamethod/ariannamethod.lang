# Basic Prophecy Mechanics
# ariannamethod.lang — prophecy_basic.dsl
# 
# This script demonstrates core prophecy mechanics:
# - Prophecy horizon (how far ahead the field sees)
# - Destiny bias (attractor strength)
# - Prophecy debt accumulation
# - Debt decay over time

# Reset to clean state
RESET_DEBT
RESET_FIELD

# Configure basic prophecy parameters
# Horizon: 7 steps ahead (balanced foresight)
PROPHECY 7

# Destiny bias: 0.35 (moderate attractor pull)
# Higher = stronger pull toward destined states
# Lower = more freedom, higher potential debt
DESTINY 0.35

# Set debt decay rate
# Each step: debt *= 0.998
# Slower decay = longer memory of failed prophecies
LAW DEBT_DECAY 0.998

# Observe:
# - HUD shows "debt" metric increasing when destined != manifested
# - Obelisks glow brighter when debt is high
# - Walls stabilize when debt is low (field aligned with destiny)

ECHO Prophecy horizon: 7 steps, destiny bias: 0.35

# Now walk forward (WASD) and watch:
# 1. Debt accumulates when your movement diverges from prediction
# 2. Debt decays slowly over time
# 3. Obelisks mark high-debt locations with brighter glow

# To increase prophecy power, try:
# PROPHECY 12
# DESTINY 0.70

# To make prophecy more chaotic, try:
# PROPHECY 3
# DESTINY 0.15
