// # JSON object helper: Getter Method
// # Parameters: ElasticSearch data object, key/property
// # Usage: findNonEmptyArray(individualObj, 'associatedAnnotations')

'use strict';
import _ from 'underscore';

/**
 * Traverse JSON object tree to find the targeted non-empty array
 * @param {object} obj - JSON data object returned ElasticSearch
 * @param {string} prop - key for the targeted array in the object
 */
export function findNonEmptyArray(obj, prop) {
    let result; // type of object
    if (!_.isEmpty(obj[prop])) {
        return result = obj[prop][0];
    } else {
        for (let key in obj) {
            if (_.isArray(obj[key]) && !_.isEmpty(obj[key])) {
                if (obj[key][0].hasOwnProperty(prop) && !_.isEmpty(obj[key][0][prop])) {
                    return result = obj[key][0][prop][0];
                } else {
                    for (let x in obj[key][0]) {
                        if (_.isArray(obj[key][0][x]) && !_.isEmpty(obj[key][0][x])) {
                            if (obj[key][0][x][0].hasOwnProperty(prop) && !_.isEmpty(obj[key][0][x][0][prop])) {
                                return result = obj[key][0][x][0][prop][0];
                            }
                        }
                    }
                }
            }
        }
    }
}
