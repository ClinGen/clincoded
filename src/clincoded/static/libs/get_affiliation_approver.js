'use strict';

const AffiliationsList = require('../components/affiliation/affiliations.json');

/**
 * Method to return a list of designated classification approvers
 * with an affiliation given the affiliation ID
 * @param {string} id - Affiliation ID

 */
export function getAffiliationApprover(id) {
    let approvers = [];
    if (id.length) {
        AffiliationsList.forEach(affiliation => {
            if (affiliation.affiliation_id === id && affiliation.hasOwnProperty['approver']) {
                approvers = affiliation.approver;
            }
        });
    }
    return approvers;
}