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

export function dipole(fieldContainer) {
    const charges = [
        new Charge(-1, 0, 0, 0, 100*µ),
        new Charge(1, 0, 0, 0, -100*µ)
    ]
    fieldContainer.chargeList.push(...charges);
}

export function quadrupole(fieldContainer) {
    const charges = [
        new Charge(-1, 1, 0, 0, 100*µ),
        new Charge(1, 1, 0, 0, -100*µ),
        new Charge(1, -1, 0, 0, 100*µ),
        new Charge(-1, -1, 0, 0, -100*µ)
    ]
    fieldContainer.chargeList.push(...charges);
}

export function line(fieldContainer) {
    let charges = [];
    for (let y = -5; y < 5; y += 0.5) {
        charges.push(new Charge(0, y, 0, 0, 100*µ));
    }
    fieldContainer.chargeList.push(...charges);
}

export function circle(fieldContainer) {
    let charges = [];
    for (let theta = 0; theta < 2*Math.PI; theta += Math.PI/16) {
        charges.push(new Charge(5*Math.cos(theta), 5*Math.sin(theta), 0, 0, 100*µ));
    }
    fieldContainer.chargeList.push(...charges);
}