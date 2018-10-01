'use strict';
import React from 'react';
import { ContextualHelp } from './bootstrap/contextual_help';

/**
 * Method to render a mouseover explanation for the all classifications and interpretations panel titles
 * @param {string} resourceType - A text string of either 'Classifications' or 'Interpretations'
 */
export function renderStatusExplanation(resourceType) {
    const explanation = resourceType + ' marked as "Approved" may be viewed by any user within the interface; those marked as "In progress" or "Provisional" are viewable only by the submitter.';
    return (
        <span className="interpretation-status-explanation"><ContextualHelp content={explanation} /></span>
    );
}
