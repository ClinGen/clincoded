'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the publication status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 */
export function renderPublishStatus(snapshots) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been published
    const publishedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.resource && snapshot.resource.publishClassification;
    });
    // Get any snapshots that had been approved but not published
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resource && !snapshot.resource.publishClassification;
    });
    // If the current approved Classification is more recent than this published Classification, show warning message
    let publishedWarningMessage = false;
    if (approvedSnapshots && approvedSnapshots.length && publishedSnapshots && publishedSnapshots.length) {
        publishedWarningMessage = moment(approvedSnapshots[0].resource.approvalDate).isAfter(publishedSnapshots[0].resource.publishDate);
    }

    if (publishedSnapshots && publishedSnapshots.length > 0) {
        return (
            <span className="publication-status-wrapper">
                <span className="label publish-background status-item" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Published on ' + moment(publishedSnapshots[0].resource.publishDate).format("YYYY MMM DD, h:mm a")}>
                    PUBLISHED
                </span>
                {publishedWarningMessage ? renderPublishedWarningMessage() : null}
            </span>
        );
    } else {
        return null;
    }
}

function renderPublishedWarningMessage() {
    return (
        <span className="publish-warning" data-toggle="tooltip" data-placement="top"
            data-tooltip="The current approved Classification is more recent than this published Classification.">
            <i className="icon icon-exclamation-triangle"></i>
        </span>
    );
}