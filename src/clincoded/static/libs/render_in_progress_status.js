'use strict';
import React from 'react';
import moment from 'moment';
import { getClassificationSavedDate } from './get_saved_date';

/**
 * Method to render 'IN PROGRESS' status tag/label for a given classification
 * @param {object} classification - The saved GDM classification
 * @param {boolean} stringOnly - Wether return status text or status labels/tags (default returns labels/tags)
 */
export function renderInProgressStatus(classification, stringOnly=false) {
    if (classification && classification.classificationStatus && classification.classificationStatus === 'In progress') {
        if (stringOnly) {
            return 'In Progress';
        } else {
            return (
                <span className="status-wrapper in-progress">
                    <span className="label label-warning" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Last saved on ' + moment(getClassificationSavedDate(classification)).format("YYYY MMM DD, h:mm a")}>
                        IN PROGRESS
                    </span>
                </span>
            );
        }
    } else {
        if (stringOnly) {
            return 'None';
        } else {
            return <span className="no-classification">None</span>;
        }
    }
}