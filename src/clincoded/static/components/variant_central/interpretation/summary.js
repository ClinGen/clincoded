'use strict';
import React, {PropTypes} from 'react';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { RestMixin } from '../../rest';
import * as curator from '../../curator';
import * as evidenceCodes from './mapping/evidence_code.json';

var EvaluationSummary = module.exports.EvaluationSummary = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        setProvisionalEvaluation: React.PropTypes.func,
        calculatedAssertion: React.PropTypes.string,
        provisionalPathogenicity: React.PropTypes.string,
        provisionalReason: React.PropTypes.string,
        provisionalInterpretation: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            calculatedAssertion: this.props.calculatedAssertion,
            autoClassification: null,
            modifiedPathogenicity: null,
            provisionalPathogenicity: this.props.provisionalPathogenicity,
            provisionalReason: this.props.provisionalReason,
            provisionalInterpretation: this.props.provisionalInterpretation,
            disabledCheckbox: false,
            disabledFormSumbit: false,
            submitBusy: false, // spinner for Save button
            updateMsg: null // status message for Save/Update button
        };
    },

    componentDidMount: function() {
        if (this.props.interpretation && this.props.calculatedAssertion) {
            this.handleProvisionalCheckBox(this.state.provisionalPathogenicity);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.calculatedAssertion) {
            this.setState({calculatedAssertion: nextProps.calculatedAssertion});
        }
        if (nextProps.provisionalPathogenicity) {
            this.setState({provisionalPathogenicity: nextProps.provisionalPathogenicity});
        }
        if (nextProps.provisionalReason) {
            this.setState({provisionalReason: nextProps.provisionalReason});
        }
        this.setState({
            provisionalInterpretation: nextProps.provisionalInterpretation
        });
    },

    // Method to construct mode of inheritance linkout
    renderModeInheritanceLink: function(modeInheritance) {
        if (modeInheritance) {
            let start = modeInheritance.indexOf('(');
            var end = modeInheritance.indexOf(')');
            if (start && end) {
                let hpoNumber = modeInheritance.substring(start+1, end);
                if (hpoNumber && hpoNumber.indexOf('HP:') > -1) {
                    let hpoLink = 'http://compbio.charite.de/hpoweb/showterm?id=' + hpoNumber;
                    return (
                        <a href={hpoLink} target="_blank">{modeInheritance}</a>
                    );
                }
            }
        }
    },

    // Method to set provisional checkbox state given the modified or calculated pathogenicity
    handleProvisionalCheckBox: function(pathogenicity) {
        if (!this.props.interpretation.disease) {
            let assertion = this.props.calculatedAssertion;
            if (assertion === 'Likely pathogenic' || assertion === 'Pathogenic') {
                if(pathogenicity === 'Benign' ||
                   pathogenicity === 'Likely benign' ||
                   pathogenicity === 'Uncertain significance') {
                    this.setState({disabledCheckbox: false});
                } else {
                    this.props.setProvisionalEvaluation('provisional-interpretation', false);
                    this.setState({disabledCheckbox: true});
                }
            } else {
                if(pathogenicity === 'Likely pathogenic' ||
                   pathogenicity === 'Pathogenic') {
                    this.props.setProvisionalEvaluation('provisional-interpretation', false);
                    this.setState({disabledCheckbox: true});
                } else {
                    this.setState({disabledCheckbox: false});
                }
            }
        } else {
            this.setState({disabledCheckbox: false});
        }
    },

    // Method to alert users about requied input missing values
    handleRequiredInput: function(action) {
        const inputElement = document.querySelector('.provisional-pathogenicity textarea');
        if (action === 'setAttribute') {
            if (!inputElement.getAttribute('required')) {
                inputElement.setAttribute('required', 'required');
            }
        }
        if (action === 'removeAttribute') {
            inputElement.removeAttribute('required');
        }
    },

    // Handle value changes in provisional form
    handleChange: function(ref, e) {
        // Handle modified pathogenicity dropdown
        if (ref === 'provisional-pathogenicity') {
            if (this.refs[ref].getValue()) {
                this.setState({provisionalPathogenicity: this.refs[ref].getValue()}, () => {
                    // Pass dropdown state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-pathogenicity', this.state.provisionalPathogenicity);
                    // Disable save button if a reason is not provided for the modification
                    if (!this.state.provisionalReason) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                    // If no disease is associated, we disable provisional checkbox
                    // when modified pathogenicity is either 'Likely pathogenic' or 'Pathogenic'
                    this.handleProvisionalCheckBox(this.state.provisionalPathogenicity);
                });
            } else {
                this.setState({provisionalPathogenicity: null}, () => {
                    // Pass null dropdown state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-pathogenicity', this.state.provisionalPathogenicity);
                    // Disable save button if a reason is provided without the modification
                    if (this.state.provisionalReason) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                    // If no disease is associated, we disable provisional checkbox
                    // when modified pathogenicity is either 'Likely pathogenic' or 'Pathogenic'
                    this.handleProvisionalCheckBox(this.state.provisionalPathogenicity);
                });
            }
        }
        // Handle reason/explanation for pathogenicity modification/change
        if (ref === 'provisional-reason') {
            if (this.refs[ref].getValue()) {
                this.setState({provisionalReason: this.refs[ref].getValue()}, () => {
                    // Pass textarea state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-reason', this.state.provisionalReason);
                    // Disable save button if a modification is not provided for the reason
                    if (!this.state.provisionalPathogenicity) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                });
            } else {
                this.setState({provisionalReason: null}, () => {
                    // Pass null textarea state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-reason', this.state.provisionalReason);
                    // Disable save button if a modification is provided without the reason
                    if (this.state.provisionalPathogenicity) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                });
            }
        }
        // Handle provisional interpretation checkbox
        if (ref === 'provisional-interpretation' && this.refs[ref]) {
            this.setState({provisionalInterpretation: !this.state.provisionalInterpretation}, () => {
                // Pass checkbox state change back to parent component
                this.props.setProvisionalEvaluation('provisional-interpretation', this.state.provisionalInterpretation);
            });
        }
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({submitBusy: true, updateMsg: null});

        const interpretation = this.state.interpretation;
        const provisionalInterpretation = this.state.provisionalInterpretation;

        if (interpretation) {
            // Flattened interpretation object
            let flatInterpretationObj = curator.flatten(interpretation);
            // Set 'markAsProvisional' property value in the flatten interpretation object
            flatInterpretationObj.markAsProvisional = provisionalInterpretation;
            if (!interpretation.provisional_variant || interpretation.provisional_variant.length < 1) {
                // Configure 'provisional-variant' object properties
                // Use case #1: user makes pathogenicity modification and marks the interpretation provisional
                // Use case #2: user marks the interpretation provisional without any modification
                let provisionalObj;
                if (this.state.provisionalPathogenicity) {
                    provisionalObj = {
                        'autoClassification': this.state.calculatedAssertion,
                        'alteredClassification': this.state.provisionalPathogenicity,
                        'reason': this.state.provisionalReason
                    };
                } else {
                    provisionalObj = {'autoClassification': this.state.calculatedAssertion};
                }

                this.postRestData('/provisional-variant/', provisionalObj).then(result => {
                    this.setState({submitBusy: false, updateMsg: <span className="text-success">Provisional changes saved successfully!</span>});
                    this.setState({
                        autoClassification: result['@graph'][0]['autoClassification'],
                        modifiedPathogenicity: result['@graph'][0]['alteredClassification']
                    });
                    let provisionalObjUuid = result['@graph'][0]['@id'];
                    if (!('provisional_variant' in flatInterpretationObj)) {
                        flatInterpretationObj.provisional_variant = [provisionalObjUuid];
                        // Return the newly flattened interpretation object in a Promise
                        return Promise.resolve(flatInterpretationObj);
                    } else {
                        flatInterpretationObj.provisional_variant.push(provisionalObjUuid);
                        return Promise.resolve(flatInterpretationObj);
                    }
                }).then(interpretationObj => {
                    this.putRestData('/interpretation/' + interpretation.uuid, interpretationObj).then(data => {
                        this.props.updateInterpretationObj();
                    }).catch(err => {
                        console.log(err);
                    });
                }).catch(err => {
                    this.setState({submitBusy: false, updateMsg: <span className="text-danger">Unable to save provisional changes.</span>});
                    console.log(err);
                });
            } else {
                this.getRestData('/provisional-variant/' + interpretation.provisional_variant[0].uuid).then(provisionalVariantObj => {
                    // Get up-to-date copy of provisional-variant object and flatten it
                    let flatProvisionalVariantObj = curator.flatten(provisionalVariantObj);
                    // Configure 'provisional-variant' object properties
                    // Use case #1: user updates pathogenicity modification and marks the interpretation provisional
                    // Use case #2: user removes pre-existing modification and updates the form
                    if (this.state.provisionalPathogenicity) {
                        flatProvisionalVariantObj['autoClassification'] = this.state.calculatedAssertion;
                        flatProvisionalVariantObj['alteredClassification'] = this.state.provisionalPathogenicity;
                        flatProvisionalVariantObj['reason'] = this.state.provisionalReason;
                        return Promise.resolve(flatProvisionalVariantObj);
                    } else {
                        if ('alteredClassification' in flatProvisionalVariantObj) {
                            delete flatProvisionalVariantObj['alteredClassification'];
                        }
                        if ('reason' in flatProvisionalVariantObj) {
                            delete flatProvisionalVariantObj['reason'];
                        }
                        flatProvisionalVariantObj['autoClassification'] = this.state.calculatedAssertion;
                        return Promise.resolve(flatProvisionalVariantObj);
                    }
                }).then(newProvisionalVariantObj => {
                    this.putRestData('/provisional-variant/' + interpretation.provisional_variant[0].uuid, newProvisionalVariantObj).then(response => {
                        this.setState({submitBusy: false, updateMsg: <span className="text-success">Provisional changes updated successfully!</span>});
                        this.setState({
                            autoClassification: response['@graph'][0]['autoClassification'],
                            modifiedPathogenicity: response['@graph'][0]['alteredClassification']
                        });
                        this.props.updateInterpretationObj();
                    }).catch(err => {
                        this.setState({submitBusy: false, updateMsg: <span className="text-danger">Unable to update provisional changes.</span>});
                        console.log(err);
                    });
                }).catch(err => {
                    console.log(err);
                });
                // Also update the interpretation object in case the checkbox value has changed
                this.putRestData('/interpretation/' + interpretation.uuid, flatInterpretationObj).then(obj => {
                    this.props.updateInterpretationObj();
                }).catch(err => {
                    console.log(err);
                });
            }
        }
    },

    render: function() {
        let interpretation = this.state.interpretation;
        let evaluations = interpretation ? interpretation.evaluations : null;
        let sortedEvaluations = evaluations ? sortByStrength(evaluations) : null;
        let calculatedAssertion = this.state.autoClassification ? this.state.autoClassification : this.state.calculatedAssertion;
        let provisionalVariant = null;
        let alteredClassification = null;
        let provisionalStatus = null;
        let provisionalPathogenicity = this.state.provisionalPathogenicity;
        let provisionalReason = this.state.provisionalReason;
        let provisionalInterpretation = this.state.provisionalInterpretation;
        let disabledCheckbox = this.state.disabledCheckbox;
        let disabledFormSumbit = this.state.disabledFormSumbit;

        if (interpretation) {
            if (interpretation.markAsProvisional) {
                provisionalStatus = interpretation.markAsProvisional;
            }
            if (interpretation.provisional_variant && interpretation.provisional_variant.length) {
                provisionalVariant = interpretation.provisional_variant[0];
                if (provisionalVariant.alteredClassification) {
                    alteredClassification = provisionalVariant.alteredClassification;
                }
            }
        }
        // Modified pathogenicity value gets updated only after the form is saved
        // And thus we pull the stored value (if any) initially from the db
        // Then we pull the updated value from either REST post or put results
        let modifiedPathogenicity = this.state.modifiedPathogenicity ? this.state.modifiedPathogenicity : alteredClassification;

        return (
            <div className="container evaluation-summary">
                <h2><span>Evaluation Summary</span></h2>

                {(evaluations && evaluations.length) ?
                    <div className="summary-content-wrapper">

                        <div className="panel panel-info datasource-evaluation-summary-provision">
                            <div className="panel-body">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <div className="col-md-12 provisional-static-content-wrapper">
                                        <div className="col-xs-12 col-sm-6">
                                            <dl className="inline-dl clearfix">
                                                <dt>Calculated Pathogenicity:</dt>
                                                <dd>{calculatedAssertion ? calculatedAssertion : 'None'}</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>Modified Pathogenicity:</dt>
                                                <dd>{modifiedPathogenicity ? modifiedPathogenicity : 'None'}</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>Provisional Interpretation Status:</dt>
                                                <dd className="provisional-interpretation-status">{provisionalStatus ? 'Provisional' : 'In progress'}</dd>
                                            </dl>
                                        </div>
                                        <div className="col-xs-12 col-sm-6">
                                            <dl className="inline-dl clearfix">
                                                <dt>Disease:</dt>
                                                <dd>{interpretation.disease ? interpretation.disease.term : 'None'}</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>Mode of Inheritance:</dt>
                                                <dd className="modeInheritance">{interpretation.modeInheritance ? this.renderModeInheritanceLink(interpretation.modeInheritance) : 'None'}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                    <div className="col-md-12 provisional-form-content-wrapper">
                                        <div className="col-xs-12 col-sm-6">
                                            <div className="evaluation-provision provisional-pathogenicity">
                                                <Input type="select" ref="provisional-pathogenicity" label={<span>Modify Pathogenicity:<i>(optional)</i></span>}
                                                    value={provisionalPathogenicity ? provisionalPathogenicity : ''}
                                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" handleChange={this.handleChange}>
                                                    <option value=''>No Selection</option>
                                                    <option disabled="disabled"></option>
                                                    <option value="Benign">Benign</option>
                                                    <option value="Likely benign">Likely Benign</option>
                                                    <option value="Uncertain significance">Uncertain Significance</option>
                                                    <option value="Likely pathogenic">Likely Pathogenic</option>
                                                    <option value="Pathogenic">Pathogenic</option>
                                                </Input>
                                                <Input type="textarea" ref="provisional-reason" label={<span>Explain reason(s) for change:<i>(<strong>required</strong> for modified pathogenicity)</i></span>} rows="5"
                                                    value={provisionalReason ? provisionalReason : null}
                                                    placeholder="Note: If you selected a pathogenicity different from the Calculated Pathogenicity, you must provide a reason for the change here."
                                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" handleChange={this.handleChange} />
                                            </div>
                                        </div>
                                        <div className="col-xs-12 col-sm-6">
                                            <div className="evaluation-provision provisional-interpretation">
                                                <div>
                                                    <i className="icon icon-question-circle"></i>
                                                    <span>Mark as Provisional Interpretation (optional):</span>
                                                    <Input type="checkbox" ref="provisional-interpretation" inputDisabled={disabledCheckbox} checked={provisionalInterpretation} defaultChecked="false"
                                                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" handleChange={this.handleChange} />
                                                </div>
                                            </div>
                                            <div className="alert alert-warning">
                                                Note: If the Calculated Pathogenicity is "Likely Pathogenic" or "Pathogenic,"
                                                a disease must first be associated with the interpretation before it can be marked
                                                as a "Provisional Interpretation". Please select "Return to Interpretation" to add a disease.
                                            </div>
                                            <div className="provisional-submit">
                                                <Input type="submit" inputClassName={(provisionalVariant ? "btn-info" : "btn-primary") + " pull-right btn-inline-spacer"}
                                                    id="submit" title={provisionalVariant ? "Update" : "Save"} submitBusy={this.state.submitBusy} inputDisabled={disabledFormSumbit} />
                                                {this.state.updateMsg ?
                                                    <div className="submit-info pull-right">{this.state.updateMsg}</div>
                                                : null}
                                            </div>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>

                        <div className="panel panel-info datasource-evaluation-summary">
                            <div className="panel-heading">
                                <h3 className="panel-title">Criteria meeting an evaluation strength</h3>
                            </div>
                            <table className="table">
                                <thead>
                                    {tableHeader()}
                                </thead>
                                {sortedEvaluations.met ?
                                    <tbody>
                                        {sortedEvaluations.met.map(function(item, i) {
                                            return (renderMetCriteriaRow(item, i));
                                        })}
                                    </tbody>
                                    :
                                    <div className="panel-body">
                                        <span>No criteria meeting an evaluation strength.</span>
                                    </div>
                                }
                            </table>
                        </div>

                        <div className="panel panel-info datasource-evaluation-summary">
                            <div className="panel-heading">
                                <h3 className="panel-title">Criteria evaluated as "Not met"</h3>
                            </div>
                            <table className="table">
                                <thead>
                                    {tableHeader()}
                                </thead>
                                {sortedEvaluations.not_met ?
                                    <tbody>
                                        {sortedEvaluations.not_met.map(function(item, i) {
                                            return (renderNotMetCriteriaRow(item, i));
                                        })}
                                    </tbody>
                                    :
                                    <div className="panel-body">
                                        <span>No criteria evaluated as "Not met".</span>
                                    </div>
                                }
                            </table>
                        </div>

                        <div className="panel panel-info datasource-evaluation-summary">
                            <div className="panel-heading">
                                <h3 className="panel-title">Criteria "Not yet evaluated"</h3>
                            </div>
                            <table className="table">
                                <thead>
                                    {tableHeader()}
                                </thead>
                                {sortedEvaluations.not_evaluated ?
                                    <tbody>
                                        {sortedEvaluations.not_evaluated.map(function(item, i) {
                                            return (renderNotEvalCriteriaRow(item, i));
                                        })}
                                    </tbody>
                                    :
                                    <div className="panel-body">
                                        <span>No criteria yet to be evaluated.</span>
                                    </div>
                                }
                            </table>
                        </div>

                    </div>
                :
                    <div className="summary-content-wrapper"><p>No evaluations found in this interpretation.</p></div>
                }
            </div>
        );
    }
});

