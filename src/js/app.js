/**
 * app
 * 
 * Main script for the app, contains evaluation of user input, calling of draw
 * functions for the scalar fields, vector fields, and charges, periodic function
 * and event listeners
 * 
 * @author contraflux
 * @date 10/8/2025
 */

import { FieldContainer, Charge } from "./components/Objects.js"
import { divergence, curl } from "./util/math.js"
import { range } from "./util/arrays.js";
import { drawGrid, drawScalarField, drawVectorField, drawCharges } from "./util/plotting.js";
import { log, pixelsToCoords, light, coordsToPixels } from "./util/utilities.js";
import { electricField, updateCharges } from "./util/physics.js";

export const fieldContainer = new FieldContainer('canvas');
const canvas = fieldContainer.canvas;
const ctx = fieldContainer.ctx;

/**
 * Periodic function that runs every tick and contains most drawing and calculation
 */
function appPeriodic() {
    const [timeScale, isNormalized, arrowScale, startColor, endColor, arrowDensity] = getInputs();
    const [step, xs, ys, scalar_xs, scalar_ys] = getGrid(arrowDensity);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = light;
    ctx.strokeStyle = light;
    ctx.font = "12px serif";

    fieldContainer.dt = fieldContainer.dt == 0 ? 0 : parseFloat(timeScale);

    // Draw the scalar field if it is selected
    if (fieldContainer.overlay == "div") {
        drawScalarField(fieldContainer, scalar_xs, scalar_ys,
                        (x, y) => electricField(fieldContainer, x, y),
                        divergence, "#000000", "#ffffff"
        ); // Draw divergence
    } else if (fieldContainer.overlay == "curl") {
        drawScalarField(fieldContainer, scalar_xs, scalar_ys,
                        (x, y) => electricField(fieldContainer, x, y),
                        curl, "#000000", "#ffffff"
        ); // Draw curl
    }
    drawGrid(fieldContainer); // Draw the coordinate grid
    drawVectorField(fieldContainer, xs, ys, (x, y) => electricField(fieldContainer, x, y),
                    startColor, endColor, arrowScale * step, 0.15 * step,
                    isNormalized, true
        ); // Draw the vector field

    drawCharges(fieldContainer);

    if (fieldContainer.dt != 0 ) {
        updateCharges(fieldContainer);
    }


    fieldContainer.elapsedTime += fieldContainer.dt;
}

/**
 * Determine the grid coordinates for vector and scalar fields
 *
 * @returns {array} Grid information including step size, the grid for vector
 *                  fields, and the grid for scalar fields
 */
function getInputs() {
    const timeScale = document.getElementById('time-scale').value;
    const isNormalized = document.getElementById('normalize-tick').checked;
    const arrowScale = document.getElementById('arrow-scale').value;
    const startColor = document.getElementById('start-color').value;
    const endColor = document.getElementById('end-color').value;
    const arrowDensity = document.getElementById('arrow-density').value;
    const overlay = document.getElementById('overlay').value;
    const time = document.getElementById('time');

    fieldContainer.overlay = overlay;
    time.innerText = (fieldContainer.elapsedTime % 10).toFixed(2) + "s";

    return [timeScale, isNormalized, arrowScale, startColor, endColor, arrowDensity];
}

/**
 * Determine the grid coordinates for vector and scalar fields
 *
 * @returns {array} Grid information including step size, the grid for vector
 *                  fields, and the grid for scalar fields
 */
function getGrid(arrowDensity) {
    const upperLeftBound = pixelsToCoords(0, 0);
    const lowerRightBound = pixelsToCoords(canvas.width, canvas.height);

    const gridSpacing = Math.pow(5, Math.ceil(log(50 / fieldContainer.coordScale, 5)));

    const min_x = Math.floor(upperLeftBound[0] / gridSpacing) * gridSpacing;
    const max_x = lowerRightBound[0];
    const min_y = Math.floor(lowerRightBound[1] / gridSpacing) * gridSpacing;
    const max_y = upperLeftBound[1];

    const step = gridSpacing / arrowDensity;
    const xs = range(min_x - step, max_x + step, step);
    const ys = range(min_y - step, max_y + step, step);
    const scalar_xs = range(min_x - step, max_x + step, step/2);
    const scalar_ys = range(min_y - step, max_y + step, step/2);

    return [step, xs, ys, scalar_xs, scalar_ys];
}

