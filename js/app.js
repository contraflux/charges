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

import { FieldContainer } from "./components/Objects.js"
import { Charge } from "./components/Charge.js";
import { range } from "./util/arrays.js";
import { drawGrid, drawVectorField, drawCharges, drawEquipotentialLines, drawProbe } from "./util/plotting.js";
import { log, pixelsToCoords, light, coordsToPixels } from "./util/utilities.js";
import { µ, electricField, electricPotential, updateCharges } from "./util/physics.js";
import { dipole, quadrupole, line, circle } from "./util/generation.js";

export const fieldContainer = new FieldContainer('canvas');
const canvas = fieldContainer.canvas;
const ctx = fieldContainer.ctx;

/**
 * Periodic function that runs every tick and contains most drawing and calculation
 */
function appPeriodic() {
    const [timeScale, isNormalized, arrowScale, startColor, endColor, arrowDensity, isEquipotential, isProbe] = getInputs();
    const [step, xs, ys, scalar_xs, scalar_ys] = getGrid(arrowDensity);

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = light;
    ctx.strokeStyle = light;
    ctx.font = "12px serif";

    fieldContainer.dt = fieldContainer.dt == 0 ? 0 : parseFloat(timeScale);

    drawGrid(fieldContainer); // Draw the coordinate grid

    if (isEquipotential) {
        drawEquipotentialLines(fieldContainer, scalar_xs, scalar_ys,
            (x, y) => electricPotential(fieldContainer, x, y), 8
        ); // Draw the equipotential lines
    }

    drawVectorField(fieldContainer, xs, ys, (x, y) => electricField(fieldContainer, x, y),
                    startColor, endColor, arrowScale * step, 0.15 * step,
                    isNormalized, true
        ); // Draw the vector field

    drawCharges(fieldContainer);

    updateProbeBoxes(isProbe);

    if (fieldContainer.dt != 0 ) {
        updateCharges(fieldContainer);
    }

    fieldContainer.elapsedTime += fieldContainer.dt;
}

// Persistent DOM state for probe boxes, keyed by pinned point (plus one for the
// live hover probe). Kept across ticks instead of rebuilt, so a box the user is
// about to click on doesn't get replaced out from under their cursor.
const pinnedProbeBoxes = new Map(); // point -> { box, shifted, lockedUntil }
let hoverProbeBox = null;

// Must match .probe-box's transform transition duration in index.css, so a
// shift can't be re-triggered (and re-target mid-flight) before it finishes
const PROBE_SHIFT_TRANSITION_MS = 150;

/**
 * Builds an empty probe info box: an HTML overlay positioned over the canvas,
 * with placeholder field/potential lines to be filled in by updateProbeBox.
 * Pinned points get a close button; the live hover probe does not
 *
 * @param {function|null} onClose - Called when the close button is clicked, or null to omit it
 * @returns {HTMLElement} The probe box element
 */
function createProbeBox(onClose) {
    const box = document.createElement('div');
    box.className = 'probe-box';

    if (onClose) {
        const close = document.createElement('span');
        close.className = 'probe-box-close';
        close.innerHTML = '&times;';
        close.addEventListener('click', onClose);
        box.appendChild(close);
    }

    const eLine = document.createElement('div');
    eLine.className = 'probe-box-e';
    const vLine = document.createElement('div');
    vLine.className = 'probe-box-v';
    box.appendChild(eLine);
    box.appendChild(vLine);

    return box;
}

/**
 * Updates an existing probe box's position and readout in place
 *
 * @param {HTMLElement} box - A box created by createProbeBox
 * @param {float} x - The x coordinate of the probe
 * @param {float} y - The y coordinate of the probe
 * @param {array} field - The [x, y] electric field at the probe
 * @param {float} potential - The electric potential at the probe
 * @param {boolean} shifted - Render below-left of the point instead of above-right, so the
 *                            box doesn't sit on top of a charge being dragged past it
 */
function updateProbeBox(box, x, y, field, potential, shifted) {
    const magnitude = Math.hypot(field[0], field[1]);
    const [pixelX, pixelY] = coordsToPixels(x, y);

    box.style.left = `${pixelX}px`;
    box.style.top = `${pixelY}px`;
    box.classList.toggle('shifted', shifted);
    box.querySelector('.probe-box-e').textContent = `E = ${magnitude.toExponential(2)} N/C`;
    box.querySelector('.probe-box-v').textContent = `V = ${potential.toExponential(2)} V`;
}

