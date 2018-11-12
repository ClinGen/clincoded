'use strict';

/**
 * Sort list by date in descending order
 */
export function sortListByDate(list, field) {
    let sortedList = [];
    if (list.length) {
        if (field) {
            sortedList = list.sort((x, y) => Date.parse(x[field]) !== Date.parse(y[field]) ? Date.parse(x[field]) > Date.parse(y[field]) ? -1 : 1 : 0);
        } else {
            sortedList = list.sort((x, y) => Date.parse(x) !== Date.parse(y) ? Date.parse(x) > Date.parse(y) ? -1 : 1 : 0);
        }
    }
    return sortedList;
}

/**
 * Sort list by field name in ascending order
 */
export function sortListByField(list, field) {
    let sortedList = [];
    if (list.length) {
        sortedList = list.sort((x, y) => x[field].toLowerCase() !== y[field].toLowerCase() ? x[field].toLowerCase() < y[field].toLowerCase() ? -1 : 1 : 0);
    }
    return sortedList;
}

/**
 * Sort list by number field value in descending order
 */
export function sortListByNumber(list, field) {
    let sortedList = [];
    if (list.length) {
        sortedList = list.sort((x, y) => Number.parseFloat(x[field]) !== Number.parseFloat(y[field]) ? Number.parseFloat(x[field]) > Number.parseFloat(y[field]) ? -1 : 1 : 0);
    }
    return sortedList;
}