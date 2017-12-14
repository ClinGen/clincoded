'use strict';

const AffiliationsList = require('../components/affiliation/affiliations.json');

/**
 * Method to return the affiliation fullname given the affiliation ID
 * @param {string} id - Affiliation ID

 */
export function getAffiliationName(id) {
    let name;
    if (id.length) {
        AffiliationsList.forEach(affiliation => {
            if (affiliation.affiliation_id === id) {
                name = affiliation.affiliation_fullname;
            }
        });
    }
    return name;
}