'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the 'new' provisional status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {object} gdm - The GDM object
 * @param {object} context - The global context object
 * @param {boolean} allowApproval - Whether to render link for view/approve provisional
 */
export function renderNewProvisionalStatus(snapshots, gdm, context, allowApproval) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been provisioned
    const provisionedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Provisioned' && snapshot.resourceType === 'classification';
    });
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'classification';
    });
    // If the current provisional Classification is more recent than this approved Classification, display 'New Provisional' status
    let newProvisionalExist = false;
    if (provisionedSnapshots && provisionedSnapshots.length && approvedSnapshots && approvedSnapshots.length) {
        newProvisionalExist = moment(provisionedSnapshots[0].resource.provisionalDate).isAfter(approvedSnapshots[0].resource.approvalDate);
    }

    if (newProvisionalExist) {
        return (
            <span className="provisional-status-wrapper">
                <span className="label label-info status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Provisioned on ' + moment(provisionedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                    <span className="badge">NEW</span> PROVISIONAL
                </span>
                {context && context.name === 'curation-central' && allowApproval ? renderProvisionalLink(gdm) : null}
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