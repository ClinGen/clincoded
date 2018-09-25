'use strict';
import React from 'react';
import { getAffiliationName } from './get_affiliation_name';
import { renderInProgressStatus } from './render_in_progress_status';
import { renderProvisionalStatus } from './render_provisional_status';
import { renderApprovalStatus } from './render_approval_status';
import { renderNewProvisionalStatus } from './render_new_provisional_status';
import { renderPublishStatus } from './render_publish_status';
import { renderNewSummaryStatus } from './render_new_summary_status';

/**
 * Method to render a GDM's classifications' common content (e.g. submitter name, calculated/modified classifications)
 * @param {object} classification - A GDM classification object
 * @param {object} gdm - The gene-disease record
 * @param {object} context - The global context object
 * @param (boolean) showProvisionalLink - Whether to render link to view/approve provisioned classification
 */
export function renderClassificationContent(classification, gdm, context, showProvisionalLink) {
    let affiliationId = classification.affiliation ? classification.affiliation : null;
    let userId = classification.submitted_by.uuid;
    let snapshots = classification.associatedClassificationSnapshots && classification.associatedClassificationSnapshots.length ? classification.associatedClassificationSnapshots : [];

    return (
        <span className="classification-status">
            {classification.affiliation ?
                <span>{getAffiliationName(classification.affiliation)}&nbsp;&mdash;&nbsp;</span>
                :
                <span>{classification.submitted_by.title}&nbsp;&mdash;&nbsp;</span>
            }
            {classification.autoClassification ? <span><strong>Calculated:</strong>&nbsp;{classification.autoClassification}</span> : null}
            {classification.alteredClassification ? <span>;&nbsp;<strong>Modified:</strong>&nbsp;{classification.alteredClassification}</span> : null}
            <span className="classification-status-wrapper">
                <span>;&nbsp;<strong>Status:</strong></span>
                {snapshots && snapshots.length ?
                    <span>
                        {renderProvisionalStatus(snapshots, 'classification', gdm, context, showProvisionalLink)}
                        {renderApprovalStatus(snapshots, 'classification', context, affiliationId, userId)}
                        {renderNewProvisionalStatus(snapshots, 'classification', gdm, context, showProvisionalLink)}
                        {renderPublishStatus(snapshots)}
                        {renderNewSummaryStatus(classification)}
                    </span>
                    :
                    <span>{renderInProgressStatus(classification)}</span>
                }
            </span>
        </span>
    );
}
