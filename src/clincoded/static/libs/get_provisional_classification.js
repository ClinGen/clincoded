'use strict';

import { userMatch, affiliationMatch } from '../components/globals';

/**
 * Traverse the GDM object tree to find the embedded provisionalClassification object
 * @param {object} gdm - GDM object prop
 * @param {object} affiliation - Affiliation object prop
 * @param {object} session - User session object prop
 */
export function GetProvisionalClassification(gdm, affiliation, session) {
    let result = { provisionalExist: false, provisional: null };
    if (gdm.provisionalClassifications && gdm.provisionalClassifications.length > 0) {
        gdm.provisionalClassifications.forEach(item => {
            if (affiliation && Object.keys(affiliation).length) {
                if (affiliationMatch(item, affiliation)) {
                    return result = {
                        provisionalExist: true,
                        provisional: item
                    };
                }
                return result;
            } else if (userMatch(item.submitted_by, session) && !item.affiliation) {
                return result = {
                    provisionalExist: true,
                    provisional: item
                };
            }
            return result;
        });
    }
    return result;
}
