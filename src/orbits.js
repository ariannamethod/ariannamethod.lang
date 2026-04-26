// orbits.js — Planetary Dissonance Engine
// Ported from klaus.c (ariannamethod)
// Orbital mechanics as weight modulators.

export const ORBITAL_PERIODS = {
    MERCURY: 87.97,
    VENUS: 224.70,
    EARTH: 365.25,
    MARS: 686.97,
    JUPITER: 4332.59,
    SATURN: 10759.22
};

export const J2000_LONGITUDES = {
    MERCURY: 252.25,
    VENUS: 181.98,
    EARTH: 100.46,
    MARS: 355.45,
    JUPITER: 34.40,
    SATURN: 49.94
};

export class Orbits {
    constructor() {
        this.j2000_epoch = 946728000000; // Jan 1, 2000 12:00 UTC in ms
    }

    getDissonance() {
        const now = Date.now();
        const days = (now - this.j2000_epoch) / (1000 * 60 * 60 * 24);

        let cosSum = 0;
        let sinSum = 0;
        const keys = Object.keys(ORBITAL_PERIODS);

        keys.forEach(planet => {
            let theta = J2000_LONGITUDES[planet] + 360.0 * (days / ORBITAL_PERIODS[planet]);
            theta = (theta % 360.0) * (Math.PI / 180.0); // to radians
            cosSum += Math.cos(theta);
            sinSum += Math.sin(theta);
        });

        cosSum /= keys.length;
        sinSum /= keys.length;

        // Kuramoto order parameter R
        const R = Math.sqrt(cosSum * cosSum + sinSum * sinSum);
        return 1.0 - R; // 0 = Alignment (Resonance), 1 = Chaos (Dissonance)
    }

    getPlanetPhases() {
        const now = Date.now();
        const days = (now - this.j2000_epoch) / (1000 * 60 * 60 * 24);
        const phases = {};
        
        Object.keys(ORBITAL_PERIODS).forEach(planet => {
            let theta = J2000_LONGITUDES[planet] + 360.0 * (days / ORBITAL_PERIODS[planet]);
            phases[planet] = (theta % 360.0) / 360.0; // 0..1
        });
        
        return phases;
    }
}
