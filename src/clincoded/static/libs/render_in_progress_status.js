'use strict';
import React from 'react';
import moment from 'moment';

/**
 * Method to render 'IN PROGRESS' status tag/label for a given classification
 * @param {object} classification - The saved GDM classification
 */
export function renderInProgressStatus(classification) {
    if (classification && classification.classificationStatus && classification.classificationStatus === 'In progress') {
        return (
            <span className="status-wrapper in-progress">
                <span className="label label-warning" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Last saved on ' + moment(classification.last_modified).format("YYYY MMM DD, h:mm a")}>
                    IN PROGRESS
                </span>
            </span>
        );
    } else {
        return <span className="no-classification">None</span>;
    }
}