// Return the score from the given array of scores that's owned by the curator with the
// given UUID. The returned score is a clone of the original object, so it can be modified
// without side effects.

'use strict';

var _ = require('underscore');

export function userScore(scores, curatorUuid) {
    if (curatorUuid) {
        return _.chain(scores).find(function(score) {
            return score.submitted_by.uuid === curatorUuid;
        }).clone().value();
    }
    return null;
}
