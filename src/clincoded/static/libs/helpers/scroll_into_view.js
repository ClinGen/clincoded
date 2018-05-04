'use strict';

/**
 * Scroll DOM element into viewport
 */
export function scrollElementIntoView(str) {
    const elementId = '#' + str;
    const element = document.querySelector(elementId);
    if (element) {
        element.scrollIntoView();
    }
}