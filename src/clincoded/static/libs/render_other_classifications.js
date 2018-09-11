'use strict';
import React from 'react';
import { getAffiliationName } from './get_affiliation_name';
import { renderInProgressStatus } from './render_in_progress_status';
import { renderProvisionalStatus } from './render_provisional_status';
import { renderApprovalStatus } from './render_approval_status';
import { renderNewProvisionalStatus } from './render_new_provisional_status';
import { renderPublishStatus } from './render_publish_status';

/**
 * Method to render a GDM's classifications that are not owned by the logged-in user/affiliation
 * @param {object} classification - A GDM classification object
 */
export function renderOtherClassifications(classification, gdm, context) {
    let affiliationId = classification.affiliation ? classification.affiliation : null;
    let userId = classification.submitted_by.uuid;
    let snapshots = classification.associatedClassificationSnapshots && classification.associatedClassificationSnapshots.length ? classification.associatedClassificationSnapshots : [];

    if (snapshots && snapshots.length) {
        return (
            <span className="classification-status">
                {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                <span className="classification-status-wrapper">
                    {renderProvisionalStatus(snapshots, 'classification', gdm, context, false)}
                    {renderApprovalStatus(snapshots, 'classification', context, affiliationId, userId)}
                    {renderNewProvisionalStatus(snapshots, 'classification', gdm, context, false)}
                    {renderPublishStatus(snapshots)}
                </span>
            </span>
        );
    } else {
        return (
            <span className="classification-status">
                {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                <span className="classification-status-wrapper">
                    {renderInProgressStatus(classification)}
                </span>
            </span>
        );
    }
}
