'use strict';
var React = require('react');
var _ = require('underscore');
var RestMixin = require('../../../rest').RestMixin;
var form = require('../../../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;

//module.exports.pathogenicityCalculator = function(evaluationObjList) {
var PathogenicityCalculator = module.exports.PathogenicityCalculator = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
        //criteriaList: React.PropTypes.array // for test only
    },

    calculate: function(evaluationObjList) {
        // setup count values
        var MET = 'met';
        var NOT_MET = 'not-met';
        var NOT_EVALUATED = 'not-evaluated';
        var MODIFIER_VS = 'very-strong';
        var MODIFIER_S = 'strong';
        var MODIFIER_M = 'moderate';
        var MODIFIER_P = 'supporting';
        var MODIFIER_SA = 'stand-alone';

        if (evaluationObjList && evaluationObjList.length) {
            var evaluated = false;

            // Initialize count numbers
            var pvs_count = 0;
            var ps_count = 0;
            var pm_count = 0;
            var pp_count = 0;
            var ba_count = 0;
            var bs_count = 0;
            var bp_count = 0;

            // count each criteria level (PVS, PS, PM, PP, BA, BS, BP)
            for (var evaluationObj of evaluationObjList) {
                // In each evaluation object, criteria and criteriaStatus must exist, criteriaModifier may or may not
                var criteria = evaluationObj.criteria;
                var criteriaStatus = evaluationObj.criteriaStatus;

                // count met criteria only, modified by criteriaModifier
                if (criteriaStatus === MET) {
                    evaluated = true;

                    var criteriaModifier = evaluationObj.criteriaModifier;
                    if ((criteria.indexOf('PVS') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_VS)) {
                        pvs_count += 1;
                    } else if ((criteria.indexOf('PS') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_S)) {
                        ps_count += 1;
                    } else if ((criteria.indexOf('PM') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_M)) {
                        pm_count += 1;
                    } else if ((criteria.indexOf('PP') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_P)) {
                        pp_count += 1;
                    } else if ((criteria.indexOf('BA') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier === MODIFIER_SA)) {
                        ba_count += 1;
                    } else if ((criteria.indexOf('BS') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier === MODIFIER_S)) {
                        bs_count += 1;
                    } else if ((criteria.indexOf('BP') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier=== MODIFIER_P)) {
                        bp_count += 1;
                    }
                } else if (criteriaStatus === NOT_MET) {
                    evaluated = true;
                }
            }

            // Algorithm, ACMG Standarts & Guidelines 2015
            var contradict = ((pvs_count > 0 || ps_count > 0 || pm_count > 0 || pp_count > 0) && (ba_count > 0 || bs_count > 0 || bp_count > 0)) ? true : false;
            var patho_assertion = null;
            var benign_assertion = null;

            // setup cases for 4 types of assertions (Pathogenic, Likely pathogenic, Benign and Likely benign)
            var cases = {
                path_pvs1_ps1: (pvs_count === 1 && ps_count >= 1) ? true : false,
                path_pvs1_pm2: (pvs_count === 1 && pm_count >= 2) ? true : false,
                path_pvs1_pm1_pp1: (pvs_count === 1 && pm_count == 1 && pp_count == 1) ? true : false,
                path_pvs1_pp2: (pvs_count === 1 && pp_count >= 2) ? true : false,
                path_ps2: ps_count >= 2 ? true : false,
                path_ps1_pm3: (ps_count === 1 && pm_count >= 3) ? true : false,
                path_ps1_pm2_pp2: (ps_count === 1 && pm_count === 2 && pp_count === 2) ? true : false,
                path_ps1_pm1_pp4: (pvs_count === 1 && pm_count === 1 && pp_count >= 4) ? true : false,

                likelyPath_pvs1_pm1: (pvs_count === 1 && pm_count === 1) ? true : false,
                likelyPath_ps1_pm1: (ps_count === 1 && (pm_count === 1 || pm_count === 2)) ? true : false,
                likelyPath_ps1_pp2: (ps_count === 1 && pp_count >= 3) ? true : false,
                likelyPath_pm3: pm_count >= 3 ? true : false,
                likelyPath_pm2_pp2: (pm_count === 2 && pp_count >= 3) ? true : false,
                likelyPath_pm1_pp4: (pm_count === 1 && pp_count >= 4) ? true : false,

                benign_ba1: ba_count === 1 ? true : false,
                benign_bs2: bs_count >= 2 ? true : false,

                likelyBenign_bs1_pp1: (bs_count === 1 && bp_count === 1) ? true : false,
                likelyBenign_pp2: (bp_count >= 2) ? true : false,
            }

            for (var cs of Object.keys(cases)) {
                if (cases[cs]) {
                    if (cs.indexOf('path_') !== -1) {
                        patho_assertion = 'Pathogenic';
                    } else if (cs.indexOf('likelyPath_') === 0 && !patho_assertion) {
                        patho_assertion = 'Likely pathogenic';
                    }

                    if (cs.indexOf('benign_') !== -1) {
                        benign_assertion = 'Benign';
                    } else if (cs.indexOf('likelyBenign_') === 0 && !benign_assertion) {
                        benign_assertion = 'Likely benign';
                    }
                }
            }

            var assertion = null;
            if (!evaluated) {
                assertion = '';
            } else if ((patho_assertion && contradict) || (benign_assertion && contradict)) {
                assertion = 'Uncertain significance - conflicting evidence';
            } else if (patho_assertion && !contradict) {
                assertion = patho_assertion;
            } else if (benign_assertion && !contradict) {
                assertion = benign_assertion;
            } else {
                assertion = 'Uncertain significance - insufficient evidence';
            }

            var result = {
                assertion: assertion,
                path_summary: [],
                benign_summary: []
            };
            if (pvs_count > 0) {
                result.path_summary.push('Very strong: ' + pvs_count.toString());
            }
            if (ps_count > 0) {
                result.path_summary.push('Strong: ' + ps_count.toString());
            }
            if (pm_count > 0) {
                result.path_summary.push('Moderate: ' + pm_count.toString());
            }
            if (pp_count > 0) {
                result.path_summary.push('Spporting: ' + pp_count.toString());
            }
            if (ba_count > 0) {
                result.benign_summary.push('Stand alone: ' + ba_count.toString());
            }
            if (bs_count > 0) {
                result.benign_summary.push('Strong: ' + bs_count.toString());
            }
            if (bp_count > 0) {
                result.benign_summary.push('Spporting: ' + bp_count.toString());;
            }

            //this.setState({result: result});
        }

        return result;
    },

    render: function() {
        var interpretation = this.props.interpretation;
        var evaluations = interpretation && interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : null;
        var result = evaluations ? this.calculate(evaluations) : null;
        //var result = this.state.result;

        return (
            <div>
                {interpretation ?
                    <div className="col-lg-12 col-md-12 col-sm-12 progress-bar">
                        <div className="col-lg-4 col-md-4 col-sm-4 benign-box">
                            <dt>Benign:</dt>
                            {result && result.benign_summary && result.benign_summary.length ? result.benign_summary.join(' | ') : 'No criteria met' }
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-4 pathogenic-box">
                            <dt>Pathogenic:</dt>
                            {result && result.path_summary && result.path_summary.length ? result.path_summary.join(' | ') : 'No criteria met' }
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-4 assertion-box">
                            <dt>Calculated Pathogenicity:</dt>
                            {result && result.assertion ? result.assertion : 'None'}
                        </div>
                    </div>
                    :
                    null
                }
            </div>
        );
    },
});

