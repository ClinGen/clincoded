'use strict';
// Third-party libs
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { Form, FormMixin, Input } from 'libs/bootstrap/form';

// Internal libs
import { RestMixin } from 'components/rest';
import { AddResourceId } from 'components/add_external_resource';
var curator = require('components/curator');
var PmidSummary = curator.PmidSummary;
var CuratorHistory = require('components/curator_history');

import { EvidenceTable } from 'components/variant_central/interpretation/segregation/evidenceTable';
import { EvidenceModalManager } from 'components/variant_central/interpretation/segregation/evidenceModalManager';

// Class to render the extra evidence table in VCI, and handle any interactions with it
// export default ExtraEvidenceTable = createReactClass({
var ExtraEvidenceTable = module.exports.ExtraEvidenceTable = createReactClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        viewOnly: PropTypes.bool, // True if extra evidence is in view-only mode
        tableName: PropTypes.object, // table name as HTML object
        category: PropTypes.string, // category (usually the tab) the evidence is part of
        subcategory: PropTypes.string, // subcategory (usually the panel) the evidence is part of
        href_url: PropTypes.object, // href_url object
        session: PropTypes.object, // session object
        variant: PropTypes.object, // parent variant object
        interpretation: PropTypes.object, // parent interpretation object
        updateInterpretationObj: PropTypes.func, // function from index.js; this function will pass the updated interpretation object back to index.js
        affiliation: PropTypes.object, // user's affiliation data object
        criteriaList: PropTypes.array // criteria code(s) pertinent to the category/subcategory
    },

    contextTypes: {
        fetch: PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false, // spinner for Save button
            editBusy: false, // spinner for Edit button
            deleteBusy: false, // spinner for Delete button
            updateMsg: null,
            tempEvidence: null, // evidence object brought in my AddResourceId modal
            editEvidenceId: null, // the ID of the evidence to be edited from the table
            descriptionInput: null, // state to store the description input content
            editDescriptionInput: null, // state to store the edit description input content
            criteriaInput: 'none', // state to store one or more selected criteria
            editCriteriaInput: 'none', // state to store one or more edited criteria
            variant: this.props.variant, // parent variant object
            interpretation: this.props.interpretation ? this.props.interpretation : null, // parent interpretation object
            criteriaList: this.props.criteriaList ? this.props.criteriaList : [],
            evidenceType: null  // One of PMID, clinical_lab, clinic, research_lab, public_database, registered_curator, other
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // Update variant object when received
        if (nextProps.variant) {
            this.setState({variant: nextProps.variant});
        }
        // Update interpretation object when received
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        // Update criteria list specific to the PMID
        if (nextProps.criteriaList) {
            this.setState({criteriaList: nextProps.criteriaList});
        }
    },

    updateTempEvidence: function(article) {
        // Called by AddResourceId modal upon closing modal. Updates the tempEvidence state and clears description input
        this.setState({tempEvidence: article, editCriteriaSelection: 'none', descriptionInput: null});
    },

    submitForm: function(e) {
        // Called when Add PMID form is submitted
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        let flatInterpretation = null;
        let freshInterpretation = null;

        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            // get updated interpretation object, then flatten it
            freshInterpretation = interpretation;
            flatInterpretation = curator.flatten(freshInterpretation);

            // create extra_evidence object to be inserted
            let extra_evidence = {
                variant: this.state.interpretation.variant['@id'],
                category: this.props.category,
                subcategory: this.props.subcategory,
                articles: [this.state.tempEvidence.pmid],
                evidenceCriteria: this.state.criteriaInput,
                evidenceDescription: this.refs['description'].getValue()
            };

            // Add affiliation if the user is associated with an affiliation
            // and if the data object has no affiliation
            if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                if (!extra_evidence.affiliation) {
                    extra_evidence.affiliation = this.props.affiliation.affiliation_id;
                }
            }

            return this.postRestData('/extra-evidence/', extra_evidence).then(result => {
                // post the new extra evidence object, then add its @id to the interpretation's extra_evidence_list array
                if (!flatInterpretation.extra_evidence_list) {
                    flatInterpretation.extra_evidence_list = [];
                }
                flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);

                // update interpretation object
                return this.recordHistory('add-hide', result['@graph'][0]).then(addHistory => {
                    return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                        return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                            return Promise.resolve(data['@graph'][0]);
                        });

                    });
                });

            });
        }).then(interpretation => {
            // upon successful save, set everything to default state, and trigger updateInterptationObj callback
            this.setState({submitBusy: false, tempEvidence: null, editCriteriaSelection: 'none', descriptionInput: null});
            this.props.updateInterpretationObj();
        }).catch(error => {
            this.setState({submitBusy: false, tempEvidence: null, updateMsg: <span className="text-danger">Something went wrong while trying to save this evidence!</span>});
            console.log(error);
        });
    },

    cancelAddEvidenceButton: function(e) {
        // called when the Cancel button is pressed during Add PMID
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({tempEvidence: null, editCriteriaSelection: 'none', descriptionInput: null});
    },

    editEvidenceButton: function(id) {
        // called when the Edit button is pressed for an existing evidence
        this.setState({editEvidenceId: id, editCriteriaSelection: 'none', editDescriptionInput: null});
    },

    cancelEditEvidenceButton: function(e) {
        // called when the Cancel button is pressed while editing an existing evidence
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({editEvidenceId: null, editCriteriaSelection: 'none', editDescriptionInput: null});
    },

    submitEditForm: function(e) {
        // called when Edit PMID form is submitted
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({editBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // since the extra_evidence object is really simple, and the description is the only thing changing,
        // make a new one instead of getting an updated and flattened one
        let extra_evidence = {
            variant: this.state.interpretation.variant['@id'],
            category: this.props.category,
            subcategory: this.props.subcategory,
            articles: [this.refs['edit-pmid'].getValue()],
            evidenceCriteria: this.state.editCriteriaInput,
            evidenceDescription: this.refs['edit-description'].getValue()
        };

        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            if (!extra_evidence.affiliation) {
                extra_evidence.affiliation = this.props.affiliation.affiliation_id;
            }
        }

        this.putRestData(this.refs['edit-target'].getValue(), extra_evidence).then(result => {
            this.recordHistory('modify-hide', result['@graph'][0]).then(addHistory => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({editBusy: false, editEvidenceId: null, editCriteriaSelection: 'none', editDescriptionInput: null});
                this.props.updateInterpretationObj();
            });
        }).catch(error => {
            this.setState({editBusy: false, editEvidenceId: null, editCriteriaSelection: 'none', editDescriptionInput: null});
            console.log(error);
        });
    },

    deleteEvidence: function(evidence) {
        // called when the Delete button for an existing evidence is pressed
        this.setState({deleteBusy: true});

        let deleteTargetId = evidence['@id'];
        let flatInterpretation = null;
        let freshInterpretation = null;
        // since the extra_evidence object is really simple, and the description is the only thing changing,
        // make a new one instead of getting an updated and flattened one
        let extra_evidence = {
            variant: evidence.variant,
            category: this.props.category,
            subcategory: this.props.subcategory,
            articles: [evidence.articles[0]['@id']],
            evidenceCriteria: evidence.evidenceCriteria,
            evidenceDescription: evidence.evidenceDescription,
            status: 'deleted'
        };
        this.putRestData(evidence['@id'] + '?render=false', extra_evidence).then(result => {
            return this.recordHistory('delete-hide', result['@graph'][0]).then(deleteHistory => {
                return this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
                    // get updated interpretation object, then flatten it
                    freshInterpretation = interpretation;
                    flatInterpretation = curator.flatten(freshInterpretation);

                    // remove removed evidence from evidence list
                    flatInterpretation.extra_evidence_list.splice(flatInterpretation.extra_evidence_list.indexOf(deleteTargetId), 1);

                    // update the interpretation object
                    return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                        return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    });
                });
            }).then(interpretation => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({deleteBusy: false});
                this.props.updateInterpretationObj();
            });
        }).catch(error => {
            this.setState({deleteBusy: false});
            console.log(error);
        });
    },

    deleteEvidenceFunc: function(evidence) {
        //TODO: Update evidence object or re-create it so that it passes the update validation.  See the open screenshot for details.

        this.setState({deleteBusy: true});

        let deleteTargetId = evidence['@id'];
        let flatInterpretation = null;
        let freshInterpretation = null;

        let extra_evidence = {
            variant: evidence.variant,
            category: this.props.category,
            subcategory: this.props.subcategory,
            // articles: [evidence.articles[0]['@id']],
            articles: [],
            evidenceCriteria: evidence.evidenceCriteria,
            evidenceDescription: evidence.evidenceDescription,
            status: 'deleted'
        };

        return this.putRestData(evidence['@id'] + '?render=false', extra_evidence).then(result => {
            return this.recordHistory('delete-hide', result['@graph'][0]).then(deleteHistory => {
                return this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
                    // get updated interpretation object, then flatten it
                    freshInterpretation = interpretation;
                    flatInterpretation = curator.flatten(freshInterpretation);

                    // remove removed evidence from evidence list
                    flatInterpretation.extra_evidence_list.splice(flatInterpretation.extra_evidence_list.indexOf(deleteTargetId), 1);

                    // update the interpretation object
                    return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                        return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    });
                });
            }).then(interpretation => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({deleteBusy: false});
                this.props.updateInterpretationObj();
            });
        }).catch(error => {
            this.setState({deleteBusy: false});
            console.error(error);
        });

    },

    renderInterpretationExtraEvidence: function(extra_evidence) {
        let affiliation = this.props.affiliation, session = this.props.session;
        let criteriaInput = extra_evidence.evidenceCriteria && extra_evidence.evidenceCriteria !== 'none' ? extra_evidence.evidenceCriteria : '--';
        // for rendering the evidence in tabular format
        return (
            <tr key={extra_evidence.uuid}>
                <td className="col-md-4"><PmidSummary article={extra_evidence.articles[0]} pmidLinkout /></td>
                <td className="col-md-1"><p>{criteriaInput}</p></td>
                <td className="col-md-3"><p className="word-break">{extra_evidence.evidenceDescription}</p></td>
                <td className={!this.props.viewOnly ? "col-md-1" : "col-md-2"}>{extra_evidence.submitted_by.title}</td>
                <td className={!this.props.viewOnly ? "col-md-1" : "col-md-2"}>{moment(extra_evidence.date_created).format("YYYY MMM DD, h:mm a")}</td>
                {!this.props.viewOnly ?
                    <td className="col-md-2">
                        {!this.props.viewOnly && ((affiliation && extra_evidence.affiliation && extra_evidence.affiliation === affiliation.affiliation_id) ||
                            (!affiliation && !extra_evidence.affiliation && session && session.user_properties && extra_evidence.submitted_by['@id'] === session.user_properties['@id'])) ?
                            <div>
                                <button className="btn btn-primary btn-inline-spacer" onClick={() => this.editEvidenceButton(extra_evidence['@id'])}>Edit</button>
                                <Input type="button-button" inputClassName="btn btn-danger btn-inline-spacer" title="Delete" submitBusy={this.state.deleteBusy}
                                    clickHandler={() => this.deleteEvidence(extra_evidence)} />
                            </div>
                            : null}
                    </td>
                    : null}
            </tr>
        );
    },

    /**
     * Method to handle criteria selection change
     */
    handleCriteriaChange(ref, e) {
        if (ref === 'criteria-selection') {
            this.setState({criteriaInput: this.refs[ref].getValue()});
        } else if (ref === 'edit-criteria-selection') {
            this.setState({editCriteriaInput: this.refs[ref].getValue()});
        }
    },

    handleDescriptionChange: function(ref, e) {
        // handles updating the state on textbox input change
        if (ref === 'description') {
            this.setState({descriptionInput: this.refs[ref].getValue()});
        } else if (ref === 'edit-description') {
            this.setState({editDescriptionInput: this.refs[ref].getValue()});
        }
    },

    shouldDisableSaveButton(action) {
        let disabled = true;
        if (action === 'add') {
            if ((this.state.descriptionInput && this.state.descriptionInput.length) || this.state.criteriaInput !== 'none') {
                disabled = false;
            }
        } else if (action === 'edit') {
            if ((this.state.editDescriptionInput && this.state.editDescriptionInput.length) || this.state.editCriteriaInput !== 'none') {
                disabled = false;
            }
        }
        return disabled;
    },

    renderInterpretationExtraEvidenceEdit: function(extra_evidence) {
        const criteriaList = this.state.criteriaList;
        let criteriaInput = extra_evidence.evidenceCriteria && extra_evidence.evidenceCriteria.length ? extra_evidence.evidenceCriteria : this.state.criteriaInput;

        return (
            <tr key={extra_evidence.uuid}>
                <td colSpan="6">
                    <PmidSummary article={extra_evidence.articles[0]} className="alert alert-info" pmidLinkout />
                    <Form submitHandler={this.submitEditForm} formClassName="form-horizontal form-std">
                        <Input type="text" ref="edit-target" value={extra_evidence['@id']} inputDisabled={true} groupClassName="hidden" />
                        <Input type="text" ref="edit-pmid" value={extra_evidence.articles[0].pmid} inputDisabled={true} groupClassName="hidden" />
                        <div className="pmid-evidence-form clearfix">
                            <div className="col-xs-6 col-md-4 pmid-evidence-form-item criteria-selection">
                                <Input type="select" ref="edit-criteria-selection" label="Criteria:"
                                    defaultValue={criteriaInput} value={criteriaInput} handleChange={this.handleCriteriaChange}
                                    error={this.getFormError("edit-criteria-selection")} clearError={this.clrFormErrors.bind(null, "edit-criteria-selection")}
                                    labelClassName="col-xs-6 col-md-4 control-label" wrapperClassName="col-xs-12 col-sm-6 col-md-8" groupClassName="form-group">
                                    <option value="none">Select criteria code</option>
                                    <option disabled="disabled"></option>
                                    {criteriaList.map((item, i) => {
                                        return <option key={i} value={item}>{item}</option>;
                                    })}
                                </Input>
                            </div>
                            <div className="col-xs-12 col-sm-6 col-md-8 pmid-evidence-form-item evidence-input">
                                <Input type="textarea" ref="edit-description" rows="2" label="Evidence:" value={extra_evidence.evidenceDescription} defaultValue={extra_evidence.evidenceDescription}
                                    labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-10" groupClassName="form-group" handleChange={this.handleDescriptionChange} />
                            </div>
                        </div>
                        <div className="clearfix">
                            <button className="btn btn-default pull-right btn-inline-spacer" onClick={this.cancelEditEvidenceButton}>Cancel Edit</button>
                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                                submitBusy={this.state.editBusy} inputDisabled={this.shouldDisableSaveButton('edit')} />
                            {this.state.updateMsg ?
                                <div className="submit-info pull-right">{this.state.updateMsg}</div>
                                : null}
                        </div>
                    </Form>
                </td>
            </tr>
        );
    },

    setEvidenceType: function(ref, event) {
        if (event.target.value === 'select-source') {
            this.setState({evidenceType: null});
        } else {
            this.setState({evidenceType: event.target.value});
        }
    },

    addEvidenceText: function() {
        let text = 'Click "Add Evidence" to curate and save a piece of evidence.';
        if (this.state.evidenceType == null) {
            text = 'Select an evidence source above';
        }
        return (
            <span style={{marginLeft: '5px'}}>{text}</span>
        )
    },

    /**
     * 
     * @param {bool} finished      If we have finished with data collection
     * @param {object} evidence    The evidence itself
     * @param {bool} isNew         True -> this is a new piece of evidence.  False -> we are editing evidence
     */
    evidenceCollectionDone(finished, evidence, isNew) {
        if (!finished) {
            return;
        } else {
            this.setState({editBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner
            if (isNew) {
                evidence['_submitted_by'] = `${this.props.session.user_properties['first_name']} ${this.props.session.user_properties['last_name']}`;
                evidence['relevant_criteria'] = this.state.criteriaList;
            }

            let flatInterpretation = null;
            let freshInterpretation = null;

            this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
                // get updated interpretation object, then flatten it
                freshInterpretation = interpretation;
                flatInterpretation = curator.flatten(freshInterpretation);

                // create extra_evidence object to be inserted
                let extra_evidence = {
                    variant: this.state.interpretation.variant['@id'],
                    category: this.props.category,
                    subcategory: this.props.subcategory,
                    // articles: [this.refs['edit-pmid'].getValue()],
                    articles: [],
                    evidenceCriteria: this.state.editCriteriaInput,
                    // evidenceDescription: this.refs['edit-description'].getValue(),
                    evidenceDescription: '',
                    source: isNew ? evidence : evidence.source
                };
    
                // Add affiliation if the user is associated with an affiliation
                // and if the data object has no affiliation
                if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                    if (!extra_evidence.affiliation) {
                        extra_evidence.affiliation = this.props.affiliation.affiliation_id;
                    }
                }
                if (isNew) {
                    return this.postRestData('/extra-evidence/', extra_evidence).then(result => {
                        // post the new extra evidence object, then add its @id to the interpretation's extra_evidence_list array
                        if (!flatInterpretation.extra_evidence_list) {
                            flatInterpretation.extra_evidence_list = [];
                        }
                        flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);
        
                        // update interpretation object
                        return this.recordHistory('add-hide', result['@graph'][0]).then(addHistory => {
                            return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                                return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                                    return Promise.resolve(data['@graph'][0]);
                                });
        
                            });
                        });
        
                    });
                } else {
                    return this.putRestData(evidence['@id'] + '?render=false', extra_evidence).then(result => {
                        // post the new extra evidence object, then add its @id to the interpretation's extra_evidence_list array
                        if (!flatInterpretation.extra_evidence_list) {
                            flatInterpretation.extra_evidence_list = [];
                        }
                        flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);
        
                        // update interpretation object
                        return this.recordHistory('add-hide', result['@graph'][0]).then(addHistory => {
                            return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                                return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                                    return Promise.resolve(data['@graph'][0]);
                                });
        
                            });
                        });
        
                    });
                }
            }).then(interpretation => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({submitBusy: false, tempEvidence: null, editCriteriaSelection: 'none', descriptionInput: null});
                this.props.updateInterpretationObj();
            }).catch(error => {
                this.setState({submitBusy: false, tempEvidence: null, updateMsg: <span className="text-danger">Something went wrong while trying to save this evidence!</span>});
                console.error(error);
            });
        }
    },

    render: function() {
        let relevantEvidenceListRaw = [];
        if (this.state.variant && this.state.variant.associatedInterpretations) {
            this.state.variant.associatedInterpretations.map(interpretation => {
                if (interpretation.extra_evidence_list) {
                    interpretation.extra_evidence_list.forEach(extra_evidence => {
                        relevantEvidenceListRaw.push(extra_evidence);
                    });
                    // interpretation.extra_evidence_list.map(extra_evidence => {
                    //     if (extra_evidence.subcategory === this.props.subcategory) {
                    //         relevantEvidenceListRaw.push(extra_evidence);
                    //     }
                    // });
                }
            });
        }
        let relevantEvidenceList = _(relevantEvidenceListRaw).sortBy(evidence => {
            return evidence.date_created;
        }).reverse();
        let parentObj = {/* // BEHAVIOR TBD
            '@type': ['evidenceList'],
            'evidenceList': relevantEvidenceList
        */};
        const criteriaList = this.state.criteriaList;
        const criteriaInput = this.state.criteriaInput;
        let extraEvidenceData = [];
        if (this.state.interpretation != null && 'extra_evidence_list' in this.state.interpretation) {
            extraEvidenceData = this.state.interpretation.extra_evidence_list
        }
        return (
            <div className="panel panel-info">
                <div className="panel-heading"><h3 className="panel-title">{this.props.tableName}</h3></div>
                <div className="panel-content-wrapper">
                    <table className="table">
                        <tbody>
                            {!this.props.viewOnly ?
                                <tr>
                                    <td colSpan="6">
                                        {this.state.tempEvidence ?
                                            <span>
                                                <PmidSummary article={this.state.tempEvidence} className="alert alert-info" pmidLinkout />
                                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                                    <div className="pmid-evidence-form clearfix">
                                                        <div className="col-xs-6 col-md-4 pmid-evidence-form-item criteria-selection">
                                                            <Input type="select" ref="criteria-selection" defaultValue={criteriaInput} label="Criteria:" handleChange={this.handleCriteriaChange}
                                                                error={this.getFormError("criteria-selection")} clearError={this.clrFormErrors.bind(null, "criteria-selection")}
                                                                labelClassName="col-xs-6 col-md-3 control-label" wrapperClassName="col-xs-12 col-sm-6 col-md-9" groupClassName="form-group">
                                                                <option value="none">Select criteria code</option>
                                                                <option disabled="disabled"></option>
                                                                {criteriaList.map((item, i) => {
                                                                    return <option key={i} value={item}>{item}</option>;
                                                                })}
                                                            </Input>
                                                        </div>
                                                        <div className="col-xs-12 col-sm-6 col-md-8 pmid-evidence-form-item evidence-input">
                                                            <Input type="textarea" ref="description" rows="2" label="Evidence:" handleChange={this.handleDescriptionChange}
                                                                labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-10" groupClassName="form-group" />
                                                        </div>
                                                    </div>
                                                    <div className="clearfix">
                                                        <AddResourceId resourceType="pubmed" protocol={this.props.href_url.protocol} parentObj={parentObj} buttonClass="btn-info"
                                                            buttonText="Edit PMID" modalButtonText="Add Article" updateParentForm={this.updateTempEvidence} buttonOnly={true} />
                                                        <button className="btn btn-default pull-right btn-inline-spacer" onClick={this.cancelAddEvidenceButton}>Cancel</button>
                                                        <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                                                            submitBusy={this.state.submitBusy} inputDisabled={this.shouldDisableSaveButton('add')} />
                                                        {this.state.updateMsg ?
                                                            <div className="submit-info pull-right">{this.state.updateMsg}</div>
                                                            : null}
                                                    </div>
                                                </Form>
                                            </span>
                                            :
                                            <span>
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <Input type="select" defaultValue="select-source" handleChange={this.setEvidenceType}>
                                                            <option value="select-source">Select Source</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="PMID">PMID</option>
                                                            <option value="clinical_lab">Clinical Lab</option>
                                                            <option value="clinic">Clinic</option>
                                                            <option value="research_lab">Research Lab</option>
                                                            <option value="public_database">Public Database</option>
                                                            <option value="other">Other</option>
                                                        </Input>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <EvidenceModalManager
                                                            data = {null}
                                                            allData = {relevantEvidenceList}
                                                            criteriaList = {this.props.criteriaList}
                                                            evidenceType = {this.state.evidenceType}
                                                            subcategory = {this.props.subcategory}
                                                            evidenceCollectionDone = {this.evidenceCollectionDone}
                                                            isNew = {true}
                                                            affiliation = {this.props.affiliation}
                                                            session = {this.props.session}
                                                        >
                                                        </EvidenceModalManager>
                                                        {this.addEvidenceText()}
                                                    </div>
                                                </div>
                                            </span>
                                        }
                                    </td>
                                </tr>
                                : null}
                        </tbody>
                    </table>
                    <EvidenceTable
                        allData = {extraEvidenceData}
                        tableData = {relevantEvidenceList}
                        subcategory = {this.props.subcategory}
                        deleteEvidenceFunc = {this.deleteEvidenceFunc}
                        evidenceCollectionDone = {this.evidenceCollectionDone}
                        criteriaList = {this.props.criteriaList}
                        session = {this.props.session}
                        affiliation = {this.props.affiliation}
                        viewOnly = {this.props.viewOnly}
                    >
                    </EvidenceTable>
                </div>
            </div>
        );
    }
});
