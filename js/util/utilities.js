/**
 * utilities
 * 
 * An assortment of functions including unit conversions, log change of base,
 * and linear interpolations.
 * 
 * @author contraflux
 * @date 10/2/2025
 */

import { fieldContainer } from '../app.js';

export const rainbow = ['#F28B82', '#FBBC04', '#FFF475', '#81C995', '#AECBFA', '#D7AEFB'];
export const highlight = 'rgba(70, 77, 105, 1)';
export const light = 'rgba(190, 200, 220, 1)';
export const dark = 'rgba(20, 22, 30, 1)';

/**
 * Log change of base
 *
 * @param {float} a - The input of the logarithm
 * @param {float} b - The base of the logaarithm
 * @returns {float} The logarithm base b of a
 */
export function log(a, b) {
    return Math.log(a) / Math.log(b);
}

/**
 * Linearly interpolate between two colors given as hex codes
 *
 * @param {string} a - The starting color as a hex code
 * @param {string} b - The ending color as a hex code
 * @param {float} s - The interpolation parameter
 * @returns {string} The color as a hex code
 */
export function colorLerp(start_color, end_color, s) {
    const start_color_rgb = hexToRGB(start_color);
    const end_color_rgb = hexToRGB(end_color);

    const delta_red = end_color_rgb[0] - start_color_rgb[0];
    const red = (delta_red * s) + start_color_rgb[0];

    const delta_green = end_color_rgb[1] - start_color_rgb[1];
    const green = (delta_green * s) + start_color_rgb[1];

    const delta_blue = end_color_rgb[2] - start_color_rgb[2];
    const blue = (delta_blue * s) + start_color_rgb[2];

    return [red, green, blue];
}

/**
 * Convert a pixel position to coordinates
 *
 * @param {float} w - The width on the canvas
 * @param {float} h - The height on the canvas
 * @returns {array} The coordinates as [x, y]
 */
export function pixelsToCoords(width, height) {
    const x = (width - fieldContainer.canvas.width/2) / fieldContainer.coordScale;
    const y = -(height - fieldContainer.canvas.height/2) / fieldContainer.coordScale;

    return [x - fieldContainer.offsetX, y - fieldContainer.offsetY];
}

/**
 * Convert coordiantes to a pixel position
 *
 * @param {float} x - The x coordinate
 * @param {float} y - The y coordinate
 * @returns {array} The width and height as [w, h]
 */
export function coordsToPixels(x, y) {
    const width = (x + fieldContainer.offsetX) * fieldContainer.coordScale;
    const height = -(y + fieldContainer.offsetY) * fieldContainer.coordScale

    return [width + fieldContainer.canvas.width/2, height + fieldContainer.canvas.height/2];
}

/**
 * Convert hex code to rgb
 *
 * @param {string} hex - The hex code of the color
 * @returns {array} The rgb value of the hex code as [r, g, b]
 */
export function hexToRGB(hex) {
    const chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

    const red = ( 16 * chars.indexOf(hex[1]) ) + chars.indexOf(hex[2]);
    const green = ( 16 * chars.indexOf(hex[3]) ) + chars.indexOf(hex[4]);
    const blue = ( 16 * chars.indexOf(hex[5]) ) + chars.indexOf(hex[6]);

    return [red, green, blue];
}