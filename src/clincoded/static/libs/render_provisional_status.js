'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the provisional status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {object} context - The global context object
 * @param {boolean} allowApproval - Whether to render link for view/approve provisional
 */
export function renderProvisionalStatus(snapshots, resourceType, gdm, context, allowApproval) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been provisioned
    const provisionedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Provisioned' && snapshot.resourceType === resourceType;
    });
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === resourceType;
    });

    if (provisionedSnapshots && provisionedSnapshots.length && (!approvedSnapshots || (approvedSnapshots && !approvedSnapshots.length))) {
        return (
            <span className="provisional-status-wrapper">
                <span className="label label-info status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Provisioned on ' + moment(provisionedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                    PROVISIONAL
                </span>
                {resourceType === 'classification' && context && context.name === 'curation-central' && allowApproval ? renderProvisionalLink(gdm) : null}
            </span>
        );
    } else {
        return null;
    }
}

function renderProvisionalLink(gdm) {
    return (
        <span className="classification-link-item">
            <a href={'/provisional-classification/?gdm=' + gdm.uuid + '&approval=yes'} title="View/Approve Current Provisional"><i className="icon icon-link"></i></a>
        </span>
    );
}