'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';

/**
 * Method to render the publication status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {boolean} stringOnly - Wether return status text or status labels/tags (default returns labels/tags)
 */
export function renderPublishStatus(snapshots, stringOnly=false) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been published
    const publishedSnapshots = sortedSnapshots.filter(snapshot => {
        return (snapshot.resource && snapshot.resource.publishClassification) || snapshot.publishStatus;
    });
    // Get any snapshots that had been approved but not published
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && ((snapshot.resource && !snapshot.resource.publishClassification) || !snapshot.publishStatus);
    });
    // If the current approved Classification is more recent than this published Classification, show warning message
    let publishedWarningMessage = false; 
    if (approvedSnapshots && approvedSnapshots.length && publishedSnapshots && publishedSnapshots.length) {
        // The 'resource' object was absent in the flatten 'snapshot' object prior to R22 release.
        // So for those snapshots saved into 'associatedClassificationSnapshots' array previously,
        // comparing 'approvalDate' to 'publishDate' is impossible due to the absence of 'resource' obejct.
        // Going forward, we still want the 'approvalDate' to 'publishDate' comparison because it's more accurate.
        if (approvedSnapshots[0].resource && approvedSnapshots[0].resource.approvalDate && publishedSnapshots[0].resource && publishedSnapshots[0].resource.publishDate) {
            publishedWarningMessage = moment(approvedSnapshots[0].resource.approvalDate).isAfter(publishedSnapshots[0].resource.publishDate);
        } else {
            // For snapshots saved into 'associatedClassificationSnapshots' array prior to R22 release,
            // we fallback to compare their 'date_created' timestamps - current approved vs. previously approved/published
            publishedWarningMessage = moment(approvedSnapshots[0].date_created).isAfter(publishedSnapshots[0].date_created);
        }
    }

    if (publishedSnapshots && publishedSnapshots.length) {
        let publishDate = publishedSnapshots[0].resource && publishedSnapshots[0].resource.publishDate ? publishedSnapshots[0].resource.publishDate : null;
        if (stringOnly) {
            return 'Published';
        } else {
            return (
                <span className="status-wrapper publication">
                    {publishDate ?
                        <span className="label publish-background status-item" data-toggle="tooltip" data-placement="top"
                            data-tooltip={'Published on ' + moment(publishDate).format("YYYY MMM DD, h:mm a")}>
                            PUBLISHED
                        </span>
                        :
                        <span className="label publish-background status-item">PUBLISHED</span>
                    }
                    {publishedWarningMessage ? renderPublishedWarningMessage() : null}
                </span>
            );
        }
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