'use strict';

import React, {PropTypes} from 'react';
import VARIANT_KIND_MAPS from '../constants/variant_kind_maps';
import { userScore } from './user_score';

var _ = require('underscore');

const consoleMsgStyles = "color: white; background-color: red; padding: 2px";

// Utility function to display the Proband individual score panel,
// and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
module.exports = {
    // Renders Proband individual score panel
    render(evidenceScores, otherScores) {
        let validScores = [];
        let filteredScores = [];
        let user = this.props.session && this.props.session.user_properties;
        if (evidenceScores && evidenceScores.length) {
            if (otherScores) {
                filteredScores = evidenceScores.filter(score => {
                    return score.submitted_by.uuid !== user.uuid;
                });
            } else {
                filteredScores = evidenceScores;
            }
        }
        _.map(filteredScores, score => {
            if (score.value !== 'none') {
                validScores.push(score);
            }
        });

        return (
            <div className="row">
                {validScores.map((item, i) => {
                    return (
                        <div key={i} className="variant-view-panel">
                            <h5>{item.submitted_by.title}</h5>
                            {item.scoreStatus && item.scoreStatus === 'Score' ?
                                <div>
                                    <dl className="dl-horizontal">
                                        <dt>Score Status</dt>
                                        <dd>{item.scoreStatus}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Variant Kind</dt>
                                        <dd>{item.variantKind ? renderVariantKind(item.variantKind) : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Default Score</dt>
                                        <dd>{item.calculatedScore ? item.calculatedScore : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Changed Score</dt>
                                        <dd>{item.score ? item.score : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Reaon(s) for score change</dt>
                                        <dd>{item.changeReason ? item.changeReason : null}</dd>
                                    </dl>
                                </div>
                                :
                                <div><dl className="dl-horizontal"><dt>Score Status</dt><dd>{item.scoreStatus}</dd></dl></div>
                            }
                        </div>
                    );
                })}
            </div>
        );
    },
};

function renderVariantKind(value) {
    let description;
    // Put VARIANT_KIND_MAPS object keys into an array
    const variantKindKeys = Object.keys(VARIANT_KIND_MAPS);
    // Default number of variant kinds in dropdown selection
    let variantKindMapping = VARIANT_KIND_MAPS.OTHER;
    // Assign different number of variant kinds given a matched modeInheritance
    variantKindMapping.forEach(item => {
        if (value === item.KIND) {
            description = item.DESCRIPTION;
        }
    });
    return description;
}
