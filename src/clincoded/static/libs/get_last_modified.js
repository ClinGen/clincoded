'use strict';
import { sortListByDate } from './helpers/sort';
import { searchKeyInObject } from './helpers/search_key_in_object';

/**
 * Wrapper function to return the "latest" value of all found last_modified timestamps in a JSON object tree
 * @param {string} prop - The name of the key or property
 * @param {object} obj - The object to search within
 */
export const getLastModified = (obj, prop) => {
    let found = obj && Object.keys(obj).length ? searchKeyInObject(obj, prop) : null;
    let sorted = found && found.length ? sortListByDate(found, null) : null;
    let timestamp = sorted && sorted.length ? sorted[0] : null;
    return timestamp;
};