/**
 * Whether a screen point falls within (or near) an element's current rect
 *
 * @param {float} viewportX - The point's x coordinate in viewport space
 * @param {float} viewportY - The point's y coordinate in viewport space
 * @param {HTMLElement} el - The element to test against
 * @param {float} margin - Extra padding around the element's rect
 * @returns {boolean} Whether the point is inside the padded rect
 */
function pointNearElement(viewportX, viewportY, el, margin) {
    const rect = el.getBoundingClientRect();
    return viewportX > rect.left - margin && viewportX < rect.right + margin &&
           viewportY > rect.top - margin && viewportY < rect.bottom + margin;
}

/**
 * Draws every active probe marker (the live hover probe and any pinned
 * points) on the canvas and syncs their HTML info boxes
 *
 * @param {boolean} isProbe - Whether the Probe checkbox is enabled
 */
function updateProbeBoxes(isProbe) {
    const probeLayer = document.getElementById('probe-layer');
    probeLayer.style.left = `${canvas.offsetLeft}px`;
    probeLayer.style.top = `${canvas.offsetTop}px`;
    probeLayer.style.width = `${canvas.offsetWidth}px`;
    probeLayer.style.height = `${canvas.offsetHeight}px`;

    if (isProbe && fieldContainer.isProbing) {
        const field = electricField(fieldContainer, fieldContainer.probeX, fieldContainer.probeY);
        const potential = electricPotential(fieldContainer, fieldContainer.probeX, fieldContainer.probeY);
        drawProbe(fieldContainer, fieldContainer.probeX, fieldContainer.probeY, field);

        if (!hoverProbeBox) {
            hoverProbeBox = createProbeBox(null);
            probeLayer.appendChild(hoverProbeBox);
        }
        updateProbeBox(hoverProbeBox, fieldContainer.probeX, fieldContainer.probeY, field, potential, false);
    } else if (hoverProbeBox) {
        hoverProbeBox.remove();
        hoverProbeBox = null;
    }

    const dragged = fieldContainer.dragging;
    const dragViewport = dragged == null ? null : (() => {
        const canvasRect = canvas.getBoundingClientRect();
        const [pixelX, pixelY] = coordsToPixels(dragged.x, dragged.y);
        return [canvasRect.left + pixelX, canvasRect.top + pixelY];
    })();

    const seen = new Set();

    for (const point of fieldContainer.probePoints) {
        seen.add(point);

        let entry = pinnedProbeBoxes.get(point);
        if (!entry) {
            const box = createProbeBox(() => {
                fieldContainer.probePoints = fieldContainer.probePoints.filter((p) => p !== point);
            });
            entry = { box, shifted: false, lockedUntil: 0 };
            pinnedProbeBoxes.set(point, entry);
            probeLayer.appendChild(box);
        }

        const field = electricField(fieldContainer, point.x, point.y);
        const potential = electricPotential(fieldContainer, point.x, point.y);
        drawProbe(fieldContainer, point.x, point.y, field);

        if (dragViewport == null) {
            entry.shifted = false;
            entry.lockedUntil = 0;
        } else if (performance.now() >= entry.lockedUntil && pointNearElement(dragViewport[0], dragViewport[1], entry.box, 12)) {
            // The dragged charge is about to pass under the box's current spot — hop to the other corner,
            // and lock out further hops until this one finishes animating
            entry.shifted = !entry.shifted;
            entry.lockedUntil = performance.now() + PROBE_SHIFT_TRANSITION_MS;
        }

        updateProbeBox(entry.box, point.x, point.y, field, potential, entry.shifted);
    }

    for (const [point, entry] of pinnedProbeBoxes) {
        if (!seen.has(point)) {
            entry.box.remove();
            pinnedProbeBoxes.delete(point);
        }
    }
}

/**
 * Determine the grid coordinates for vector and scalar fields
 *
 * @returns {array} Grid information including step size, the grid for vector
 *                  fields, and the grid for scalar fields
 */
