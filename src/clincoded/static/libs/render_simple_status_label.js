'use strict';
import React from 'react';

/**
 * Method to generically display a status tag/label given the status of a classification
 * Applicable to: snapshots, GCI Evidence Summary, VCI Evaluation Summary
 * @param {string} status - The status of a given classification in a GDM or Interpretation
 */
export function renderSimpleStatusLabel(status) {
    if (status === 'In progress') {
        return <span className="label label-warning">IN PROGRESS</span>;
    } else if (status.match(/Provisional|Provisioned/)) {
        return <span className="label label-info">PROVISIONAL</span>;
    } else if (status === 'Approved') {
        return <span className="label label-success">APPROVED</span>;
    }
}
