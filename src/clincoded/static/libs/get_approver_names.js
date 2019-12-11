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
    let approverName;
    if (additionalApprover.startsWith('5')) {
        approverName = getAffiliationNameBySubgroupID('vcep', additionalApprover);
    } else if (additionalApprover.startsWith('4')) {
        approverName = getAffiliationNameBySubgroupID('gcep', additionalApprover);
    }
    return approverName;
}