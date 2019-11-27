'use strict';
import { getAffiliationName, getAffiliationNameBySubgroupID } from './get_affiliation_name.js';

// Takes in a list of affiliation IDs and renders names for display
export function getContributorNames(classificationContributors) {
    const contributorNames = [];
    classificationContributors.forEach(contributorId => {
        contributorNames.push(getAffiliationName(contributorId));
    });
    return contributorNames;
}

// Takes in a list of affiliation subgroup IDs and renders names for display
export function getApproverNames(additionalApprover) {
    const approverNames = [];
    additionalApprover.forEach(approverId => {
        if (approverId.startsWith('5')) {
            approverNames.push(getAffiliationNameBySubgroupID('vcep', approverId));
        } else if (approverId.startsWith('4')) {
            approverNames.push(getAffiliationNameBySubgroupID('gcep', approverId));
        }
    });
    return approverNames;
}