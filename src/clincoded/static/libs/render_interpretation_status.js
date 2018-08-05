'use strict';
import React from 'react';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the status(es) of all interpretations on a given variant
 * Primarily for the display of all interpretations on the 'Basic Info' tab in the VCI
 * Specifically, it renders a linkout to the interpretation's evaluation summary IF the interpretation had ben approved
 * @param {object} classification - The 'provisional_variant' object associated with a given interpretation
 */
export function renderInterpretationStatus(classification) {
    const status = classification.classificationStatus;
    let affiliationId = classification.affiliation ? classification.affiliation : null;
    let userId = classification.submitted_by.slice(7, -1);
    let snapshots = classification.associatedInterpretationSnapshots && classification.associatedInterpretationSnapshots.length ? classification.associatedInterpretationSnapshots : [];
    let filteredSnapshots = [];
    // Determine whether the classification had been previously approved
    if (snapshots && snapshots.length) {
        filteredSnapshots = snapshots.filter(snapshot => {
            return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'interpretation';
        });
        // The "In progress" label shouldn't be shown after any given number of Provisional/Approval had been saved
        let sortedSnapshots = sortListByDate(snapshots, 'date_created');
        if (status === 'In progress') {
            if (sortedSnapshots[0].approvalStatus === 'Provisioned') {
                if (filteredSnapshots.length) {
                    return (
                        <span className="classification-status">
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                <span className="classification-link-item"><a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a></span>
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        </span>
                    );
                } else {
                    return <span className="label label-info">PROVISIONAL</span>;
                }
            } else if (sortedSnapshots[0].approvalStatus === 'Approved') {
                return (
                    <span className="classification-status">
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                            <span className="classification-link-item"><a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a></span>
                        </span>
                    </span>
                );
            }
        } else {
            if (status === 'Provisional') {
                if (filteredSnapshots.length) {
                    return (
                        <span className="classification-status">
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                <span className="classification-link-item"><a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a></span>
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        </span>
                    );
                } else {
                    return <span className="label label-info">PROVISIONAL</span>;
                }
            } else if (status === 'Approved') {
                return (
                    <span className="classification-status">
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                            <span className="classification-link-item"><a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a></span>
                        </span>
                    </span>
                );
            }
        }
    } else {
        if (status === 'In progress') {
            return <span className="label label-warning">IN PROGRESS</span>;
        }
    }
}

/**
 * Method to render linkout to the evidence summary of a given approved classification
 */
function renderViewSnapshotSummaryLink(snapshots, status, affiliationId, userId) {
    let url, snapshotUuid, param;
    let matchingSnapshots = snapshots && snapshots.length ? snapshots.filter(snapshot => snapshot.approvalStatus === status) : null;
    let snapshot = matchingSnapshots && matchingSnapshots.length ? matchingSnapshots[0] : null;
    if (snapshot) {
        snapshotUuid = snapshot['uuid'];

        if (affiliationId && affiliationId.length) {
            param = '&affiliationId=' + affiliationId;
        } else if (userId && userId.length) {
            param = '&userId=' + userId;
        }

        url = '/variant-interpretation-summary/?snapshot=' + snapshotUuid + '&status=' + status + param;
        
        return url;
    }
}