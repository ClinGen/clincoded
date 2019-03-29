'use strict';
import React from 'react';
import moment from 'moment';
import { getClassificationSavedDate } from './get_saved_date';

/**
 * Method to render 'NEW SAVED SUMMARY' status tag/label for a given classification
 * @param {object} classification - The saved GDM classification
 */
export function renderNewSummaryStatus(classification) {
    if (classification && classification.classificationStatus && classification.classificationStatus === 'In progress') {
        return (
            <span className="status-wrapper new-summary">
                <span className="label label-info" data-toggle="tooltip" data-placement="top"
                    data-tooltip={'Last saved on ' + moment(getClassificationSavedDate(classification)).format("YYYY MMM DD, h:mm a")}>
                        NEW SAVED SUMMARY
                </span>
            </span>
        );
    } else {
        return null;
    }
}