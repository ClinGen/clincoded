'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';
import { renderProvisionalLink } from "./render_provisional_status";

/**
 * Method to render the 'NEW PROVISIONAL' status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {object} context - The global context object
 * @param {boolean} showLink - Whether to render link to view/approve provisional (gdm) or view provisional summary (interpretation)
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 * @param {boolean|null} isMyClassification - refer to `renderProvisionalLink()`
 * @param {string|null} affiliationId - refer to `renderProvisionalLink()`
 * @param {string|null} userId - refer to `renderProvisionalLink()`
 */
export function renderNewProvisionalStatus(snapshots, resourceType, gdm, context, showLink, stringOnly=false, isMyClassification=null, affiliationId=null, userId=null) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been provisioned
    const provisionedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Provisioned' && snapshot.resourceType === resourceType;
    });
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === resourceType;
    });
    // If the current provisional Classification is more recent than this approved Classification, display 'New Provisional' status
    let newProvisionalExist = false;
    if (provisionedSnapshots && provisionedSnapshots.length && approvedSnapshots && approvedSnapshots.length) {
        // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
        // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
        // comparing 'provisionalDate' to 'approvalDate' is impossible due to the absence of 'resource' obejct.
        // Going forward, we still want the 'provisionalDate' to 'approvalDate' comparison because it's more accurate.
        if (provisionedSnapshots[0].resource && provisionedSnapshots[0].resource.provisionalDate && approvedSnapshots[0].resource && approvedSnapshots[0].resource.approvalDate) {
            newProvisionalExist = moment(provisionedSnapshots[0].resource.provisionalDate).isAfter(approvedSnapshots[0].resource.approvalDate);
        } else {
            // Fallback timestamp comparison for old snapshots prior to R22 release
            newProvisionalExist = moment(provisionedSnapshots[0].date_created).isAfter(approvedSnapshots[0].date_created);
        }
    }
    let showProvisionalLink = false;
    if (resourceType === 'classification' &&
        context && context.name.match(/curation-central|provisional-curation|provisional-classification/) 
        && showLink) {
        showProvisionalLink = true;
    } else if (resourceType === 'interpretation' && showLink) {
        showProvisionalLink = true;
    }
    if (newProvisionalExist) {
        if (stringOnly) {
            return 'New Provisional';
        } else {
            return (
                <span className="status-wrapper new-provisional">
                    <span className="label label-info status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Provisioned on ' + moment(provisionedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                        <span className="badge">NEW</span> PROVISIONAL
                    </span>
                    {showProvisionalLink ? renderProvisionalLink(provisionedSnapshots[0], resourceType, gdm, isMyClassification, affiliationId, userId) : null}
                </span>
            );
        }
    } else {
        return null;
    }
}
