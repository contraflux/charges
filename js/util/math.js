/**
 * math
 * 
 * Multivariable calculus computations including partial derivatives, curl, and
 * divergence. Also includes Runge-Kutta method for approximating the solution
 * to differential equations.
 * 
 * @author contraflux
 * @date 10/8/2025
 */

const dt = 1e-5

/**
 * Evaluates the partial derivative of a function with respect to the first input
 *
 * @param {function} F - The function to be operated on
 * @param {float} x - The first coordinate
 * @param {float} y - The second coordinate
 * @returns {float} The partial derative of F with respect to x evaluated at (x, y)
 */
export function partial_x(F, x, y) {
    return ( F(x + dt, y)[0] - F(x, y)[0] ) / dt;
}

/**
 * Evaluates the partial derivative of a function with respect to the second input
 *
 * @param {function} F - The function to be operated on
 * @param {float} x - The first coordinate
 * @param {float} y - The second coordinate
 * @returns {float} The partial derative of F with respect to y evaluated at (x, y)
 */
export function partial_y(F, x, y) {
    return ( F(x, y + dt)[1] - F(x, y)[1] ) / dt;
}

/**
 * Evaluates the divergence of a function
 *
 * @param {function} F - The function to be operated on
 * @param {float} x - The first coordinate
 * @param {float} y - The second coordinate
 * @returns {float} The divergence of F evaluated at (x, y)
 */
export function divergence(F, x, y) {
    return partial_x(F, x, y) + partial_y(F, x, y);
}

/**
 * Evaluates 2-dimensional curl of a function
 *
 * @param {function} F - The function to be operated on
 * @param {float} x - The first coordinate
 * @param {float} y - The second coordinate
 * @returns {float} The 2-dimensional curl of F evaluated at (x, y)
 */
export function curl(F, x, y) {
    const Fy_dx = ( F(x + dt, y)[1] - F(x, y)[1] ) / dt
    const Fx_dy = ( F(x, y + dt)[0] - F(x, y)[0] ) / dt
    return Fy_dx - Fx_dy;
}

/**
 * Advances the approximation of a solution to the differential equation
 * described by F using the Runge-Kutta 4 method by one time step
 *
 * @param {function} F - The function whose solution is to be approximated
 * @param {float} dt - The time step
 * @param {float} x - The current first coordinate of the approximation
 * @param {float} y - The current second coordinate of the approximation
 * @returns {array} The next position in the approximation as [x, y]
 */
export function rk4Step(F, dt, x_0, y_0) {
    const k1 = F(x_0, y_0);
    const k2 = F(x_0 + (dt * k1[0] / 2), y_0 + (dt * k1[1] / 2));
    const k3 = F(x_0 + (dt * k2[0] / 2), y_0 + (dt * k2[1] / 2));
    const k4 = F(x_0 + (dt * k3[0]), y_0 + (dt * k3[1]));

    const x_1 = x_0 + (dt / 6) * (k1[0] + (2 * k2[0]) + (2 * k3[0]) + k4[0]);
    const y_1 = y_0 + (dt / 6) * (k1[1] + (2 * k2[1]) + (2 * k3[1]) + k4[1]);

    return [x_1, y_1];
}

/**
 * Maps a value from [min, max] to [0, 1], with 0 mapping to 0.5
 * 
 * @param {float} min - The minimum value of the initial range
 * @param {float} max - The maximum value of the inital range
 * @param {float} value - The value to be mapped
 * @returns {float} The value mapped to the new range
 */
export function map(min, max, value) {
    const max_abs = Math.abs(max);
    const min_abs = Math.abs(min);

    const range = max_abs > min_abs ? max_abs * 2 : min_abs * 2;

    return (value / range ) + 0.5;
}