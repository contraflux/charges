/**
 * generation
 *
 * Functions generating charge configurations
 *
 * @author echotops
 * @date 9/3/2026
 */

import { Charge } from "../components/Charge.js";
import { µ } from "./physics.js";

/**
 * Rotates a point about the origin by a given angle
 *
 * @param {float} x - The x coordinate
 * @param {float} y - The y coordinate
 * @param {float} angleRad - The angle to rotate by, in radians
 * @returns {array} The rotated [x, y] coordinates
 */
function rotate(x, y, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    return [(x * cos) - (y * sin), (x * sin) + (y * cos)];
}

/**
 * Generates a pair of opposite charges
 *
 * @param {FieldContainer} fieldContainer - App container
 * @param {object} options - centerX, centerY, separation, angle (deg), charge (µC)
 */
export function dipole(fieldContainer, { centerX = 0, centerY = 0, separation = 2, angle = 0, charge = 100 } = {}) {
    const angleRad = angle * Math.PI / 180;
    const half = separation / 2;

    const [dx1, dy1] = rotate(-half, 0, angleRad);
    const [dx2, dy2] = rotate(half, 0, angleRad);

    const charges = [
        new Charge(centerX + dx1, centerY + dy1, 0, 0, charge * µ),
        new Charge(centerX + dx2, centerY + dy2, 0, 0, -charge * µ)
    ]
    fieldContainer.chargeList.push(...charges);
}

/**
 * Generates four alternating charges arranged in a square
 *
 * @param {FieldContainer} fieldContainer - App container
 * @param {object} options - centerX, centerY, separation (side length), angle (deg), charge (µC)
 */
export function quadrupole(fieldContainer, { centerX = 0, centerY = 0, separation = 2, angle = 0, charge = 100 } = {}) {
    const angleRad = angle * Math.PI / 180;
    const half = separation / 2;
    const corners = [[-half, half, 1], [half, half, -1], [half, -half, 1], [-half, -half, -1]];

    const charges = corners.map(([x, y, sign]) => {
        const [dx, dy] = rotate(x, y, angleRad);
        return new Charge(centerX + dx, centerY + dy, 0, 0, sign * charge * µ);
    });
    fieldContainer.chargeList.push(...charges);
}

/**
 * Generates a line of evenly-spaced, identical charges centered at a point.
 * An angle of 0 produces a vertical line
 *
 * @param {FieldContainer} fieldContainer - App container
 * @param {object} options - centerX, centerY, count, spacing, angle (deg), charge (µC)
 */
export function line(fieldContainer, { centerX = 0, centerY = 0, count = 20, spacing = 0.5, angle = 0, charge = 100 } = {}) {
    const angleRad = angle * Math.PI / 180;
    const totalLength = spacing * (count - 1);
    let charges = [];

    for (let i = 0; i < count; i++) {
        const offset = (i * spacing) - (totalLength / 2);
        const [dx, dy] = rotate(0, offset, angleRad);
        charges.push(new Charge(centerX + dx, centerY + dy, 0, 0, charge * µ));
    }
    fieldContainer.chargeList.push(...charges);
}

/**
 * Generates a ring of evenly-spaced, identical charges centered at a point
 *
 * @param {FieldContainer} fieldContainer - App container
 * @param {object} options - centerX, centerY, count, radius, angle (deg, starting offset), charge (µC)
 */
export function circle(fieldContainer, { centerX = 0, centerY = 0, count = 32, radius = 5, angle = 0, charge = 100 } = {}) {
    const angleRad = angle * Math.PI / 180;
    let charges = [];

    for (let i = 0; i < count; i++) {
        const theta = (2 * Math.PI * i / count) + angleRad;
        charges.push(new Charge(centerX + (radius * Math.cos(theta)), centerY + (radius * Math.sin(theta)), 0, 0, charge * µ));
    }
    fieldContainer.chargeList.push(...charges);
}
