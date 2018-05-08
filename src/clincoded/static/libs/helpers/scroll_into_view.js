'use strict';

/**
 * Find a single DOM element by id or CSS selector
 * The scroll this DOM element into viewport
 */
export function scrollElementIntoView(str, selector) {
    let domElement;
    if (selector === 'id') {
        domElement = '#' + str;
    } else if (selector === 'class') {
        domElement = '.' + str;
    }
    const el = document.querySelector(domElement);
    if (el) {
        el.scrollIntoView();
    }
}