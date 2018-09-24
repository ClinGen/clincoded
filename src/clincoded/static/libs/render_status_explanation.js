'use strict';
import React from 'react';
import { ContextualHelp } from './bootstrap/contextual_help';

/**
 * Method to render a mouseover explanation for the variant title
 */
export function renderInterpretationStatusExplanation() {
    const explanation = 'Interpretations marked "Approved" may be viewed by any user within the interface; those marked "In progress" or "Provisional" are viewable only by the submitter.';
    return (
        <span className="interpretation-status-explanation"><ContextualHelp content={explanation} /></span>
    );
}
