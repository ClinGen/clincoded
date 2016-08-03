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
        criteriaList: React.PropTypes.array // for test only
    },

    getInitialState: function() {
        return {
            //evaluationObjList: this.props.interpretation && this.props.interpretation.evaluations && this.props.interpretation.evaluations.length ? this.props.interpretation.evaluations : null,
            evaluationObjList: this.props.criteriaList && this.props.criteriaList.length ? this.props.criteriaList : null,
            result: null
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.interpretation && this.props.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
    },

    componentDidMount: function() {
        this.calculate();
    },

    calculate: function() {
        // setup count values
        var MET = 'met';
        var MODIFIED_VALUES = ['very-strong', 'strong', 'moderate', 'spporting', 'stand-alone'];
        var NOT_COUNT_VALUES = ['not-met', 'not-evaluated'];

        var evaluationObjList = this.state.evaluationObjList;
        debugger;

        //var evaluationObjList = this.state.evaluationObjList;
        if (evaluationObjList && evaluationObjList.length) {
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
                // convert criteria evluation value and modified value to lower case
                var criteria = evaluationObj.criteria;
                var criteriaStatus = evaluationObj.criteriaStatus ? evaluationObj.criteriaStatus : null;
                var criteriaModifier = evaluationObj.criteriaModifier ? evaluationObj.criteriaModifier : null;

                if (criteriaStatus === MET) {
                    if (criteria.indexOf('PVS') === 0) {
                        pvs_count += 1;
                    } else if (criteria.indexOf('PS') === 0) {
                        ps_count += 1;
                    } else if (criteria.indexOf('PM') === 0) {
                        pm_count += 1;
                    } else if (criteria.indexOf('PP') === 0) {
                        pp_count += 1;
                    } else if (criteria.indexOf('BA') === 0) {
                        ba_count += 1;
                    } else if (criteria.indexOf('BS') === 0) {
                        bs_count += 1;
                    } else if (criteria.indexOf('BP') === 0) {
                        bp_count += 1;
                    }
                }
            }

            // Calculation Algorithm
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

            if (cases.path_pvs1_ps1 || cases.path_pvs1_pm2 || cases.path_pvs1_pm1_pp1 || cases.path_pvs1_pp2 ||
                cases.path_ps2 || cases.path_ps1_pm3 || cases.path_ps1_pm2_pp2 || cases.path_ps1_pm1_pp4) {
                patho_assertion = 'Pathogenic';
            } else if (cases.likelyPath_pvs1_pm1 || cases.likelyPath_ps1_pm1 || cases.likelyPath_ps1_pp2 ||
                cases.likelyPath_pm3 || cases.likelyPath_pm2_pp2 || cases.likelyPath_pm1_pp4) {
                patho_assertion = 'Likely pathogenic';
            } else if (cases.benign_ba1 || cases.benign_bs2) {
                benign_assertion = 'Benign';
            } else if (cases.likelyBenign_bs1_pp1 || cases.likelyBenign_pp2) {
                benign_assertion = 'Likely benign';
            }

            var assertion = null;
            if ((patho_assertion && contradict) || (benign_assertion && contradict)) {
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

            this.setState({result: result});
        }

        //return result;
    },

    render: function() {
        var result = this.state.result;

        return (
            <div>
                {this.state.interpretation ?
                    <div className="col-lg-12 col-md-12 col-sm-12"  style={{'padding':'0 0 10px 0','float':'left'}}>
                        <div className="col-lg-4 col-md-4 col-sm-4" style={{'border':'solid 1px #5d5'}}>
                            <dt>Benign:</dt>
                            {result.benign_summary && result.benign_summary.length ? result.benign_summary.join(' | ') : 'None' }
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-4" style={{'border':'solid 1px #f00'}}>
                            <dt>Pathogenic:</dt>
                            {result.path_summary && result.path_summary.length ? result.path_summary.join(' | ') : 'None' }
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-4" style={{'border':'solid 1px #aaa'}}>
                            <dt>Calculated Pathogenicity:</dt>
                            {result.assertion ? result.assertion : 'None'}
                        </div>
                    </div>
                    :
                    null
                }
            </div>
        );
    },
});

