"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { external_url_map } from '../globals';

import { DiseaseModal } from './modal';
import ModalComponent from '../../libs/bootstrap/modal';

var curator = require('../curator');
var CuratorHistory = require('../curator_history');
var RestMixin = require('../rest').RestMixin;
var parseAndLogError = require('../mixins').parseAndLogError;

/**
 * Component for adding/deleting disease associated with an interpretation in VCI
 */
const InterpretationDisease = module.exports.InterpretationDisease = createReactClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        interpretation: PropTypes.object,
        variantData: PropTypes.object,
        hasAssociatedDisease: PropTypes.bool,
        editKey: PropTypes.string,
        updateInterpretationObj: PropTypes.func,
        calculatedAssertion: PropTypes.string,
        provisionalPathogenicity: PropTypes.string,
        diseaseObj: PropTypes.object,
        updateDiseaseObj: PropTypes.func,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            interpretation: this.props.interpretation,
            diseaseObj: this.props.diseaseObj,
            diseaseId: '',
            diseaseTerm: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            submitResourceBusy: false
        };
    },

    componentDidMount() {
        let interpretation = this.props.interpretation;
        if (interpretation && interpretation.disease) {
            this.setDiseaseObjectStates(interpretation.disease);
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.diseaseObj) {
            this.setState({diseaseObj: nextProps.diseaseObj}, () => {
                let diseaseObj = this.state.diseaseObj;
                if (Object.keys(diseaseObj).length) {
                    this.setDiseaseObjectStates(diseaseObj);
                }
            });
        }
    },

    /**
     * Shared method called by componentDidMount(), componentWillReceiveProps(nextProps)
     * @param {*} disease
     */
    setDiseaseObjectStates(disease) {
        if (disease.diseaseId) { this.setState({diseaseId: disease.diseaseId}); }
        if (disease.term) { this.setState({diseaseTerm: disease.term}); }
        if (disease.description) { this.setState({diseaseDescription: disease.description}); }
        if (disease.synonyms) { this.setState({synonyms: disease.synonyms}); }
        if (disease.phenotypes) { this.setState({phenotypes: disease.phenotypes}); }
        if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}); }
    },

    passDataToParent(diseaseId, term, description, synonyms, phenotypes, freetext) {
        let diseaseObj = this.state.diseaseObj;

        if (diseaseId) {
            /**
             * Changing colon to underscore in id string for database
             */
            diseaseObj['diseaseId'] = diseaseId.replace(':', '_');
            this.setState({diseaseId: diseaseId});
        }
        if (term) {
            diseaseObj['term'] = term;
            this.setState({diseaseTerm: term});
        }
        if (description) {
            diseaseObj['description'] = description;
            this.setState({diseaseDescription: description});
        } else {
            if (diseaseObj['description']) { delete diseaseObj['description']; }
            this.setState({diseaseDescription: null});
        }
        if (synonyms && synonyms.length) {
            diseaseObj['synonyms'] = synonyms;
            this.setState({synonyms: synonyms});
        } else {
            if (diseaseObj['synonyms']) { delete diseaseObj['synonyms']; }
            this.setState({synonyms: []});
        }
        if (phenotypes && phenotypes.length) {
            diseaseObj['phenotypes'] = phenotypes;
            this.setState({phenotypes: phenotypes});
        } else {
            if (diseaseObj['phenotypes']) { delete diseaseObj['phenotypes']; }
            this.setState({phenotypes: []});
        }
        if (freetext) {
            diseaseObj['freetext'] = true;
            this.setState({diseaseFreeTextConfirm: true});
        } else {
            if (diseaseObj['freetext']) { delete diseaseObj['freetext']; }
            this.setState({diseaseFreeTextConfirm: false});
        }
        this.setState({diseaseObj: diseaseObj}, () => {
            this.updateInterpretationWithDisease();
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
        });
    },

    // When the form is submitted...
    updateInterpretationWithDisease() {
        this.setState({submitResourceBusy: true});

        let diseaseObj = this.state.diseaseObj;
        let interpretationDisease, currInterpretation, flatInterpretation;

        if (diseaseObj && diseaseObj.term) {
            // There is associated disease in the interpretation
            this.getRestData('/search?type=disease&diseaseId=' + diseaseObj.diseaseId).then(diseaseSearch => {
                let diseaseUuid;
                if (diseaseSearch.total === 0) {
                    return this.postRestData('/diseases/', diseaseObj).then(result => {
                        let newDisease = result['@graph'][0];
                        diseaseUuid = newDisease['uuid'];
                        this.setState({diseaseUuid: diseaseUuid}, () => {
                            interpretationDisease = diseaseUuid;
                            return Promise.resolve(result);
                        });
                    });
                } else {
                    let _id = diseaseSearch['@graph'][0]['@id'];
                    diseaseUuid = _id.slice(10, -1);
                    this.setState({diseaseUuid: diseaseUuid}, () => {
                        interpretationDisease = diseaseUuid;
                    });
                }
            
            }, e => {
                // The given disease couldn't be retrieved for some reason.
                this.setState({submitResourceBusy: false}); // submit error; re-enable submit button
                this.setState({diseaseError: 'Error on validating disease.'});
                throw e;
            }).then(data => {
                this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
                    currInterpretation = interpretation;
                    // get up-to-date copy of interpretation object and flatten it
                    flatInterpretation = curator.flatten(currInterpretation);
                    // if the interpretation object does not have a disease object, create it
                    if (!('disease' in flatInterpretation)) {
                        flatInterpretation.disease = '';
                        // Return the newly flattened interpretation object in a Promise
                        return Promise.resolve(flatInterpretation);
                    } else {
                        return Promise.resolve(flatInterpretation);
                    }
                }).then(interpretationObj => {
                    if (interpretationDisease) {
                        // Set the disease '@id' to the newly flattened interpretation object's 'disease' property
                        interpretationObj.disease = interpretationDisease;
                        // Update the intepretation object partially with the new disease property value
                        return this.putRestData('/interpretation/' + this.props.interpretation.uuid, interpretationObj).then(result => {
                            this.props.updateInterpretationObj();
                            var meta = {
                                interpretation: {
                                    variant: this.props.variantData['@id'],
                                    disease: interpretationDisease,
                                    mode: 'edit-disease'
                                }
                            };
                            if (flatInterpretation.modeInheritance) {
                                meta.interpretation.modeInheritance = flatInterpretation.modeInheritance;
                            }
                            return this.recordHistory('modify', currInterpretation, meta).then(result => {
                                this.setState({submitResourceBusy: false});
                            });
                        });
                    }
                });
            }).catch(e => {
                // Some unexpected error happened
                this.setState({submitResourceBusy: false});
                parseAndLogError.bind(undefined, 'fetchedRequest');
            });
        } else {
            // There is NO associated disease in the interpretation
            this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
                currInterpretation = interpretation;
                // get up-to-date copy of interpretation object and flatten it
                var flatInterpretation = curator.flatten(currInterpretation);
                // If the interpretation has an existing disease, delete it
                if ('disease' in flatInterpretation) {
                    delete flatInterpretation['disease'];
                    let provisionalPathogenicity = this.props.provisionalPathogenicity;
                    let calculatedAssertion = this.props.calculatedAssertion;
                    if (provisionalPathogenicity === 'Likely pathogenic' || provisionalPathogenicity === 'Pathogenic') {
                        // flatInterpretation['markAsProvisional'] = false;
                    } else if (!provisionalPathogenicity) {
                        if (calculatedAssertion === 'Likely pathogenic' || calculatedAssertion === 'Pathogenic' ) {
                            // flatInterpretation['markAsProvisional'] = false;
                        }
                    }

                    // Update the intepretation object partially with the new disease property value
                    this.putRestData('/interpretation/' + this.props.interpretation.uuid, flatInterpretation).then(result => {
                        var meta = {
                            interpretation: {
                                variant: this.props.variantData['@id'],
                                disease: interpretationDisease,
                                mode: 'edit-disease'
                            }
                        };
                        this.recordHistory('modify', currInterpretation, meta).then(result => {
                            this.setState({submitResourceBusy: false}, () => {
                                // Need 'submitResourceBusy' state to proceed closing modal
                                this.props.updateInterpretationObj();
                            });
                        });
                    });
                } else {
                    this.setState({submitResourceBusy: false});
                }
            }).catch(e => {
                // Some unexpected error happened
                this.setState({submitResourceBusy: false});
                parseAndLogError.bind(undefined, 'fetchedRequest');
            });
        }
    },

    /**
     * Handler for button press event to delete disease from the evidence
     */
    handleDeleteDisease() {
        let diseaseObj = this.state.diseaseObj;
        this.setState({
            diseaseId: '',
            diseaseTerm: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            diseaseObj: {},
            error: null
        }, () => {
            this.updateInterpretationWithDisease();
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
        });
    },

    /** 
     * Called when either one of the alert modal buttons is clicked.
     * True if the 'Confirm' button was clicked.
     * False if the 'Cancel' button was clicked.
     */
    handleDeleteConfirm(confirm, e) {
        if (confirm) {
            this.handleDeleteDisease();
        }
        this.confirm.closeModal();
    },

    /**
     * Handler for button press event to alert/confirm disease deletion
     * if the interpretation had been saved as 'Provisional'
     */
    renderDeleteDiseaseBtn() {
        let interpretation = this.props.interpretation;
        let classification = interpretation && interpretation.provisional_variant && interpretation.provisional_variant.length ? interpretation.provisional_variant[0] : null;

        if (classification && classification.classificationStatus !== 'In progress') {
            return (
                <ModalComponent modalTitle="Confirm disease deletion" modalClass="modal-default" modalWrapperClass="confirm-interpretation-delete-disease-modal pull-right"
                    bootstrapBtnClass="btn btn-danger disease-delete " actuatorClass="interpretation-delete-disease-btn" actuatorTitle={<span>Disease<i className="icon icon-trash-o"></i></span>}
                    onRef={ref => (this.confirm = ref)}>
                    <div>
                        <div className="modal-body">
                            <p>
                                Warning: This interpretation is saved as "{classification.classificationStatus}." If it has a Modified Pathogenicity of "Likely pathogenic" or "Pathogenic,"
                                or no Modified Pathogenicity but a Calculated Pathogenicity of "Likely pathogenic" or "Pathogenic," it must be associated with a disease.<br/><br/>
                                <strong>If you still wish to delete the disease, select "Cancel," then select "View Summary" and remove the "Provisional" selection </strong>
                                - otherwise, deleting the disease will automatically remove the "Provisional" status.
                            </p>
                        </div>
                        <div className='modal-footer'>
                            <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.handleDeleteConfirm.bind(null, false)} title="Cancel" />
                            <Input type="button" inputClassName="btn-primary btn-inline-spacer" clickHandler={this.handleDeleteConfirm.bind(null, true)} title="Confirm" />
                        </div>
                    </div>
                </ModalComponent>
            );
        } else if ((classification && classification.classificationStatus === 'In progress') || !classification) {
            return (
                <a className="btn btn-danger pull-right disease-delete" onClick={this.handleDeleteDisease}>
                    <span>Disease<i className="icon icon-trash-o"></i></span>
                </a>
            );
        }
    },

    render() {
        let diseaseId = this.state.diseaseId;
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseDescription = this.state.diseaseDescription;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;
        let phenotypes = this.state.phenotypes;
        let synonyms = this.state.synonyms;
        let addDiseaseModalBtn = diseaseTerm ? <span>Disease<i className="icon icon-pencil"></i></span> : <span>Disease<i className="icon icon-plus-circle"></i></span>;

        return (
            <div className="add-disease-interpretation" id="add-disease-interpretation">
                {!diseaseTerm ?
                    <div className="add-disease-button">
                        <DiseaseModal
                            addDiseaseModalBtn={addDiseaseModalBtn}
                            diseaseId={diseaseId}
                            diseaseTerm={diseaseTerm}
                            diseaseDescription={diseaseDescription}
                            diseaseFreeTextConfirm={diseaseFreeTextConfirm}
                            phenotypes={phenotypes}
                            synonyms={synonyms}
                            passDataToParent={this.passDataToParent}
                            addDiseaseModalBtnLayoutClass=" evidence-disease pull-right"
                        />
                    </div>
                    :
                    <div className="delete-disease-button">
                        {this.renderDeleteDiseaseBtn()}
                    </div>
                }
            </div>
        );
    }
});