// Method to render static table header
function tableHeader() {
    return (
        <tr>
            <th className="col-md-1"><span className="label-benign">B</span>/<span className="label-pathogenic">P</span></th>
            <th className="col-md-1">Criteria</th>
            <th className="col-md-3">Criteria Descriptions</th>
            <th className="col-md-1">Modified</th>
            <th className="col-md-2">Evaluation Status</th>
            <th className="col-md-4">Evaluation Explanation</th>
        </tr>
    );
}

// Method to render "met" criteria table rows
function renderMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-met" data-evaltype={getCriteriaType(item)}>
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-check-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1" data-modlevel={getModifiedLevel(item)}>
                {item.criteriaModifier ? 'Yes' : 'No'}
            </td>
            <td className="evaluation-status col-md-2">
                {item.criteriaModifier ? item.criteria + '_' + item.criteriaModifier : getCriteriaStrength(item)}
            </td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-met" criteria table rows
function renderNotMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-met">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-times-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Met</td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-evaluated" criteria table rows
function renderNotEvalCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-evaluated">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-circle-o"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Evaluated</td>
            <td className="evaluation-description col-md-4">{item.explanation ? item.explanation : null}</td>
        </tr>
    );
}

// Method to get critetia type: benign or pathogenic
function getCriteriaType(entry) {
    const keys = Object.keys(evidenceCodes);
    let type;

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                case 'benign-strong':
                case 'benign-supporting':
                    type = 'benign';
                    break;
                case 'pathogenic-supporting':
                case 'pathogenic-moderate':
                case 'pathogenic-strong' :
                case 'pathogenic-very-strong':
                    type = 'pathogenic';
                    break;
                default:
                    type = '';
            }
        }
    });
    return type;
}

