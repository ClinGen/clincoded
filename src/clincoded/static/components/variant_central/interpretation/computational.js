'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;

var form = require('../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the curator data of the curation data
var CurationInterpretationComputational = module.exports.CurationInterpretationComputational = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
    },

    render: function() {
        return (
            <div className="variant-interpretation computational">
                {(this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Functional, Conservation, and Splicing Predictors"} renderedFormContent={criteriaGroup1}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true} formChangeHandler={criteriaGroup1Change}
                            formDataUpdater={criteriaGroup1Update} variantUuid={this.props.data['@id']} criteria={['BP4', 'PP3', 'BP7']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Alternate Changes in Codon"} renderedFormContent={criteriaGroup2}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true}
                            formDataUpdater={criteriaGroup2Update} variantUuid={this.props.data['@id']} criteriaDisease={['PM5', 'PS1']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Missense Variant"} renderedFormContent={criteriaGroup3}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true} formChangeHandler={criteriaGroup3Change}
                            formDataUpdater={criteriaGroup3Update} variantUuid={this.props.data['@id']} criteriaDisease={['BP1', 'PP2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Repetetive Regions"} renderedFormContent={criteriaGroup4}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true}
                            formDataUpdater={criteriaGroup4Update} variantUuid={this.props.data['@id']} criteria={['BP3', 'PM4']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
                : null}

                <ul className="section-calculator clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <h4>Pathogenicity Calculator</h4>
                            <div>Calculator placeholder</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});

// FIXME: all functions below here are examples; references to these in above render() should also be removed
var comp_crit_1 = function() {
    return (
        <div>
            <Input type="checkbox" ref="xbox1-value" label="Predictors Demo Criteria 1?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox1-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="checkbox" ref="xbox2-value" label="Predictors Demo Criteria 2?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox2-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

var comp_crit_1_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                if (evaluation.criteria == 'xbox1') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox1-value'] = evaluation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
                }
                if (evaluation.criteria == 'xbox2') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox2-value'] = evaluation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
                }
            });
        }
    }
};

var pop_crit_2 = function() {
    return (
        <div>
            <Input type="select" ref="ps4-value" label="Population Demo Criteria 2?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
            <Input type="text" ref="ps4-description" label="Population Demo Criteria 2 Description:" rows="5" placeholder="e.g. free text" inputDisabled={true}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="ps5-value" label="Population Demo Criteria 3?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
        </div>
    );
};

var pop_crit_2_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                switch(evaluation.criteria) {
                    case 'ps4':
                        this.refs['ps4-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                    case 'ps5':
                        this.refs['ps5-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                }
            });
        }
    }
    if (nextProps.extraData) {
        this.refs['ps4-description'].setValue(nextProps.extraData.test2);
    }
};

// code for rendering of computational tab interpretation forms, first group:
// functional, conservation, and splicing predictors
var criteriaGroup1 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP4:</strong> Multiple lines of computational evidence suggest no impact on gene or gene product (conservation, evolutionary, splicing impact, etc.)

                    <br /><br />
                    <strong>PP3:</strong> Multiple lines of computational evidence support a deleterious effect on the gene or gene product (conservation, evolutionary, splicing impact, etc.)
                </p>
            </div>
            <Input type="checkbox" ref="BP4-value" label="BP4 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP4-value'] ? this.state.checkboxes['BP4-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-8 col-sm-offset-4 input-note-below-no-bottom">- or -</p>
            <Input type="checkbox" ref="PP3-value" label="PP3 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PP3-value'] ? this.state.checkboxes['PP3-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP4-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <Input type="textarea" ref="PP3-description" label="Explain criteria selection (PP3):" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP7:</strong> A synonymous (silent) variant for which splicing prediction algorithms predict no impact to the splice site consensus sequence nor the creation of a new splice site AND the nucleotide is not highly conserved
                </p>
            </div>
            <Input type="checkbox" ref="BP7-value" label={<span>BP7 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP7-value'] ? this.state.checkboxes['BP7-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP7-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP4':
                        tempCheckboxes['BP4-value'] = evaluation.value === 'true';
                        this.refs['BP4-description'].setValue(evaluation.description);
                        break;
                    case 'PP3':
                        tempCheckboxes['PP3-value'] = evaluation.value === 'true';
                        this.refs['PP3-description'].setValue(evaluation.description);
                        break;
                    case 'BP7':
                        tempCheckboxes['BP7-value'] = evaluation.value === 'true';
                        this.refs['BP7-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for handling logic within the form
var criteriaGroup1Change = function(ref, e) {
    // BP4 and PP3 are exclusive. The following is to ensure that if one of the checkboxes
    // are checked, the other is un-checked
    if (ref === 'BP4-value' || ref === 'PP3-value') {
        let tempCheckboxes = this.state.checkboxes,
            altCriteriaValue = 'PP3-value';
        if (ref === 'PP3-value') {
            altCriteriaValue = 'BP4-value';
        }
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteriaValue] = false;
            this.setState({checkboxes: tempCheckboxes});
        }
    }
    // Since BP4 and PP3 'share' the same description box, and the user only sees the BP4 box,
    // the following is to update the value in the PP3 box to contain the same data on
    // saving of the evaluation. Handles changes going the other way, too, just in case (although
    // this should never happen)
    if (ref === 'BP4-description' || ref === 'PP3-description') {
        let altCriteriaDescription = 'PP3-description';
        if (ref === 'PP3-description') {
            altCriteriaDescription = 'BP4-description';
        }
        this.refs[altCriteriaDescription].setValue(this.refs[ref].getValue());
    }
};