var testCalculator = module.exports.testCalculator = function(evaluationObjList) {
        // setup count values
        var MET = 'met';
        var NOT_MET = 'not-met';
        var NOT_EVALUATED = 'not-evaluated';
        var MODIFIER_VS = 'very-strong';
        var MODIFIER_S = 'strong';
        var MODIFIER_M = 'moderate';
        var MODIFIER_P = 'supporting';
        var MODIFIER_SA = 'stand-alone';

        if (evaluationObjList && evaluationObjList.length) {
            var evaluated = false;

            // Initialize count numbers
            var pvs_count = 0;
            var ps_count = 0;
            var pm_count = 0;
            var pp_count = 0;
            var ba_count = 0;
            var bs_count = 0;
            var bp_count = 0;

            // count each criteria level (PVS, PS, PM, PP, BA, BS, BP)
            for (var evaluationObj of evaluationObjList) {
                // In each evaluation object, criteria and criteriaStatus must exist, criteriaModifier may or may not
                var criteria = evaluationObj.criteria;
                var criteriaStatus = evaluationObj.criteriaStatus;

                // count met criteria only, modified by criteriaModifier
                if (criteriaStatus === MET) {
                    evaluated = true;

                    var criteriaModifier = evaluationObj.criteriaModifier;
                    if ((criteria.indexOf('PVS') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_VS)) {
                        pvs_count += 1;
                    } else if ((criteria.indexOf('PS') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_S)) {
                        ps_count += 1;
                    } else if ((criteria.indexOf('PM') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_M)) {
                        pm_count += 1;
                    } else if ((criteria.indexOf('PP') === 0 && criteriaModifier === '') || (criteria.indexOf('P') === 0 && criteriaModifier === MODIFIER_P)) {
                        pp_count += 1;
                    } else if ((criteria.indexOf('BA') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier === MODIFIER_SA)) {
                        ba_count += 1;
                    } else if ((criteria.indexOf('BS') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier === MODIFIER_S)) {
                        bs_count += 1;
                    } else if ((criteria.indexOf('BP') === 0 && criteriaModifier === '') || (criteria.indexOf('B') === 0 && criteriaModifier=== MODIFIER_P)) {
                        bp_count += 1;
                    }
                } else if (criteriaStatus === NOT_MET) {
                    evaluated = true;
                }
            }

            // Algorithm, ACMG Standarts & Guidelines 2015
            var contradict = ((pvs_count > 0 || ps_count > 0 || pm_count > 0 || pp_count > 0) && (ba_count > 0 || bs_count > 0 || bp_count > 0)) ? true : false;
            var patho_assertion = null;
            var benign_assertion = null;

            // setup cases for 4 types of assertions (Pathogenic, Likely pathogenic, Benign and Likely benign)
            var cases = {
                path_pvs1_ps1: (pvs_count === 1 && ps_count >= 1) ? true : false,
                path_pvs1_pm2: (pvs_count === 1 && pm_count >= 2) ? true : false,
                path_pvs1_pm1_pp1: (pvs_count === 1 && pm_count == 1 && pp_count == 1) ? true : false,
                path_pvs1_pp2: (pvs_count === 1 && pp_count >= 2) ? true : false,
                path_ps2: ps_count >= 2 ? true : false,
                path_ps1_pm3: (ps_count === 1 && pm_count >= 3) ? true : false,
                path_ps1_pm2_pp2: (ps_count === 1 && pm_count === 2 && pp_count === 2) ? true : false,
                path_ps1_pm1_pp4: (pvs_count === 1 && pm_count === 1 && pp_count >= 4) ? true : false,

                likelyPath_pvs1_pm1: (pvs_count === 1 && pm_count === 1) ? true : false,
                likelyPath_ps1_pm1: (ps_count === 1 && (pm_count === 1 || pm_count === 2)) ? true : false,
                likelyPath_ps1_pp2: (ps_count === 1 && pp_count >= 3) ? true : false,
                likelyPath_pm3: pm_count >= 3 ? true : false,
                likelyPath_pm2_pp2: (pm_count === 2 && pp_count >= 3) ? true : false,
                likelyPath_pm1_pp4: (pm_count === 1 && pp_count >= 4) ? true : false,

                benign_ba1: ba_count === 1 ? true : false,
                benign_bs2: bs_count >= 2 ? true : false,

                likelyBenign_bs1_pp1: (bs_count === 1 && bp_count === 1) ? true : false,
                likelyBenign_pp2: (bp_count >= 2) ? true : false,
            }

            for (var cs of Object.keys(cases)) {
                if (cases[cs]) {
                    if (cs.indexOf('path_') !== -1) {
                        patho_assertion = 'Pathogenic';
                    } else if (cs.indexOf('likelyPath_') === 0 && !patho_assertion) {
                        patho_assertion = 'Likely pathogenic';
                    }

                    if (cs.indexOf('benign_') !== -1) {
                        benign_assertion = 'Benign';
                    } else if (cs.indexOf('likelyBenign_') === 0 && !benign_assertion) {
                        benign_assertion = 'Likely benign';
                    }
                }
            }

            var assertion = null;
            if (!evaluated) {
                assertion = '';
            } else if ((patho_assertion && contradict) || (benign_assertion && contradict)) {
                assertion = 'Uncertain significance - conflicting evidence';
            } else if (patho_assertion && !contradict) {
                assertion = patho_assertion;
            } else if (benign_assertion && !contradict) {
                assertion = benign_assertion;
            } else {
                assertion = 'Uncertain significance - insufficient evidence';
            }

            var result = {
                assertion: assertion,
                path_summary: [],
                benign_summary: []
            };
            if (pvs_count > 0) {
                result.path_summary.push('Very strong: ' + pvs_count.toString());
            }
            if (ps_count > 0) {
                result.path_summary.push('Strong: ' + ps_count.toString());
            }
            if (pm_count > 0) {
                result.path_summary.push('Moderate: ' + pm_count.toString());
            }
            if (pp_count > 0) {
                result.path_summary.push('Spporting: ' + pp_count.toString());
            }
            if (ba_count > 0) {
                result.benign_summary.push('Stand alone: ' + ba_count.toString());
            }
            if (bs_count > 0) {
                result.benign_summary.push('Strong: ' + bs_count.toString());
            }
            if (bp_count > 0) {
                result.benign_summary.push('Spporting: ' + bp_count.toString());;
            }

            //this.setState({result: result});
        }

        return result;
};
