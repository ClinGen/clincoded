'use strict';
import React from 'react';
import { renderInProgressStatus } from './render_in_progress_status';
import { renderProvisionalStatus } from './render_provisional_status';
import { renderApprovalStatus } from './render_approval_status';
import { renderNewProvisionalStatus } from './render_new_provisional_status';
import { renderPublishStatus } from './render_publish_status';

/**
 * Method to render the status(es) of all interpretations on a given variant
 * Primarily for the display of all interpretations on the 'Basic Info' tab in the VCI
 * Specifically, it renders a linkout to the interpretation's evaluation summary IF the interpretation had ben approved
 * @param {object} classification - The 'provisional_variant' object associated with a given interpretation
 * @param (boolean) showProvisionalLink - Whether to render link to view provisional summary
 */
export function renderInterpretationStatus(classification, showProvisionalLink) {
    let affiliationId = classification.affiliation ? classification.affiliation : null;
    let userId = classification.submitted_by.slice(7, -1);
    let snapshots = classification.associatedInterpretationSnapshots && classification.associatedInterpretationSnapshots.length ? classification.associatedInterpretationSnapshots : [];

    if (snapshots && snapshots.length) {
        return (
            <span className="classification-status">
                <span className="classification-status-wrapper">
                    {renderProvisionalStatus(snapshots, 'interpretation', null, null, showProvisionalLink)}
                    {renderApprovalStatus(snapshots, 'interpretation', null, affiliationId, userId)}
                    {renderNewProvisionalStatus(snapshots, 'interpretation', null, null, showProvisionalLink)}
                    {renderPublishStatus(snapshots)}
                </span>
            </span>
        );
    } else {
        return (
            <span className="classification-status">
                <span className="classification-status-wrapper">
                    {renderInProgressStatus(classification)}
                </span>
            </span>
        );
    }
}