// Method to get criteria class
function getCriteriaClass(entry) {
    const keys = Object.keys(evidenceCodes);
    let classification = '';

    keys.map(key => {
        if (key === entry.criteria) {
            classification = evidenceCodes[key].class;
        }
    });
    return classification;
}

// Method to get short critetia description
function getCriteriaDescription(entry) {
    const keys = Object.keys(evidenceCodes);
    let description = '';

    keys.map(key => {
        if (key === entry.criteria) {
            description = evidenceCodes[key].definition;
        }
    });
    return description;
}

// Method to get criteria strength
function getCriteriaStrength(entry) {
    const keys = Object.keys(evidenceCodes);
    let strength = '';

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                    strength = 'stand-alone';
                    break;
                case 'pathogenic-very-strong':
                    strength = 'very-strong';
                    break;
                case 'benign-strong':
                case 'pathogenic-strong':
                    strength = 'strong';
                    break;
                case 'pathogenic-moderate':
                    strength = 'moderate';
                    break;
                case 'benign-supporting':
                case 'pathogenic-supporting':
                    strength = 'supporting';
                    break;
                default:
                    strength = '';
            }
        }
    });
    return strength;
}

// Method to determine the levels a criteria is modified
function getModifiedLevel(entry) {
    let modifiedLevel;
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'very-strong') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'moderate':
                modifiedLevel = '2-down';
                break;
            case 'supporting':
                modifiedLevel = '3-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'stand-alone') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = '2-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'strong') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
            case 'stand-alone':
                modifiedLevel = '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-down' : '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'moderate') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = '1-up';
                break;
            case 'supporting':
                modifiedLevel = '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'supporting') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '3-up';
                break;
            case 'stand-alone':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-up' : '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-up';
                break;
        }
    }
    return modifiedLevel;
}

