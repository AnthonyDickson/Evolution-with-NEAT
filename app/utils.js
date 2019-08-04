/** A collection of miscellaneous functions. */

import {Engine} from "matter-js";

/**
 * Generate a random gaussian number.
 * This uses an implementation of the Box–Muller transform: https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
 *
 * @param mu The mean of the gaussian distribution to sample from.
 * @param sigma The standard deviation of the gaussian distribution to sample from.
 * @returns {number} A number sampled from the specified gaussian distribution.
 */
export function randomGaussian(mu = 0, sigma = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    return n * Math.abs(sigma) + mu;
}

/**
 * Sample a random integer from the given range.
 *
 * @param min The smallest integer allowed.
 * @param max The largest integer allowed plus one.
 * @returns {number} An integer in the range [`min`, `max`)
 */
export function randomInt(min = 0, max = 1) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/**
 * Clip a value to the defined range.
 * @param x The value to clip.
 * @param min The smallest value in the range.
 * @param max The largest value in the range.
 * @returns {number} The value clipped to the range [`min`, `max`].
 */
export function clip(x, min = -Infinity, max = Infinity) {
    return Math.max(min, Math.min(x, max));
}

/**
 * A clipped version of `randomGaussian()`.
 * @param options A dictionary containing the parameters `mu`, `sigma`, `min` and `max`.
 * @see randomGaussian
 * @see clip
 * @returns {number} A number sampled from the specified gaussian distribution clipped to the range [`min`, `max`].
 */
export function clippedRandomGaussian(options) {
    return clip(randomGaussian(options.mu, options.sigma), options.min, options.max);
}

/**
 * Create a new Matter.Engine instance.
 * @param bounds {{min: {x: number?, y: number?}?, max: {x: number?, y: number?}?}} The bounds of the world.
 * @returns {{worldWidth: *, engine: *}} The engine and world width (max extent along the x-axis).
 */
export function createEngine(bounds) {
    const engine = Engine.create();

    engine.world.bounds = Object.assign(engine.world.bounds, bounds);
    const worldWidth = Math.abs(engine.world.bounds.max.x) + Math.abs(engine.world.bounds.min.x);

    return {engine, worldWidth};
}