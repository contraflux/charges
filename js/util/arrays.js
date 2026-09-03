/**
 * arrays
 * 
 * Useful functions for constructing arrays
 * 
 * @author contraflux
 * @date 10/2/2025
 */

/**
 * Create an array of evenly spaced values with a specified length
 *
 * @param {float} start - The first value of the array
 * @param {float} end - The last value of the array
 * @param {int} count - The number of elements in the array
 * @returns {array} The resultant array of values
 */
export function linRange(start, end, count) {
    const spacing = (end - start) / (count - 1);
    let arr = [];

    for (let i = start; i <= end; i += spacing) {
        arr.push(i);
    }

    return arr;
}

/**
 * Create an array of values with a specified step size
 *
 * @param {float} start - The first value of the array
 * @param {float} end - The last value of the array
 * @param {float} step - The difference between any two consecutive values
 * @returns {array} The resultant array of values
 */
export function range(start, end, step) {
    let arr = [];

    for (let i = start; i < end; i += step) {
        arr.push(i);
    }

    return arr;
}