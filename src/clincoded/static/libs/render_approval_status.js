'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the approval status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {object} context - The global context object
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 */
export function renderApprovalStatus(snapshots, context, affiliationId, userId) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'classification';
    });

    if (approvedSnapshots && approvedSnapshots.length) {
        return (
            <span className="approval-status-wrapper">
                <span className="label label-success status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Approved on ' + moment(approvedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                    APPROVED
                </span>
                {context && context.name.match(/curation-central|provisional-curation|provisional-classification/) ?
                    renderApprovalLink(approvedSnapshots[0], affiliationId, userId)
                    : null}
            </span>
        );
    } else {
        return null;
    }
}

/**
 * Method to render linkout to the evidence summary of a given approved classification
 * @param {object} snapshot - The approved classification snapshot
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 */
function renderApprovalLink(snapshot, affiliationId, userId) {
    let url, param = '';
    if (snapshot) {
        if (affiliationId && affiliationId.length) {
            param = '&status=Approved&affiliationId=' + affiliationId;
        } else if (userId && userId.length) {
            param = '&status=Approved&userId=' + userId;
        }
        url = '/gene-disease-evidence-summary/?snapshot=' + snapshot.uuid + param;
    }
    return (
        <span className="classification-link-item">
            <a href={url} title="View Current Approved Classification" target="_blank"><i className="icon icon-link"></i></a>
        </span>
    );
}
