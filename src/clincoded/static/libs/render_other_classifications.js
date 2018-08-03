'use strict';
import React from 'react';
import { sortListByDate } from './helpers/sort';
import { getAffiliationName } from './get_affiliation_name';

/**
 * Method to render a GDM's classifications that are not owned by the logged-in user/affiliation
 * @param {object} classification - A GDM classification object
 */
export function renderOtherClassifications(classification, context) {
    const status = classification.classificationStatus;
    let affiliationId = classification.affiliation ? classification.affiliation : null;
    let userId = classification.submitted_by.uuid;
    let snapshots = classification.associatedClassificationSnapshots && classification.associatedClassificationSnapshots.length ? classification.associatedClassificationSnapshots : [];
    let filteredSnapshots = [];
    if (snapshots && snapshots.length) {
        filteredSnapshots = snapshots.filter(snapshot => {
            return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'classification';
        });
        let sortedSnapshots = sortListByDate(snapshots, 'date_created');
        if (status === 'In progress') {
            if (sortedSnapshots[0].approvalStatus === 'Provisioned') {
                if (filteredSnapshots.length) {
                    return (
                        <span className="classification-status">
                            {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                {context && context.name === 'curation-central' ?
                                    <span className="classification-link-item">[ <a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a> ]</span>
                                    : null}
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        </span>
                    );
                }
            } else if (sortedSnapshots[0].approvalStatus === 'Approved') {
                return (
                    <span className="classification-status">
                        {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                            {context && context.name === 'curation-central' ?
                                <span>[ <a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a> ]</span>
                                : null}
                        </span>
                    </span>
                );
            }
        } else {
            if (status === 'Provisional') {
                if (filteredSnapshots.length) {
                    return (
                        <span className="classification-status">
                            {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                {context && context.name === 'curation-central' ?
                                    <span className="classification-link-item">[ <a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a> ]</span>
                                    : null}
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        </span>
                    );
                }
            } else if (status === 'Approved') {
                return (
                    <span className="classification-status">
                        {classification.affiliation ? <span>{getAffiliationName(classification.affiliation)}:</span> : <span>{classification.submitted_by.title}:</span>}
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                            {context && context.name === 'curation-central' ?
                                <span className="classification-link-item">[ <a href={renderViewSnapshotSummaryLink(sortedSnapshots, 'Approved', affiliationId, userId)} target="_blank">View Classification</a> ]</span>
                                : null}
                        </span>
                    </span>
                );
            }
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

        url = '/gene-disease-evidence-summary/?snapshot=' + snapshotUuid + '&status=' + status + param;
        
        return url;
    }
}