// Function to sort evaluations by criteria strength level
// Sort Order: very strong or stand alone >> strong >> moderate >> supporting
// Input: array, interpretation.evaluations
// output: object as
//      {
//          met: array of sorted met evaluations,
//          not_met: array of sorted not-met evaluations,
//          not_evaluated: array of sorted not-evaluated and untouched objects;
//                         untouched obj has only one key:value element (criteria: code)
//      }

function sortByStrength(evaluations) {
    // Get all criteria codes
    let criteriaCodes = Object.keys(evidenceCodes);

    let evaluationMet = [];
    let evaluationNotMet = [];
    let evaluationNotEvaluated = [];

    for (let evaluation of evaluations) {
        if (evaluation.criteriaStatus === 'met') {
            evaluationMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else if (evaluation.criteriaStatus === 'not-met') {
            evaluationNotMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else {
            evaluationNotEvaluated.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        }
    }

    // Generate object for earch untouched criteria
    let untouchedCriteriaObjList = [];
    if (criteriaCodes.length) {
        for (let criterion of criteriaCodes) {
            untouchedCriteriaObjList.push({
                criteria: criterion
            });
        }
    }
    // merge not-evaluated and untouched together
    evaluationNotEvaluated = evaluationNotEvaluated.concat(untouchedCriteriaObjList);

    let sortedMetList = [];
    let sortedNotMetList = [];
    let sortedNotEvaluatedList = [];

    // sort Met
    if (evaluationMet.length) {
        // setup count strength values
        const MODIFIER_VS = 'very-strong';
        const MODIFIER_SA = 'stand-alone';
        const MODIFIER_S = 'strong';
        const MODIFIER_M = 'moderate';
        const MODIFIER_P = 'supporting';

        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationMet) {
            let modified = evaluation.criteriaModifier ? evaluation.criteriaModifier : null;
            if (modified) {
                if (modified === MODIFIER_VS || modified === MODIFIER_SA) {
                    vs_sa_level.push(evaluation);
                } else if (modified === MODIFIER_S) {
                    strong_level.push(evaluation);
                } else if (modified === MODIFIER_M) {
                    moderate_level.push(evaluation);
                } else if (modified === MODIFIER_P) {
                    supporting_level.push(evaluation);
                }
            } else {
                if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                    vs_sa_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'S') {
                    strong_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'M') {
                    moderate_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'P') {
                    supporting_level.push(evaluation);
                }
            }
        }

        if (vs_sa_level.length) {
            sortedMetList = sortedMetList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedMetList = sortedMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedMetList = sortedMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedMetList = sortedMetList.concat(supporting_level);
        }
    }

    // sort Not-Met
    if (evaluationNotMet.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationNotMet) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'P') {
                supporting_level.push(evaluation);
            }
        }

        if (vs_sa_level.length) {
            sortedNotMetList = sortedNotMetList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotMetList = sortedNotMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotMetList = sortedNotMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotMetList = sortedNotMetList.concat(supporting_level);
        }
    }

    //sort Not-Evaluated and untouched
    if (evaluationNotEvaluated.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationNotEvaluated) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'P') {
                supporting_level.push(evaluation);
            }
        }

        if (vs_sa_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(supporting_level);
        }
    }

    return ({
        met: sortedMetList,
        not_met: sortedNotMetList,
        not_evaluated: sortedNotEvaluatedList
    });
}