/**
 * Determine if the user has clicked the grid axes or a point charge
 * 
 * @param {MouseEvent} e - The mouse event
 */
function checkDragging(e) {
    const dragRadius = 25;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const charge of fieldContainer.chargeList) {
        const [w, h] = coordsToPixels(charge.x, charge.y);

        if (Math.hypot(w - mouseX, h - mouseY) < dragRadius) {
            fieldContainer.dragging = charge;
        }
    }

    if (fieldContainer.dragging == null) {
        fieldContainer.isDragging = true;
    }
}

/**
 * Drag a point charge or the grid axes
 * 
 * @param {MouseEvent} e - The mouse event
 */
function executeDragging(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (fieldContainer.isDragging) {
        fieldContainer.dragGrid(e)
    }
    
    if (fieldContainer.dragging != null) {
        const [x, y] = pixelsToCoords(mouseX, mouseY);
        fieldContainer.dragging.x = x;
        fieldContainer.dragging.y = y;
        fieldContainer.dragging.v_x = 0;
        fieldContainer.dragging.v_y = 0;
    }
}

/**
 * Edit the properties of a point charge
 * 
 * @param {MouseEvent} e - The mouse event
 */
function editProperties(e) {
    // TODO: Open a window when a charge is double clicked where you can edit
    // velocity, charge, and if it is locked or not. See circuits project for inspiration.
    const dragRadius = 25;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const charge of fieldContainer.chargeList) {
        const [w, h] = coordsToPixels(charge.x, charge.y);

        if (Math.hypot(w - mouseX, h - mouseY) < dragRadius) {
            showInputBox(charge);
        }
    }
}

/**
 * Show the input box to edit charge properties
 * 
 * @param {Charge} charge - The charge to be edited
 */
function showInputBox(charge) {
    const inputBox = document.getElementById('input-box');
    const inputValue1 = document.getElementById('input-value-1'); // Velocity X
    const inputValue2 = document.getElementById('input-value-2'); // Velocity Y
    const inputValue3 = document.getElementById('input-value-3'); // Charge
    const inputValue4 = document.getElementById('input-value-4'); // Locked

    inputBox.style.visibility = "visible";

    inputValue1.value = charge.v_x;
    inputValue2.value = charge.v_y;
    inputValue3.value = charge.q;
    inputValue4.checked = charge.isLocked;

    fieldContainer.editing = charge;
}

canvas.addEventListener('mousedown', (e) => { checkDragging(e) });
canvas.addEventListener('mousemove', (e) => { executeDragging(e) });
canvas.addEventListener('mouseup', () => { fieldContainer.isDragging = false; fieldContainer.dragging = null; })
canvas.addEventListener('wheel', (e) => fieldContainer.zoomGrid(e));
canvas.addEventListener('dblclick', (e) => { editProperties(e) });

document.addEventListener('keypress', (e) => {
    if (e.key == 'r') fieldContainer.resetFields();
});

document.getElementById('add-charge').addEventListener('click', () => {
    fieldContainer.chargeList.push(new Charge((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 0, 0, 1));
});

document.getElementById('play-pause').addEventListener('click', () => {
    fieldContainer.dt = fieldContainer.dt !== 0 ? 0 : 1;
});

document.getElementById('accept').addEventListener('click', () => {
    const inputBox = document.getElementById('input-box');
    const inputValue1 = document.getElementById('input-value-1'); // Velocity X
    const inputValue2 = document.getElementById('input-value-2'); // Velocity Y
    const inputValue3 = document.getElementById('input-value-3'); // Charge
    const inputValue4 = document.getElementById('input-value-4'); // Locked

    inputBox.style.visibility = "hidden";

    fieldContainer.editing.v_x = parseFloat(inputValue1.value);
    fieldContainer.editing.v_y = parseFloat(inputValue2.value);
    fieldContainer.editing.q = parseFloat(inputValue3.value);
    fieldContainer.editing.isLocked = inputValue4.checked;
});

document.getElementById('cancel').addEventListener('click', () => {
    document.getElementById('input-box').style.visibility = "hidden";
});

setInterval(appPeriodic, 10);