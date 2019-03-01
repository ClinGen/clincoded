'use strict';

const AffiliationsList = require('../components/affiliation/affiliations.json');

/**
 * Method to return the affiliation fullname given the affiliation ID
 * @param {string} id - Affiliation ID
 * @param {string} subgroup - Affiliation subgroup (optional)
 */
export function getAffiliationName(id, subgroup = '') {
    let name;
    if (id.length) {
        AffiliationsList.forEach(affiliation => {
            if (affiliation.affiliation_id === id) {
                if (subgroup && affiliation.subgroups && affiliation.subgroups[subgroup]) {
                    name = affiliation.subgroups[subgroup].fullname;
                } else {
                    name = affiliation.affiliation_fullname;
                }
            }
        });
    }
    return name;
}

/**
 * Method to return an affiliation subgroup's full name given the subgroup ID
 * @param {string} subgroup - Affiliation subgroup
 * @param {string} subgroup_id - Affiliation subgroup ID
 */
export function getAffiliationNameBySubgroupID(subgroup, subgroup_id) {
    let name;
    if (subgroup && subgroup_id) {
        AffiliationsList.forEach(affiliation => {
            if (affiliation.subgroups && affiliation.subgroups[subgroup] && affiliation.subgroups[subgroup].id === subgroup_id) {
                name = affiliation.subgroups[subgroup].fullname;
            }
        });
    }
    return name;
}