function getInputs() {
    const timeScale = Math.pow(10, document.getElementById('time-scale').value - 3); // Log scale from 1e-1 to 1e+1
    const isNormalized = document.getElementById('normalize-tick').checked;
    const arrowScale = document.getElementById('arrow-scale').value;
    const startColor = document.getElementById('start-color').value;
    const endColor = document.getElementById('end-color').value;
    const arrowDensity = document.getElementById('arrow-density').value;
    const isEquipotential = document.getElementById('equipotential-tick').checked;
    const isProbe = document.getElementById('probe-tick').checked;
    const time = document.getElementById('time');

    time.innerText = (fieldContainer.elapsedTime % 10).toFixed(2) + " s";

    return [timeScale, isNormalized, arrowScale, startColor, endColor, arrowDensity, isEquipotential, isProbe];
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
    const scalar_xs = range(min_x - step, max_x + step, step/4);
    const scalar_ys = range(min_y - step, max_y + step, step/4);

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

    fieldContainer.selected = null;

    for (const charge of fieldContainer.chargeList) {
        const [w, h] = coordsToPixels(charge.x, charge.y);

        if (Math.hypot(w - mouseX, h - mouseY) < dragRadius) {
            fieldContainer.dragging = charge;
            fieldContainer.selected = charge;
        }
    }

    if (fieldContainer.dragging == null) {
        if (document.getElementById('probe-tick').checked) {
            const [x, y] = pixelsToCoords(mouseX, mouseY);
            fieldContainer.probePoints.push({ x, y });
        } else {
            fieldContainer.isDragging = true;
        }
    }
}

/**
 * Track the cursor position (in world coordinates) for the field probe
 *
 * @param {MouseEvent} e - The mouse event
 */
function updateProbe(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const [x, y] = pixelsToCoords(mouseX, mouseY);

    fieldContainer.probeX = x;
    fieldContainer.probeY = y;
    fieldContainer.isProbing = true;
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

    inputValue1.value = charge.v_x.toFixed(2);
    inputValue2.value = charge.v_y.toFixed(2);
    inputValue3.value = charge.q/µ;
    inputValue4.checked = charge.isLocked;
    [inputValue1, inputValue2, inputValue3].forEach((input) => input.classList.remove('input-error'));

    fieldContainer.editing = charge;
}

/**
 * Checks that every [input, parsedValue] pair holds a finite number,
 * marking the offending inputs so the user can see what to fix
 *
 * @param {array} pairs - Array of [HTMLInputElement, float] pairs
 * @returns {boolean} Whether every value was valid
 */
function validateInputs(pairs) {
    let valid = true;

    for (let i = 0; i < pairs.length; i++) {
        const [input, value] = pairs[i]
        if (input.type == 'checkbox') {
            continue;
        }
        if (isFinite(value)) {
            input.classList.remove('input-error');
        } else {
            input.classList.add('input-error');
            valid = false;
        }
    }

    return valid;
}

canvas.addEventListener('mousedown', (e) => { checkDragging(e) });
canvas.addEventListener('mousemove', (e) => { executeDragging(e); updateProbe(e); });
canvas.addEventListener('mouseup', () => { fieldContainer.isDragging = false; fieldContainer.dragging = null; })
canvas.addEventListener('mouseleave', () => { fieldContainer.isProbing = false; });
canvas.addEventListener('wheel', (e) => fieldContainer.zoomGrid(e));
canvas.addEventListener('dblclick', (e) => { editProperties(e) });

