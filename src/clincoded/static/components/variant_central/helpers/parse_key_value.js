// # JSON response helper: Getter Method
// # Parameters: JSON response, key/property
// # Usage: parseKeyValue(response, 'hg19')

'use strict';

// Traverse JSON object tree to find a property and its value
// Primarily written to parse myvariant.info response
export function parseKeyValue(response, prop) {
    let result; // types of object, array, string or number

    if (typeof response === 'object' && Object.keys(response).length) {
        if (response.hasOwnProperty(prop)) {
            // Found key at object's root level
            result = response[prop];
            return result;
        } else {
            for (let key in response) {
                if (typeof response[key] === 'object') {
                    if (response[key].hasOwnProperty(prop)) {
                        // Found key at object's second level
                        result = response[key][prop];
                        return result;
                    }
                }
            }
            // The key has not been found
            return false;
        }
    }
}
