/**
 * plotting
 * 
 * Functions for drawing grid, scalar fields, vector fields, and paths on
 * the canvas
 * 
 * @author contraflux
 * @date 10/2/2025
 */

import { pixelsToCoords, log, coordsToPixels, light, colorLerp } from './utilities.js';
import { map } from "./math.js"

/**
 * Draws a scaled orthonormal coordinate grid with major and minor gridlines,
 * as well as coordinate labels
 *
 * @param {FieldContainer} fieldContainer - The app container
 */
export function drawGrid(fieldContainer) {
    const ctx = fieldContainer.ctx;
    const gridSpacing = Math.pow(5, Math.ceil(log(50 / fieldContainer.coordScale, 5)));

    // Canvas bounds
    const upperLeftBound = pixelsToCoords(0, 0);
    const lowerRightBound = pixelsToCoords(canvas.width, canvas.height);

    // Loop twice, once for the x and y directions (0 => x, 1 => y)
    for (let i = 0; i <= 1; i++) {
        let min;
        let max;

        // Find minimum and maximum coordinate values
        if (i == 0) {
            min = Math.floor(upperLeftBound[i] / gridSpacing) * gridSpacing; // Minimum x
            max = lowerRightBound[i]; // Maximum x
        } else {
            min = Math.floor(lowerRightBound[i] / gridSpacing) * gridSpacing; // Minimum y
            max = upperLeftBound[i]; // Maximum y
        }

        // Loop over grid positions
        for (let n = min; n <= max; n += gridSpacing) {
            const w = coordsToPixels(n, 0)[0]; // Width position on canvas
            const h = coordsToPixels(0, n)[1]; // Height position on canvas

            ctx.strokeStyle = light; // Stroke color
            ctx.fillStyle = light; // Fill color
            ctx.lineWidth = n == 0 ? 1 : 0.2; // Stroke widths for major and minor gridlines
            ctx.font = "18px serif"; // Font size

            ctx.save();
            ctx.beginPath();
            if (i == 0) {
                ctx.moveTo(w, 0); // Start at the top at the correct width
                ctx.lineTo(w, canvas.height - 20); // Draw down to the bottom
                ctx.fillText(n.toFixed(1), w, canvas.height - 5); // Width grid numbers
            } else {
                ctx.moveTo(0, h); // Start on the side at the correct height
                ctx.lineTo(canvas.width - 40, h); // Draw across to the other side
                ctx.fillText(n.toFixed(1), canvas.width - 30, h); // Height grid numbers
            }
            ctx.stroke();
            ctx.restore();
        }
    }
}

/**
 * Draws a vector field from an array of vectors
 *
 * @param {FieldContainer} fieldContainer - The app container
 * @param {array} xs - The x coordinates of the grid
 * @param {array} ys - The y coordinates of the grid
 * @param {function} func - The vector field
 * @param {stirng} start_color - Color of the minimum value in hex
 * @param {string} end_color - Color of the maximum value in hex
 * @param {float} vectorScale - The scale factor of the vector tail
 * @param {float} arrowScale - The scale factor of the vector head
 * @param {boolean} isNoramlized - Whether to normalize the vectors
 * @param {boolean} drawArrows - Whether to draw the vector heads
 */
