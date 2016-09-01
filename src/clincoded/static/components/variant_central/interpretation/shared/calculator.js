'use strict';
var React = require('react');
var _ = require('underscore');
var RestMixin = require('../../../rest').RestMixin;
var form = require('../../../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;


var PathogenicityCalculator = module.exports.PathogenicityCalculator = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
    },

    getInitialState: function() {
        return {
            rules: 'ACMG 2015' // Default role for calculation
        };
    },

    render: function() {
        var interpretation = this.props.interpretation;
        var evaluations = interpretation && interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : null;
        var result = evaluations ? calculatePathogenicity(evaluations) : null;
        var rules = this.state.rules;

        return (
            <div>{interpretation ?
                    progressBar(result, rules)
                    :
                    null
                }
            </div>
        );
    },
});

var progressBar = function(result, rules) {
    return (
        <div>
            <div className="progress-bar">
                <div className="benign-box">
                    <dt>Benign:</dt>
                    {result && result.benign_summary && result.benign_summary.length ? result.benign_summary.join(' | ') : 'No criteria met' }
                </div>
                <div className="pathogenic-box">
                    <dt>Pathogenic:</dt>
                    {result && result.path_summary && result.path_summary.length ? result.path_summary.join(' | ') : 'No criteria met' }
                </div>
                <div className="assertion-box">
                    <dt>Calculated Pathogenicity{' (' + rules +')'}:</dt>
                    {result && result.assertion ? result.assertion : 'None'}
                </div>
            </div>
            <br /><br />
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
                result.path_summary.push('Supporting: ' + pp_count.toString());
            }
            if (ba_count > 0) {
                result.benign_summary.push('Stand alone: ' + ba_count.toString());
            }
            if (bs_count > 0) {
                result.benign_summary.push('Strong: ' + bs_count.toString());
            }
            if (bp_count > 0) {
                result.benign_summary.push('Supporting: ' + bp_count.toString());;
            }
        }

        return result;
};

var TestCalculator = module.exports.TestCalculator = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
    },

    getInitialState: function() {
        return {
            // For test pathogenicity calculator only
            //criteriaList: null,
            criteria_evaluated: null,
            PVS1: false,
            PS1: false,
            PS2: false,
            PS3: false,
            PS4: false,
            PM1: false,
            PM2: false,
            PM3: false,
            PM4: false,
            PM5: false,
            PM6: false,
            PP1: false,
            PP2: false,
            PP3: false,
            PP4: false,
            PP5: false,
            BA1: false,
            BS1: false,
            BS2: false,
            BS3: false,
            BS4: false,
            BP1: false,
            BP2: false,
            BP3: false,
            BP4: false,
            BP5: false,
            BP6: false,
            BP7: false,
            // Test above

            rules: 'ACMG 2015' // Default role for calculation
        };
    },

    // Function for test pathogeinicity calculator only, will be removed later.
    handleChange: function(ref, e) {
        var criteria_value = this.refs[ref].getValue();
        if (!this.state.ref || this.state.ref !== criteria_value) {
            var critObj = {};
            critObj[ref] = criteria_value;
            this.setState(critObj);
        }

        var criteria_evaluated = this.state.criteria_evaluated ? this.state.criteria_evaluated : [];
        var criteriaObj = {};
        criteriaObj.criteria = ref;
        if (criteria_value === 'not-met' || criteria_value === 'met') {
            criteriaObj.criteriaStatus = criteria_value;
            criteriaObj.criteriaModifier = '';
        } else {
            criteriaObj.criteriaStatus = 'met';
            criteriaObj.criteriaModifier = criteria_value;
        }

        var criteria_index = -1;
        criteria_evaluated.map((ct, i) => {
            if (ct.criteria === ref) {
                criteria_index = i;
            }
        });
        if (criteria_index > -1 && criteria_value === 'not-evaluated') {
            criteria_evaluated.splice(criteria_index, 1);
        } else if (criteria_index > -1 ) {
            criteria_evaluated[criteria_index] = criteriaObj;
        } else if (criteria_value !== 'not-evaluated') {
            criteria_evaluated.push(criteriaObj);
        }

        this.setState({
            criteria_evaluated: criteria_evaluated
        });
    },

    // Function for testing pathogenic calculator. Will be removed later.
    setDropdown: function(criteria) {
        return (
            <Input type="select" ref={criteria} label={criteria + ':'} defaultValue="not-evaluated" handleChange={this.handleChange} labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-9">
                <option value="not-evaluated">Not Evaluated</option>
                <option disabled="disabled"></option>
                <option value="met">Met</option>
                <option value="not-met">Not Met</option>
                {(criteria.indexOf('PP') === 0 || criteria.indexOf('BP') === 0) ? null : <option value="supporting">Supporting</option>}
                {criteria.indexOf('M') === 1 ? null : (criteria.indexOf('P') === 0 ? <option value="moderate">Moderate</option> : null)}
                {criteria.indexOf('S') === 1 ? null : <option value="strong">Strong</option>}
                {criteria.indexOf('VS') === 1 ? null : (criteria.indexOf('P') === 0 ? <option value="very-strong">Very Strong</option> : null)}
            </Input>
        );
    },

    render: function() {
        var result = calculatePathogenicity(this.state.criteria_evaluated);
        var rules = this.state.rules;

        return (
            <div style={{'marginTop':'30px','paddingTop':'10px','borderTop':'solid 1px #aaa'}}>
                <div>
                    <span style={{'fontSize':'18px'}}><b>Test Pathogenicity Calculator</b></span>
                    <br />
                    <span style={{'paddingLeft':'10px','fontSize':'16px'}}><i>Select option values for any combination of criteria and check result in <b>progress bar below</b>.</i></span>
                </div>
                {progressBar(result, rules)}
                <br />
                <Form>
                    <table style={{'width':'100%', 'marginTop':'20px'}}>
                        <tbody>
                            <tr style={{'backgroundColor':'#f9d8d8'}}>
                                <td style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PVS1')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PS1')}
                                    {this.setDropdown('PS2')}
                                    {this.setDropdown('PS3')}
                                    {this.setDropdown('PS4')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%', 'paddingTop':'20px'}}>
                                    {this.setDropdown('PM1')}
                                    {this.setDropdown('PM2')}
                                    {this.setDropdown('PM3')}
                                    {this.setDropdown('PM4')}
                                    {this.setDropdown('PM5')}
                                    {this.setDropdown('PM6')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PP1')}
                                    {this.setDropdown('PP2')}
                                    {this.setDropdown('PP3')}
                                    {this.setDropdown('PP4')}
                                    {this.setDropdown('PP5')}
                                </td>
                            </tr>
                            <tr style={{'backgroundColor':'#c7e9c7'}}>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BA1')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BS1')}
                                    {this.setDropdown('BS2')}
                                    {this.setDropdown('BS3')}
                                    {this.setDropdown('BS4')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BP1')}
                                    {this.setDropdown('BP2')}
                                    {this.setDropdown('BP3')}
                                    {this.setDropdown('BP4')}
                                    {this.setDropdown('BP5')}
                                    {this.setDropdown('BP6')}
                                    {this.setDropdown('BP7')}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </Form>
            </div>
        );
    }
});

