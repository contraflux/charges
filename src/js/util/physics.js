/**
 * math
 * 
 * Physics calculations for the electric field, electric force, and updating
 * charge positions and velocities using the Runge-Kutta method.
 * 
 * @author contraflux
 * @date 10/8/2025
 */

import { rk4Step } from "./math.js";

/**
 * Electric field at a point, ignoring co-located charges
 *
 * @param {Fieldcontainer} fieldContainer - App container
 * @param {float} x - The x coordinate
 * @param {float} y - The y coordinate
 * @returns {array} The [x, y] components of the electric field
 */
export function electricField(fieldContainer, x, y) {
    let E_x = 0;
    let E_y = 0;

    for (const charge of fieldContainer.chargeList) {
        const dx = x - charge.x;
        const dy = y - charge.y;

        if (dx === 0 && dy === 0) {
            continue;
        }

        const r = Math.hypot(dx, dy);
        const dx_hat = dx / r;
        const dy_hat = dy / r;

        const k = 1;

        E_x += k * charge.q * dx_hat / Math.pow(r, 2);
        E_y += k * charge.q * dy_hat / Math.pow(r, 2);
    }

    return [E_x, E_y];
}

/**
 * Electric force on a charge at a point
 *
 * @param {Fieldcontainer} fieldContainer - App container
 * @param {Charge} charge - The charge the force is acting on
 * @param {float} x - The x coordinate
 * @param {float} y - The y coordinate
 * @returns {array} The [x, y] force from the electric field
 */
export function electricForce(fieldContainer, charge, x, y) {
    let F_x = 0;
    let F_y = 0;

    for (const other_charge of fieldContainer.chargeList) {
        if (other_charge === charge) {
            continue;
        }

        const dx = charge.x - other_charge.x;
        const dy = charge.y - other_charge.y;
        const r = Math.hypot(dx, dy);
        const dx_hat = dx / r;
        const dy_hat = dy / r;

        const k = 1;

        F_x += k * charge.q * other_charge.q * dx_hat / Math.pow(r, 2);
        F_y += k * charge.q * other_charge.q * dy_hat / Math.pow(r, 2);
    }

    return [F_x, F_y];
}

/**
 * Find the forces on charges and update their velocities and
 * positions accordingly.
 *
 * @param {Fieldcontainer} fieldContainer - App container
 */
export function updateCharges(fieldContainer) {
    const dt = fieldContainer.dt;

    for (const charge of fieldContainer.chargeList) {
        if (charge.isLocked) {
            continue;
        }

        // Use the Runge-Kutta method to update the velocities
        const [v_x, v_y] = rk4Step((x, y) => electricForce(fieldContainer, charge, x, y),
            dt, charge.v_x, charge.v_y
        );
        charge.v_x = v_x;
        charge.v_y = v_y;

        // Use Euler's method to update the positions
        charge.x += charge.v_x * dt;
        charge.y += charge.v_y * dt;
    }
}