document.addEventListener('keypress', (e) => {
    if (e.key == 'r') {
        fieldContainer.resetFields();
        fieldContainer.dt = 0;
        document.getElementById('input-box').style.visibility = "hidden";
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (document.activeElement.tagName === 'INPUT') return; // Don't hijack editing a text field

    const target = fieldContainer.selected;
    if (target == null) return;

    fieldContainer.chargeList = fieldContainer.chargeList.filter((charge) => charge !== target);
    fieldContainer.selected = null;

    if (fieldContainer.editing === target) {
        fieldContainer.editing = null;
        document.getElementById('input-box').style.visibility = "hidden";
    }
});

document.getElementById('add-positive-charge').addEventListener('click', () => {
    fieldContainer.chargeList.push(new Charge((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0, 0, 100*µ));
});

document.getElementById('add-negative-charge').addEventListener('click', () => {
    fieldContainer.chargeList.push(new Charge((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0, 0, -100*µ));
});

document.getElementById('restart').addEventListener('click', () => {
    fieldContainer.resetFields();
    fieldContainer.dt = 0;
    document.getElementById('input-box').style.visibility = "hidden";
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

    const v_x = parseFloat(inputValue1.value);
    const v_y = parseFloat(inputValue2.value);
    const q = parseFloat(inputValue3.value);

    if (!validateInputs([[inputValue1, v_x], [inputValue2, v_y], [inputValue3, q]])) {
        return;
    }

    inputBox.style.visibility = "hidden";

    fieldContainer.editing.v_x = v_x;
    fieldContainer.editing.v_y = v_y;
    fieldContainer.editing.q = q*µ;
    fieldContainer.editing.isLocked = inputValue4.checked;
    fieldContainer.editing = null;
});

document.getElementById('delete-charge').addEventListener('click', () => {
    fieldContainer.chargeList = fieldContainer.chargeList.filter((charge) => charge !== fieldContainer.editing);
    fieldContainer.editing = null;
    document.getElementById('input-box').style.visibility = "hidden";
});

document.getElementById('cancel').addEventListener('click', () => {
    fieldContainer.editing = null;
    document.getElementById('input-box').style.visibility = "hidden";
});

/**
 * Per-shape settings for the generation config box: the generator function,
 * the default field values, the label for the reused "spacing" field, and
 * whether the "count" field applies to this shape
 *
 * @type {object}
 */
const generationConfig = {
    dipole: {
        fn: dipole,
        spacingLabel: "Separation",
        showCount: false,
        showAngle: true,
        defaults: { centerX: 0, centerY: 0, count: 2, spacing: 2, angle: 0, charge: 100, locked: false }
    },
    quadrupole: {
        fn: quadrupole,
        spacingLabel: "Side Length",
        showCount: false,
        showAngle: true,
        defaults: { centerX: 0, centerY: 0, count: 4, spacing: 2, angle: 0, charge: 100, locked: false }
    },
    line: {
        fn: line,
        spacingLabel: "Spacing",
        showCount: true,
        showAngle: true,
        defaults: { centerX: 0, centerY: 0, count: 20, spacing: 0.5, angle: 0, charge: 100, locked: false }
    },
    circle: {
        fn: circle,
        spacingLabel: "Radius",
        showCount: true,
        showAngle: false,
        defaults: { centerX: 0, centerY: 0, count: 32, spacing: 5, angle: 0, charge: 100, locked: false }
    }
};

let pendingShape = null;

/**
 * Opens the generation config box, pre-filled with the defaults for a shape
 *
 * @param {string} shape - Key into generationConfig
 */
function showGenerationBox(shape) {
    const config = generationConfig[shape];
    pendingShape = shape;

    document.getElementById('generation-value-1').value = config.defaults.centerX;
    document.getElementById('generation-value-2').value = config.defaults.centerY;
    document.getElementById('generation-value-3').value = config.defaults.count;
    document.getElementById('generation-value-4').value = config.defaults.spacing;
    document.getElementById('generation-value-5').value = config.defaults.angle;
    document.getElementById('generation-value-6').value = config.defaults.charge;
    document.getElementById('generation-value-7').checked = config.defaults.locked;

    document.getElementById('generation-label-spacing').innerText = config.spacingLabel;
    document.getElementById('generation-row-count').style.display = config.showCount ? "flex" : "none";
    document.getElementById('generation-row-angle').style.display = config.showAngle ? "flex" : "none";

    for (let i = 1; i <= 7; i++) {
        document.getElementById(`generation-value-${i}`).classList.remove('input-error');
    }

    document.getElementById('generation-box').style.visibility = "visible";
}

/**
 * Maps the generic generation box fields onto the named options each
 * generator function expects
 *
 * @param {string} shape - Key into generationConfig
 * @param {object} fields - The raw {centerX, centerY, count, spacing, angle, charge} form values
 * @returns {object} The options object for the corresponding generator function
 */
function mapGenerationOptions(shape, { centerX, centerY, count, spacing, angle, charge, locked }) {
    switch (shape) {
        case 'dipole':
        case 'quadrupole':
            return { centerX, centerY, separation: spacing, angle, charge, locked };
        case 'line':
            return { centerX, centerY, count, spacing, angle, charge, locked };
        case 'circle':
            return { centerX, centerY, count, radius: spacing, angle, charge, locked };
    }
}

document.getElementById('dipole').addEventListener('click', () => showGenerationBox('dipole'));
document.getElementById('quadrupole').addEventListener('click', () => showGenerationBox('quadrupole'));
document.getElementById('line').addEventListener('click', () => showGenerationBox('line'));
document.getElementById('circle').addEventListener('click', () => showGenerationBox('circle'));

document.getElementById('generation-accept').addEventListener('click', () => {
    const inputs = [1, 2, 3, 4, 5, 6, 7].map((i) => document.getElementById(`generation-value-${i}`));
    const [input1, input2, input3, input4, input5, input6, input7] = inputs;

    const fields = {
        centerX: parseFloat(input1.value),
        centerY: parseFloat(input2.value),
        count: parseInt(input3.value),
        spacing: parseFloat(input4.value),
        angle: parseFloat(input5.value),
        charge: parseFloat(input6.value),
        locked: input7.checked
    };

    const config = generationConfig[pendingShape];
    const pairs = [[input1, fields.centerX], [input2, fields.centerY], [input4, fields.spacing], [input5, fields.angle], [input6, fields.charge], [input7, fields.locked]];
    if (config.showCount) {
        pairs.push([input3, fields.count]);
    }

    if (!validateInputs(pairs)) {
        return;
    }

    config.fn(fieldContainer, mapGenerationOptions(pendingShape, fields));

    document.getElementById('generation-box').style.visibility = "hidden";
});

document.getElementById('generation-cancel').addEventListener('click', () => {
    document.getElementById('generation-box').style.visibility = "hidden";
});

/**
 * Steps shown by the walkthrough, in order
 *
 * @type {array}
 */
const walkthroughSteps = [
    {
        title: "Charges",
        text: "Click + or − to add a positive or negative charge. Drag a charge to move it, or double-click it to edit its velocity, charge, and whether it's locked in place. Click a charge once to select it, then press Delete or Backspace to remove it."
    },
    {
        title: "Navigating the Canvas",
        text: "Drag empty space to pan the view, and scroll to zoom in or out. Press ▶| to start or pause the simulation, and ↺ (or the 'r' key) to reset everything."
    },
    {
        title: "Generating Configurations",
        text: "Dipole, Quadrupole, Line, and Circle generate common charge layouts. Each opens a box where you can set the position, spacing, count, angle, charge, and whether the charges start locked."
    },
    {
        title: "Visualizing & Probing the Field",
        text: "Arrows show the electric field — adjust Normalize, Arrow Scale/Density, and colors to taste. Turn on Equipotential Lines to see contours of constant potential. Check Probe, then hover to read the field and potential at a point, or click to pin a sample that stays put."
    }
];

let walkthroughStep = 0;

/**
 * Renders the current walkthrough step's content and nav state
 */
function showWalkthroughStep() {
    const step = walkthroughSteps[walkthroughStep];

    document.getElementById('walkthrough-title').textContent = step.title;
    document.getElementById('walkthrough-text').textContent = step.text;
    document.getElementById('walkthrough-progress').textContent = `${walkthroughStep + 1} / ${walkthroughSteps.length}`;
    document.getElementById('walkthrough-back').style.display = walkthroughStep === 0 ? "none" : "flex";
    document.querySelector('#walkthrough-next p').textContent = walkthroughStep === walkthroughSteps.length - 1 ? "Done" : "Next";
}

document.getElementById('walkthrough-button').addEventListener('click', () => {
    walkthroughStep = 0;
    showWalkthroughStep();
    document.getElementById('walkthrough-box').style.visibility = "visible";
});

document.getElementById('walkthrough-close').addEventListener('click', () => {
    document.getElementById('walkthrough-box').style.visibility = "hidden";
});

document.getElementById('walkthrough-back').addEventListener('click', () => {
    if (walkthroughStep === 0) {
        return;
    }
    walkthroughStep--;
    showWalkthroughStep();
});

document.getElementById('walkthrough-next').addEventListener('click', () => {
    if (walkthroughStep === walkthroughSteps.length - 1) {
        document.getElementById('walkthrough-box').style.visibility = "hidden";
        return;
    }
    walkthroughStep++;
    showWalkthroughStep();
});

// Hint that the options panels scroll: shown near the top, faded out once
// scrolled, and shown again if scrolled back up. Removed entirely if a panel
// doesn't actually overflow
document.querySelectorAll('.input-container').forEach((container) => {
    const hint = container.querySelector('.scroll-hint');
    if (!hint) {
        return;
    }

    if (container.scrollHeight <= container.clientHeight) {
        hint.remove();
        return;
    }

    container.addEventListener('scroll', () => {
        hint.classList.toggle('hidden', container.scrollTop > 4);
    });

    hint.addEventListener('click', () => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
});

setInterval(appPeriodic, 10);