// code for rendering of computational tab interpretation forms, second group:
// alternate changes in codon
var criteriaGroup2 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PM5:</strong> Novel missense change at an amino acid residue where a different missense change determined to be pathogenic has not been seen before
                </p>
            </div>
            <Input type="checkbox" ref="PM5-value" label={<span>PM5 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PM5-value'] ? this.state.checkboxes['PM5-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PM5-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PS1:</strong> Same amino acid change as a previously established pathogenic variant regardless of nucleotide change
                </p>
            </div>
            <Input type="checkbox" ref="PS1-value" label={<span>PS1 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PS1-value'] ? this.state.checkboxes['PS1-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PS1-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup2Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'PM5':
                        tempCheckboxes['PM5-value'] = evaluation.value === 'true';
                        this.refs['PM5-description'].setValue(evaluation.description);
                        break;
                    case 'PS1':
                        tempCheckboxes['PS1-value'] = evaluation.value === 'true';
                        this.refs['PS1-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for rendering of computational tab interpretation forms, third group:
// missense variants
var criteriaGroup3 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP1:</strong> Missense variant in a gene for which primarily truncating variants are known to cause disease

                    <br /><br />
                    <strong>PP2:</strong> Missense variant in a gene that has a low rate of benign missense variation and in which missense variants are a common mechanism of disease
                </p>
            </div>
            <Input type="checkbox" ref="BP1-value" label="BP1 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP1-value'] ? this.state.checkboxes['BP1-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-8 col-sm-offset-4 input-note-below-no-bottom">- or -</p>
            <Input type="checkbox" ref="PP2-value" label="PP2 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PP2-value'] ? this.state.checkboxes['PP2-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP1-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <Input type="textarea" ref="PP2-description" label="Explain criteria selection (PP2):" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup3Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP1':
                        tempCheckboxes['BP1-value'] = evaluation.value === 'true';
                        this.refs['BP1-description'].setValue(evaluation.description);
                        break;
                    case 'PP2':
                        tempCheckboxes['PP2-value'] = evaluation.value === 'true';
                        this.refs['PP2-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for handling logic within the form
var criteriaGroup3Change = function(ref, e) {
    // BP1 and PP2 are exclusive. The following is to ensure that if one of the checkboxes
    // are checked, the other is un-checked
    if (ref === 'BP1-value' || ref === 'PP2-value') {
        let tempCheckboxes = this.state.checkboxes,
            altCriteriaValue = 'PP2-value';
        if (ref === 'PP2-value') {
            altCriteriaValue = 'BP1-value';
        }
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteriaValue] = false;
            this.setState({checkboxes: tempCheckboxes});
        }
    }
    // Since BP1 and PP2 'share' the same description box, and the user only sees the BP4 box,
    // the following is to update the value in the PP2 box to contain the same data on
    // saving of the evaluation. Handles changes going the other way, too, just in case (although
    // this should never happen)
    if (ref === 'BP1-description' || ref === 'PP2-description') {
        let altCriteriaDescription = 'PP2-description';
        if (ref === 'PP2-description') {
            altCriteriaDescription = 'BP1-description';
        }
        this.refs[altCriteriaDescription].setValue(this.refs[ref].getValue());
    }
};

// code for rendering of computational tab interpretation forms, third group:
// repetetive regions
var criteriaGroup4 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP3:</strong> In-frame deletions/insertions in a repetitive region without a known function
                </p>
            </div>
            <Input type="checkbox" ref="BP3-value" label={<span>BP3 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP3-value'] ? this.state.checkboxes['BP3-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP3-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PM4:</strong> Protein length changes as a result of in-frame deletions/insertions in a nonrepeat region or stop-loss variant
                </p>
            </div>
            <Input type="checkbox" ref="PM4-value" label={<span>PM4 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PM4-value'] ? this.state.checkboxes['PM4-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PM4-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup4Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP3':
                        tempCheckboxes['BP3-value'] = evaluation.value === 'true';
                        this.refs['BP3-description'].setValue(evaluation.description);
                        break;
                    case 'PM4':
                        tempCheckboxes['PM4-value'] = evaluation.value === 'true';
                        this.refs['PM4-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};
