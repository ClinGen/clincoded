// Return the score(s) from the given array of scores that are not owned by the curator

'use strict';

var _ = require('underscore');

const DEFAULT_VALUE = 'Not Scored';

export function othersScored(scores, curatorUuid) {
    // See if others have assessed
    return !!_(scores).find(function(score) {
        return (score.submitted_by.uuid !== curatorUuid) && score.value !== DEFAULT_VALUE;
    });
}
