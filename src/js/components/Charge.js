/**
 * Charge
 * 
 * Point charge definition
 * 
 * @author contraflux
 * @date 10/10/2025
 */

export class Charge {
    constructor(x, y, v_x, v_y, q) {
        this.x = x;
        this.y = y;
        this.v_x = v_x;
        this.v_y = v_y;
        this.q = q;
        this.isLocked = false;
    }
}