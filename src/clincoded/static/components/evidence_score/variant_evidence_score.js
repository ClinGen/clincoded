'use strict';

import React, {PropTypes} from 'react';
import { Form, Input } from '../../libs/bootstrap/form';
import { AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, X_LINKED } from './constants/evidence_types';
import { VARIANT_IS_DE_NOVO, PREDICTED_OR_PROVEN_NULL_VARIANT, OTHER_VARIANT_TYPE_WITH_GENE_IMPACT,
         TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO, TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS } from './constants/evidence_variants';
import VARIANT_KIND_MAPS from './constants/variant_kind_maps';
import { defaultScore } from './helpers/default_score';
import { scoreRange } from './helpers/score_range';
import { userScore } from './helpers/user_score';

const consoleMsgStyles = "color: white; background-color: red; padding: 2px";

// Utility function to display the Proband individual score panel,
// and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
let evidenceDefaultScore;

module.exports = {

    // Renders Proband individual score panel
    render(evidenceScores, modeInheritance, showScoreInput, evidenceVariantKind) {
        let curratorScore;
        let user = this.props.session && this.props.session.user_properties;

        // Find if any scores for the segregation are owned by the currently logged-in user
        if (evidenceScores && evidenceScores.length) {
            // Find the score belonging to the logged-in curator, if any.
            curratorScore = userScore(evidenceScores, user && user.uuid);
        }

        // Determine mode of inheritance type via modeInheritance
        let modeInheritanceType;
        if (modeInheritance && modeInheritance.length) {
            if (modeInheritance.indexOf('Autosomal dominant inheritance') > -1) {
                modeInheritanceType = AUTOSOMAL_DOMINANT;
            } else if (modeInheritance.indexOf('Autosomal recessive inheritance') > -1) {
                modeInheritanceType = AUTOSOMAL_RECESSIVE;
            } else if (modeInheritance.indexOf('X-linked') > -1) {
                modeInheritanceType = X_LINKED;
            } else {
                modeInheritanceType = '';
                console.warn("%cCan't calculate score. Reason - improper mode of inheritance.", consoleMsgStyles);
            }
        }

        let shouldCalcScore = modeInheritanceType && modeInheritanceType.length ? true : false;

        // Put VARIANT_KIND_MAPS object keys into an array
        const variantKindKeys = Object.keys(VARIANT_KIND_MAPS);
        // Default number of variant kinds in dropdown selection
        let variantKindGroup = VARIANT_KIND_MAPS.OTHER;
        // Assign different number of variant kinds given a matched modeInheritance
        variantKindKeys.forEach(key => {
            if (modeInheritanceType && modeInheritanceType === key) {
                variantKindGroup = VARIANT_KIND_MAPS[modeInheritanceType];
            }
        });
        // Get the default score value as a number
        if (curratorScore && curratorScore.calculatedScore) {
            evidenceDefaultScore = defaultScore(modeInheritanceType, evidenceVariantKind, curratorScore.calculatedScore);
        } else {
            evidenceDefaultScore = defaultScore(modeInheritanceType, evidenceVariantKind);
        }
        // Get the score range as an array
        let evidenceScoreRange = scoreRange(modeInheritanceType, evidenceVariantKind).length ? scoreRange(modeInheritanceType, evidenceVariantKind) : [];

        return (
            <div className="row">
                <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue="none"
                    value={curratorScore && curratorScore.scoreStatus ? curratorScore.scoreStatus : null} handleChange={this.handleChange}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
                    <option value="Review">Review</option>
                    <option value="Contradicts">Contradicts</option>
                </Input>
                <Input type="select" ref="variantKind" label="Select a scenario:" defaultValue="none" handleChange={this.handleChange}
                    value={curratorScore && curratorScore.variantKind ? curratorScore.variantKind : null}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    {variantKindGroup.map(function(item, i) {
                        return <option key={i} value={item.KIND}>{item.DESCRIPTION}</option>;
                    })}
                </Input>
                {showScoreInput ?
                    <div>
                        <dl className="dl-horizontal calculated-score">
                            <dt className="col-sm-5 control-label">Default Score</dt>
                            <dd className="col-sm-7">{evidenceDefaultScore ? evidenceDefaultScore : 'Insufficient information to obtain score'}</dd>
                        </dl>
                        <Input type="select" ref="scoreRange" label={<span>Select a score from range:<i>(optional)</i></span>} defaultValue="none"
                            value={curratorScore && curratorScore.score ? curratorScore.score : null}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                            inputDisabled={evidenceScoreRange && evidenceScoreRange.length ? false : true}>
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            {evidenceScoreRange.map(function(score, i) {
                                return <option key={i} value={score}>{score}</option>;
                            })}
                        </Input>
                        <Input type="textarea" ref="changeReason" label={<span>Explain reason(s) for change:<i>(<strong>required</strong> for selecting different score)</i></span>}
                            value={curratorScore && curratorScore.changeReason ? curratorScore.changeReason : ''}
                            placeholder="Note: If you selected a score different from the default score, you must provide a reason for the change here."
                            rows="3" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                            groupClassName="form-group" />
                    </div>
                : null}
            </div>
        );
    },

    // Create new evidenceScore object based on the form values
    handleEvidenceScoreObj() {
        let newEvidenceScoreObj = {};

        // Put together a new 'evidenceScore' object
        newEvidenceScoreObj = {
            scoreStatus: this.getFormValue('scoreStatus') !== 'none' ? this.getFormValue('scoreStatus') : null,
            variantKind: this.getFormValue('variantKind') !== 'none' ? this.getFormValue('variantKind') : null,
            calculatedScore: evidenceDefaultScore ? evidenceDefaultScore : null,
            score: this.getFormValue('scoreRange') !== 'none' ? parseFloat(this.getFormValue('scoreRange')) : null,
            changeReason: this.getFormValue('changeReason'),
            evidenceType: 'Individual'
        };

        return Object.keys(newEvidenceScoreObj).length ? newEvidenceScoreObj : null;
    }
};
