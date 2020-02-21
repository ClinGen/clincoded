'use strict';

/**
 * Check if Create New Gene Curation link should be enabled.
 * Only user curating as part of an affiliation that has a GCEP should be able to create new GDMs.
 * Or Demo user on test site
 * @param {object} session - User session object
 * @param {object} affiliation - User logged in affiliation data object
*/
export function isUserAllowedToCreateGdm(session, userAffiliation) {
    let allow = false;
    if ((session && session.user_properties && session.user_properties.email && session.user_properties.email === 'clingen.demo.curator@genome.stanford.edu') ||
       (userAffiliation && userAffiliation.subgroups && userAffiliation.subgroups['gcep'] && userAffiliation.subgroups['gcep'].id)) {
        allow = true;
    }
    return allow;
}