var calculateAssertion = module.exports.calculateAssertion = function(evaluationObjList) {
    // setup count values as constains
    var MET = 'met';
    var MODIFIED_VALUES = ['very-strong', 'strong', 'moderate', 'spporting', 'stand-alone'];
    var NOT_COUNT_VALUES = ['not-met', 'not-evaluated'];

    var assertion;
    //var evaluationObjList = this.state.evaluationObjList;
    if (evaluationObjList && evaluationObjList.length) {
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
            // convert criteria evluation value and modified value to lower case
            var criteria = evaluationObj.criteria;
            var criteriaStatus = evaluationObj.criteriaStatus ? evaluationObj.criteriaStatus : null;
            var criteriaModifier = evaluationObj.criteriaModifier ? evaluationObj.criteriaModifier : null;

            if (criteriaStatus === MET) {
                if (criteria.indexOf('PVS') === 0) {
                    pvs_count += 1;
                } else if (criteria.indexOf('PS') === 0) {
                    ps_count += 1;
                } else if (criteria.indexOf('PM') === 0) {
                    pm_count += 1;
                } else if (criteria.indexOf('PP') === 0) {
                    pp_count += 1;
                } else if (criteria.indexOf('BA') === 0) {
                    ba_count += 1;
                } else if (criteria.indexOf('BS') === 0) {
                    bs_count += 1;
                } else if (criteria.indexOf('BP') === 0) {
                    bp_count += 1;
                }
            }
        }

        // Calculation Algorithm
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

        if (cases.path_pvs1_ps1 || cases.path_pvs1_pm2 || cases.path_pvs1_pm1_pp1 || cases.path_pvs1_pp2 ||
            cases.path_ps2 || cases.path_ps1_pm3 || cases.path_ps1_pm2_pp2 || cases.path_ps1_pm1_pp4) {
            patho_assertion = 'Pathogenic';
        } else if (cases.likelyPath_pvs1_pm1 || cases.likelyPath_ps1_pm1 || cases.likelyPath_ps1_pp2 ||
            cases.likelyPath_pm3 || cases.likelyPath_pm2_pp2 || cases.likelyPath_pm1_pp4) {
            patho_assertion = 'Likely pathogenic';
        } else if (cases.benign_ba1 || cases.benign_bs2) {
            benign_assertion = 'Benign';
        } else if (cases.likelyBenign_bs1_pp1 || cases.likelyBenign_pp2) {
            benign_assertion = 'Likely benign';
        }

        if ((patho_assertion && contradict) || (benign_assertion && contradict)) {
            assertion = 'Uncertain significance - conflicting evidence';
        } else if (patho_assertion && !contradict) {
            assertion = patho_assertion;
        } else if (benign_assertion && !contradict) {
            assertion = benign_assertion;
        } else {
            assertion = 'Uncertain significance - insufficient evidence';
        }
    } else {
        assertion = '';
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

    return result;
};

// For test pathogenicity calculator only
var pathCalculatorUI = module.exports.pathCalculatorUI = function() {
    return (
        <div>
            <Form>
                <table style={{'width':'100%'}}>
                    <tbody>
                        <tr>
                            <td style={{'verticalAlign':'top','width':'13%'}}>
                                <Input type="checkbox" ref="PVS1" label="PVS1" checked={this.state.PVS1} defaultChecked="false" handleChange={this.handleChange}
                                    labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>

                                    <Input type="checkbox" ref="PS1" label="PS1" checked={this.state.PS1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <be />
                                    <Input type="checkbox" ref="PS2" label="PS2" checked={this.state.PS2} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PS3" label="PS3" checked={this.state.PS3} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <be />
                                    <Input type="checkbox" ref="PS4" label="PS4" checked={this.state.PS4} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="PM1" label="PM1" checked={this.state.PM1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PM2" label="PM2" checked={this.state.PM2} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PM3" label="PM3" checked={this.state.PM3} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PM4" label="PM4" checked={this.state.PM4} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PM5" label="PM5" checked={this.state.PM5} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PM6" label="PM6" checked={this.state.PM6} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="PP1" label="PP1" checked={this.state.PP1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PP2" label="PP2" checked={this.state.PP2} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PP3" label="PP3" checked={this.state.PP3} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PP4" label="PP4" checked={this.state.PP4} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="PP5" label="PP5" checked={this.state.PP5} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td>&nbsp;</td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                <Input type="checkbox" ref="BA1" label="BA1" checked={this.state.BA1} defaultChecked="false" handleChange={this.handleChange}
                                    labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="BS1" label="BS1" checked={this.state.BS1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BS2" label="BS2" checked={this.state.BS2} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BS3" label="BS3" checked={this.state.BS3} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BS4" label="BS4" checked={this.state.BS4} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                            <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="BP1" label="BP1" checked={this.state.BP1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP2" label="BP2" checked={this.state.BP2} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP3" label="BP3" checked={this.state.BP3} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP4" label="BP4" checked={this.state.BP4} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP5" label="BP5" checked={this.state.BP5} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP6" label="BP6" checked={this.state.BP6} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                <br />
                                    <Input type="checkbox" ref="BP7" label="BP7" checked={this.state.BP7} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Form>
        </div>
    );
};
