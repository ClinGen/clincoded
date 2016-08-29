'use strict';
var React = require('react');
var _ = require('underscore');
var RestMixin = require('../../../rest').RestMixin;
var form = require('../../../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;

var panel = require('../../../../libs/bootstrap/panel');
var Panel = panel.Panel;

var PathogenicityCalculator = module.exports.PathogenicityCalculator = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
    },

    getInitialState: function() {
        return {
            rules: 'ACMG 2015' // Currently use ACMG rules only
        };
    },

    render: function() {
        var interpretation = this.props.interpretation;
        var evaluations = interpretation && interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : null;
        var result = evaluations ? calculatePathogenicity(evaluations) : null;
        var rules = this.state.rules;

        return (
            <div>
                {interpretation ?
                    progressBar(result, rules)
                    :
                    null
                }
            </div>
        );
    },
});

var progressBar = function(result, rules) {
    let benign_summary = result && result.benign_summary ? result.benign_summary : null;
    let path_summary = result && result.path_summary ? result.path_summary : null;

    return (
        <div className="container">
            <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12 progress-bar-body">
                <div className="col-lg-4 col-md-12 col-sm-12 col-xs-12 criteria-box">
                    <table>
                        <tbody>
                            <tr>
                                <td rowSpan="2"><i className="icon icon-check-circle benign-label" aria-hidden="true"></i>&nbsp;&nbsp;</td>
                                <td className="title">Benign criteria met:</td>
                            </tr>
                            <tr>
                                <td className="criteria-list">
                                    {benign_summary && Object.keys(benign_summary).length ?
                                        Object.keys(benign_summary).map((criteria, i) => {
                                            return (
                                                <span key={i}>
                                                    {criteria + ': '}
                                                    <span className="badge">{benign_summary[criteria]}</span>
                                                    {i < Object.keys(benign_summary).length - 1 ? <span>&nbsp;&nbsp;&nbsp;</span> : null}
                                                </span>
                                            );
                                        })
                                        :
                                        'No criteria met'
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="col-lg-5 col-md-12 col-sm-12 col-xs-12 criteria-box">
                    <table>
                        <tbody>
                            <tr>
                                <td rowSpan="2"><i className="icon icon-check-circle pathogenic-label" aria-hidden="true"></i>&nbsp;&nbsp;</td>
                                <td className="title">Pathogenic criteria met:</td>
                            </tr>
                            <tr>
                                <td className="criteria-list">
                                    {path_summary && Object.keys(path_summary).length ?
                                        Object.keys(path_summary).map((criteria, i) => {
                                            return (
                                                <span key={i}>
                                                    {criteria + ': '}
                                                    <span className="badge">{path_summary[criteria]}</span>
                                                    {i < Object.keys(path_summary).length - 1 ? <span>&nbsp;&nbsp;&nbsp;</span> : null}
                                                </span>
                                            );
                                        })
                                        :
                                        'No criteria met'
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="col-lg-3 col-md-12 col-sm-12 col-xs-12 criteria-box">
                    <table>
                        <tbody>
                            <tr>
                                <td rowSpan="2"><i className="icon icon-calculator" aria-hidden="true"></i>&nbsp;&nbsp;</td>
                                <td className="title">Calculated Pathogenicity:</td>
                            </tr>
                            <tr>
                                <td className="criteria-list">{result && result.assertion ? result.assertion : 'None'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Function to calculate pathogenicity
var calculatePathogenicity = function(evaluationObjList) {
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

        var contradict = ((pvs_count > 0 || ps_count > 0 || pm_count > 0 || pp_count > 0) && (ba_count > 0 || bs_count > 0 || bp_count > 0)) ? true : false;
        var patho_assertion = null;
        var benign_assertion = null;

        // Algorithm, ACMG Standarts & Guidelines 2015
        // setup cases for 4 types of assertions (Pathogenic, Likely pathogenic, Benign and Likely benign)
        var cases = {
            path_pvs2: pvs_count >= 2 ? true : false,
            path_pvs1_ps1: (pvs_count === 1 && ps_count >= 1) ? true : false,
            path_pvs1_pm2: (pvs_count === 1 && pm_count >= 2) ? true : false,
            path_pvs1_pm1_pp1: (pvs_count === 1 && pm_count == 1 && pp_count == 1) ? true : false,
            path_pvs1_pp2: (pvs_count === 1 && pp_count >= 2) ? true : false,
            path_ps2: ps_count >= 2 ? true : false,
            path_ps1_pm3: (ps_count === 1 && pm_count >= 3) ? true : false,
            path_ps1_pm2_pp2: (ps_count === 1 && pm_count === 2 && pp_count >= 2) ? true : false,
            path_ps1_pm1_pp4: (ps_count === 1 && pm_count === 1 && pp_count >= 4) ? true : false,

            likelyPath_pvs1_pm1: (pvs_count === 1 && pm_count === 1) ? true : false,
            likelyPath_ps1_pm1: (ps_count === 1 && (pm_count === 1 || pm_count === 2)) ? true : false,
            likelyPath_ps1_pp2: (ps_count === 1 && pp_count >= 2) ? true : false,
            likelyPath_pm3: pm_count >= 3 ? true : false,
            likelyPath_pm2_pp2: (pm_count === 2 && pp_count >= 2) ? true : false,
            likelyPath_pm1_pp4: (pm_count === 1 && pp_count >= 4) ? true : false,

            benign_ba1: ba_count >= 1 ? true : false,
            benign_bs2: bs_count >= 2 ? true : false,

            likelyBenign_bs1_pp1: (bs_count === 1 && bp_count === 1) ? true : false,
            likelyBenign_pp2: (bp_count >= 2) ? true : false,
        };

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
            path_summary: {},
            benign_summary: {}
        };
        if (pvs_count > 0) {
            result.path_summary['Very strong'] = pvs_count;
        }
        if (ps_count > 0) {
            result.path_summary['Strong'] = ps_count;
        }
        if (pm_count > 0) {
            result.path_summary['Moderate'] = pm_count;
        }
        if (pp_count > 0) {
            result.path_summary['Supporting'] = pp_count;
        }
        if (ba_count > 0) {
            result.benign_summary['Stand alone'] = ba_count;
        }
        if (bs_count > 0) {
            result.benign_summary['Strong'] = bs_count;
        }
        if (bp_count > 0) {
            result.benign_summary['Supporting'] = bp_count;
        }
    }

    return result;
};
