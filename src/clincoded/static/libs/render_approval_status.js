'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the 'APPROVED' status of a given GDM's classification or interpretation
 * @param {array} snapshots - List of snapshots associated with a classification or interpretation
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} context - The global context object
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 * @param {boolean} stringOnly - Wether return status text or status labels/tags (default returns labels/tags)
 */
export function renderApprovalStatus(snapshots, resourceType, context, affiliationId, userId, stringOnly=false) {
    let showApprovalLink = false;
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === resourceType;
    });
    // Show the approval link if the following conditions are true
    if (resourceType === 'classification' && context && context.name.match(/curation-central|provisional-curation|provisional-classification/) && (affiliationId || userId)) {
        showApprovalLink = true;
    } else if (resourceType === 'interpretation' && (affiliationId || userId)) {
        showApprovalLink = true;
    }
    if (approvedSnapshots && approvedSnapshots.length) {
        if (stringOnly) {
            return 'Approved';
        } else {
            return (
                <span className="status-wrapper approval">
                    <span className="label label-success status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Approved on ' + moment(approvedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                        APPROVED
                    </span>
                    {showApprovalLink ? renderApprovalLink(approvedSnapshots[0], resourceType, affiliationId, userId) : null}
                </span>
            );
        }
    } else {
        return null;
    }
}

/**
 * Method to render linkout to the evidence summary of a given approved classification or interpretation
 * @param {object} snapshot - The approved classification or interpretation snapshot
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {string} affiliationId - The affiliation ID
 * @param {string} userId - The user's UUID
 */
function renderApprovalLink(snapshot, resourceType, affiliationId, userId) {
    let url, param = '', summary_uri = '';
    if (resourceType === 'classification') {
        summary_uri = '/gene-disease-evidence-summary/';
    } else if (resourceType === 'interpretation') {
        summary_uri = '/variant-interpretation-summary/';
    }
    if (snapshot) {
        if (affiliationId && affiliationId.length) {
            param = '&status=Approved&affiliationId=' + affiliationId;
        } else if (userId && userId.length) {
            param = '&status=Approved&userId=' + userId;
        }
        url = summary_uri + '?snapshot=' + snapshot.uuid + param;
    }
    return (
        <span className="classification-link-item">
            <a href={url} title="View Current Approved" target="_blank"><i className="icon icon-link"></i></a>
        </span>
    );
}