export function drawVectorField(fieldContainer, xs, ys, func, start_color, end_color, vectorScale, arrowScale, isNormalized, drawArrows) {
    const ctx = fieldContainer.ctx;

    let vectorField = [];
    let colors = []; 

    // Find the values of the vector field at every grid point
    for (const x of xs) {
        for (const y of ys) {
            const v = func(x, y);
            if (isNaN(v[0]) || isNaN(v[1])) {
                vectorField.push([0, 0]);
            } else {
                vectorField.push(v);
            }
        }
    }

    // Assign each vector to a color in the color range based on its length
    const lengths = vectorField.map((v) => Math.hypot(...v)); // Length of each vector
    const sorted_lengths = [...lengths];
    sorted_lengths.sort((a, b) => a - b); // Sort in ascending order
    const reference = sorted_lengths[parseInt(sorted_lengths.length * (9/10))]; // Get the 90th percentile value
    for (const l of lengths) {
        let s = l / reference;
        s = s > 1 ? 1 : s; // If the length is over 90th percentile, draw as the final color
        const rgb = colorLerp(start_color, end_color, s);
        colors.push(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`);
    }

    // Loop through the grid positions and draw the vector
    xs.forEach((x, x_index) => {
        ys.forEach((y, y_index) => {
            const index = (x_index * ys.length) + y_index;

            // Vector coordinates
            let x_dot = vectorField[index][0];
            let y_dot = vectorField[index][1];
            const length = lengths[index];

            // Location of the vector tail
            const [tail_width, tail_height] = coordsToPixels(x, y);

            // Normalize the vector based on the argument
            if (isNormalized) {
                x_dot /= length;
                y_dot /= length;
            } else {
                x_dot /= reference;
                y_dot /= reference;
            }

            // Location of the vector head
            const head_width = tail_width + (x_dot * fieldContainer.coordScale * vectorScale);
            const head_height = tail_height - (y_dot * fieldContainer.coordScale * vectorScale);

            ctx.strokeStyle = colors[index];
            ctx.fillStyle = colors[index];
            ctx.lineWidth = 1;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(tail_width, tail_height);
            ctx.lineTo(head_width, head_height);
            ctx.stroke();
            ctx.restore();

            if (drawArrows) {
                ctx.save();
                ctx.translate(head_width, head_height);
                ctx.rotate(Math.atan2(x_dot, y_dot));
                ctx.beginPath();
                ctx.moveTo(arrowScale * fieldContainer.coordScale / 2, arrowScale * fieldContainer.coordScale / 2);
                ctx.lineTo(0, 0)
                ctx.lineTo(-arrowScale * fieldContainer.coordScale / 2, arrowScale * fieldContainer.coordScale / 2);
                ctx.fill();
                ctx.restore();
            }
        });
    });
}

/**
 * Picks log-spaced contour levels from a scalar field's magnitude
 * distribution, mirrored across zero to cover both signs
 *
 * @param {array} values - Flat array of scalar field samples
 * @param {int} count - Number of positive (and mirrored negative) levels
 * @returns {array} Contour levels
 */
function getContourLevels(values, count) {
    const magnitudes = values
        .filter((v) => isFinite(v) && v !== 0)
        .map((v) => Math.abs(v))
        .sort((a, b) => a - b);

    if (magnitudes.length === 0) {
        return [];
    }

    const minMag = magnitudes[Math.floor(magnitudes.length * 0.05)];
    const maxMag = magnitudes[Math.floor(magnitudes.length * 0.95)];

    if (!(minMag > 0) || !(maxMag > minMag)) {
        return [];
    }

    const logMin = Math.log10(minMag);
    const logMax = Math.log10(maxMag);

    let levels = [];
    for (let i = 0; i < count; i++) {
        const mag = Math.pow(10, logMin + ((i / (count - 1)) * (logMax - logMin)));
        levels.push(mag, -mag);
    }

    return levels;
}

/**
 * Finds the line segments where a scalar field crosses a given level, using
 * marching squares with linear interpolation along cell edges
 *
 * @param {array} xs - The x coordinates of the grid
 * @param {array} ys - The y coordinates of the grid
 * @param {array} grid - 2D array of scalar values, grid[i][j] at (xs[i], ys[j])
 * @param {float} level - The contour level
 * @returns {array} Array of [[x1, y1], [x2, y2]] segments in world coordinates
 */
function marchingSquares(xs, ys, grid, level) {
    const segments = [];

    // Linear interpolation between two grid points that straddle the level
    const interp = (pA, vA, pB, vB) => vB === vA ? (pA + pB) / 2 : pA + ((pB - pA) * (level - vA) / (vB - vA));

    for (let i = 0; i < xs.length - 1; i++) {
        for (let j = 0; j < ys.length - 1; j++) {
            const x0 = xs[i];
            const x1 = xs[i + 1];
            const y0 = ys[j];
            const y1 = ys[j + 1];

            const v00 = grid[i][j];
            const v10 = grid[i + 1][j];
            const v11 = grid[i + 1][j + 1];
            const v01 = grid[i][j + 1];

            if (!isFinite(v00) || !isFinite(v10) || !isFinite(v11) || !isFinite(v01)) {
                continue;
            }

            // Bitmask of which corners are above the level (bottom-left, bottom-right, top-right, top-left)
            let caseIndex = 0;
            if (v00 > level) caseIndex |= 1;
            if (v10 > level) caseIndex |= 2;
            if (v11 > level) caseIndex |= 4;
            if (v01 > level) caseIndex |= 8;

            if (caseIndex === 0 || caseIndex === 15) {
                continue;
            }

            const bottom = [interp(x0, v00, x1, v10), y0];
            const right = [x1, interp(y0, v10, y1, v11)];
            const top = [interp(x0, v01, x1, v11), y1];
            const left = [x0, interp(y0, v00, y1, v01)];

            // Standard marching squares edge table; cases 5 and 10 are the ambiguous
            // saddle cases, resolved here to a fixed pair of segments
            switch (caseIndex) {
                case 1: case 14: segments.push([left, bottom]); break;
                case 2: case 13: segments.push([bottom, right]); break;
                case 3: case 12: segments.push([left, right]); break;
                case 4: case 11: segments.push([right, top]); break;
                case 6: case 9: segments.push([bottom, top]); break;
                case 7: case 8: segments.push([left, top]); break;
                case 5: segments.push([left, top], [bottom, right]); break;
                case 10: segments.push([left, bottom], [right, top]); break;
            }
        }
    }

    return segments;
}

/**
 * Draws equipotential lines for a scalar field, colored by the sign of the
 * potential (red for positive, blue for negative)
 *
 * @param {FieldContainer} fieldContainer - The app container
 * @param {array} xs - The x coordinates of the grid
 * @param {array} ys - The y coordinates of the grid
 * @param {function} func - The scalar field, called as func(x, y)
 * @param {int} levelCount - Number of positive (and mirrored negative) contour levels
 */
export function drawEquipotentialLines(fieldContainer, xs, ys, func, levelCount) {
    const ctx = fieldContainer.ctx;

    const grid = xs.map((x) => ys.map((y) => func(x, y)));
    const levels = getContourLevels(grid.flat(), levelCount);

    for (const level of levels) {
        const segments = marchingSquares(xs, ys, grid, level);
        if (segments.length === 0) {
            continue;
        }

        ctx.strokeStyle = level > 0 ? "rgba(255, 110, 110, 0.6)" : "rgba(110, 150, 255, 0.6)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (const [[x1, y1], [x2, y2]] of segments) {
            const [w1, h1] = coordsToPixels(x1, y1);
            const [w2, h2] = coordsToPixels(x2, y2);
            ctx.moveTo(w1, h1);
            ctx.lineTo(w2, h2);
        }
        ctx.stroke();
    }
}

/**
 * Draws individual point charges
 *
 * @param {FieldContainer} fieldContainer - The app container
 */
export function drawCharges(fieldContainer) {
    const ctx = fieldContainer.ctx;

    // Loop through all the charges
    for (const charge of fieldContainer.chargeList) {
        // Color based on charge (positive red, neutral white, negative blue)
        if (charge.q > 0) {
            ctx.fillStyle = "red";
        } else if (charge.q == 0) {
            ctx.fillStyle = light;
        } else {
            ctx.fillStyle = "blue";
        }
        ctx.lineWidth = 1;

        const [x, y] = coordsToPixels(charge.x, charge.y);

        // Plot a circle at the charge's position
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, 2 * Math.PI);
        ctx.fill()

        // Ring around the charge while it's being dragged or edited
        if (charge === fieldContainer.dragging || charge === fieldContainer.editing) {
            ctx.strokeStyle = light;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
}

/**
 * Draws the field probe marker: a dot at the probe point and an arrow
 * showing the field direction there. The magnitude/potential readout is
 * rendered separately as an HTML box (see app.js), not on the canvas
 *
 * @param {FieldContainer} fieldContainer - The app container
 * @param {float} x - The x coordinate of the probe
 * @param {float} y - The y coordinate of the probe
 * @param {array} field - The [x, y] electric field at the probe
 */
const probeColor = "#7c98ff";

export function drawProbe(fieldContainer, x, y, field) {
    const ctx = fieldContainer.ctx;
    const [E_x, E_y] = field;
    const magnitude = Math.hypot(E_x, E_y);

    const [tailWidth, tailHeight] = coordsToPixels(x, y);

    ctx.fillStyle = probeColor;
    ctx.beginPath();
    ctx.arc(tailWidth, tailHeight, 3, 0, 2 * Math.PI);
    ctx.fill();

    if (magnitude > 0 && isFinite(magnitude)) {
        const arrowLength = 40;
        const dirX = E_x / magnitude;
        const dirY = E_y / magnitude;
        const headWidth = tailWidth + (dirX * arrowLength);
        const headHeight = tailHeight - (dirY * arrowLength);

        ctx.strokeStyle = probeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tailWidth, tailHeight);
        ctx.lineTo(headWidth, headHeight);
        ctx.stroke();

        ctx.save();
        ctx.translate(headWidth, headHeight);
        ctx.rotate(Math.atan2(dirX, dirY));
        ctx.beginPath();
        ctx.moveTo(6, 6);
        ctx.lineTo(0, 0);
        ctx.lineTo(-6, 6);
        ctx.fill();
        ctx.restore();
    }
}