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
    const ctx = fieldContainer.ctx;23
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
 * Draws a heatmap reperesenting a scalar field
 *
 * @param {FieldContainer} fieldContainer - The app container
 * @param {array} xs - The x coordinates of the grid
 * @param {array} ys - The y coordinates of the grid
 * @param {function} func - The function to be operated on
 * @param {function} operator - The operator to evaluate on the function
 * @param {stirng} start_color - Color of the minimum value in hex
 * @param {string} end_color - Color of the maximum value in hex
 */
export function drawScalarField(fieldContainer, xs, ys, func, operator, start_color, end_color) {
    const ctx = fieldContainer.ctx;

    const dx = xs[1] - xs[0];
    const dy = ys[1] - ys[0];
    let scalarField = [];
    let colors = []

    // Collect the values of the field at the grid points
    for (const x of xs) {
        for (const y of ys) {
            scalarField.push(operator(func, x + dx/2, y + dy/2)); // Evaluate at the midpoint of two grid points
        }
    }

    // Assign each value to a color in the color range
    const max = Math.max(...scalarField);
    const min = Math.min(...scalarField);
    for (const value of scalarField) {
        const rgb = colorLerp(start_color, end_color, map(min, max, value));
        colors.push(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`)
    }

    // Loop through the grid points a draw the heatmap
    xs.forEach((x, x_index) => {
        ys.forEach((y, y_index) => {
            const index = (x_index * ys.length) + y_index;

            // Rectangle grid positions
            const [width_start, height_start] = coordsToPixels(x, y);
            const [width_end, height_end] = coordsToPixels(x + dx, y + dy);

            // Rectange dimensions (expand slightly to fix boundary fighting)
            const rect_width = (width_end - width_start) * 1.1;
            const rect_height = (height_end - height_start) * 1.1;

            ctx.fillStyle = colors[index];
            ctx.lineWidth = 0;
            ctx.save();
            ctx.translate(width_start, height_start);
            ctx.beginPath();
            ctx.rect(0, 0, rect_width, rect_height);
            ctx.fill();
            ctx.restore();
        });
    });
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
    }
}