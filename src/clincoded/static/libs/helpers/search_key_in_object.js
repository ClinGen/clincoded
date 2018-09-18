'use strict';

/**
 * Recursively search a JSON object tree to find all the values of a key/property
 * @param {string} prop - The name of the key or property
 * @param {object} obj - The object to search within
 * @param {array} found - The list of recursively added values of found key
 */
export const searchKeyInObject = (obj, prop, found = []) => {
    if (obj && Object.keys(obj).length) {
        for (let [key, value] of Object.entries(obj)) {
            if (key === prop) {
                found.push(value);
                return found;
            }
            if (typeof obj[key] !== 'undefined' && obj[key] !== null) {
                if (Object.keys(obj[key]).length) {
                    searchKeyInObject(obj[key], prop, found);
                } else if (Array.isArray(obj[key]) && obj[key].length) {
                    for (let item of obj[key]) {
                        if (typeof item === 'object' && Object.keys(item).length) {
                            searchKeyInObject(item, prop, found);
                        }
                    }
                }
            }
        }
    }
    return found;
};