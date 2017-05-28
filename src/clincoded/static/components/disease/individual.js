"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { external_url_map } from '../globals';

import { DiseaseModal } from './modal';

/**
 * Component for adding/copying/deleting disease when creating a new individual evidence
 * either with an associated group, with an associated family, or without either.
 */
const IndividualDisease = module.exports.IndividualDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object,
        group: PropTypes.object,
        family: PropTypes.object,
        individual: PropTypes.object,
        diseaseObj: PropTypes.object,
        updateDiseaseObj: PropTypes.func,
        clearErrorInParent: PropTypes.func,
        error: PropTypes.string,
        session: PropTypes.object,
        required: PropTypes.bool
    },

    getInitialState() {
        return {
            gdm: this.props.gdm,
            group: this.props.group,
            family: this.props.family,
            individual: this.props.individual,
            diseaseObj: this.props.diseaseObj,
            error: this.props.error,
            required: this.props.required,
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false
        };
    },

    componentDidMount() {
        let individual = this.props.individual;
        if (individual && individual.diagnosis) {
            this.setDiseaseObjectStates(individual.diagnosis[0]);
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm});
        }
        if (nextProps.group) {
            this.setState({group: nextProps.group});
        }
        if (nextProps.family) {
            this.setState({family: nextProps.family});
        }
        if (nextProps.diseaseObj) {
            this.setState({diseaseObj: nextProps.diseaseObj}, () => {
                let diseaseObj = this.state.diseaseObj;
                if (Object.keys(diseaseObj).length) {
                    this.setDiseaseObjectStates(diseaseObj);
                }
            });
        }
        if (nextProps.error) {
            this.setState({error: nextProps.error});
        }
        if (nextProps.required) {
            this.setState({required: nextProps.required});
        }
    },

    /**
     * Shared method called by componentDidMount(), componentWillReceiveProps(nextProps)
     * @param {*} disease
     */
    setDiseaseObjectStates(disease) {
        if (disease.id) { this.setState({diseaseId: disease.id}) };
        if (disease.term) { this.setState({diseaseTerm: disease.term}) };
        if (disease.ontology) { this.setState({diseaseOntology: disease.ontology}) };
        if (disease.description) { this.setState({diseaseDescription: disease.description}) };
        if (disease.synonyms) { this.setState({synonyms: disease.synonyms}) };
        if (disease.phenotypes) { this.setState({phenotypes: disease.phenotypes}) };
        if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}) };
    },

    passDataToParent(id, term, ontology, description, synonyms, phenotypes, freetext) {
        let diseaseObj = this.state.diseaseObj;
        this.setState({error: null}, () => {
            this.props.clearErrorInParent();
        });
        if (id) {
            /**
             * Changing colon to underscore in id string for database
             */
            diseaseObj['id'] = id.replace(':', '_');
            this.setState({diseaseId: id});
        }
        if (term) {
            diseaseObj['term'] = term;
            this.setState({diseaseTerm: term});
        }
        if (ontology) {
            diseaseObj['ontology'] = ontology;
            this.setState({diseaseOntology: ontology});
        }
        if (description) {
            diseaseObj['description'] = description;
            this.setState({diseaseDescription: description});
        } else {
            if (diseaseObj['description']) { delete diseaseObj['description'] };
            this.setState({diseaseDescription: null});
        }
        if (synonyms && synonyms.length) {
            diseaseObj['synonyms'] = synonyms;
            this.setState({synonyms: synonyms});
        } else {
            if (diseaseObj['synonyms']) { delete diseaseObj['synonyms'] };
            this.setState({synonyms: []});
        }
        if (phenotypes && phenotypes.length) {
            diseaseObj['phenotypes'] = phenotypes;
            this.setState({phenotypes: phenotypes});
        } else {
            if (diseaseObj['phenotypes']) { delete diseaseObj['phenotypes'] };
            this.setState({phenotypes: []});
        }
        if (freetext) {
            diseaseObj['freetext'] = true;
            this.setState({diseaseFreeTextConfirm: true});
        } else {
            if (diseaseObj['freetext']) { delete diseaseObj['freetext'] };
            this.setState({diseaseFreeTextConfirm: false});
        }
        this.setState({diseaseObj: diseaseObj}, () => {
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
        });
    },

    /**
     * Method to render the display of disease info
     * @param {*} id
     * @param {*} term
     * @param {*} desc
     * @param {*} hpo
     * @param {*} freetext
     */
    renderDiseaseData(id, term, desc, hpo, freetext) {
        let source = !freetext ? id.replace('_', ':') : this.props.session.user_properties.title;
        if (term && term.length) {
            return (
                <span>
                    <span className="data-view disease-name">{term + ' (' + source + ')'}</span>
                    {desc && desc.length ? <span className="data-view disease-desc"><strong>Definition: </strong>{desc}</span> : null}
                    {hpo && hpo.length ? <span className="data-view disease-phenotypes"><strong>HPO terms: </strong>{hpo.join(', ')}</span> : null}
                </span>
            );
        }
    },

    /**
     * Method to render the copy button given the curated evidence
     */
    renderCopyDiseaseButton() {
        let group = this.props.group,
            family = this.props.family;
        if (!group && !family) {
            return (
                <Input type="button" ref="copyGdmDisease" title="Copy disease term from Gene-Disease Record"
                    wrapperClassName="gdm-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyGdmDisease} />
            );
        } else if (group && !family) {
            return (
                <Input type="button" ref="copyGroupDisease" title="Copy disease term from Associated Group"
                    wrapperClassName="group-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyGroupDisease} />
            );
        } else if (family) {
            return (
                <Input type="button" ref="copyFamilyDisease" title="Copy disease term from Associated Family"
                    wrapperClassName="family-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyFamilyDisease} />
            );
        }
    },

    /**
     * Handler for button press event to copy disease from GDM
     */
    handleCopyGdmDisease(e) {
        e.preventDefault(); e.stopPropagation();
        let gdm = this.state.gdm;
        let diseaseObj = this.state.diseaseObj;
        this.setState({error: null}, () => {
            this.props.clearErrorInParent();
        });
        if (gdm && gdm.disease) {
            this.handleCopyDiseaseStates(gdm.disease, diseaseObj);
            
            this.setState({diseaseObj: diseaseObj}, () => {
                // Pass data object back to parent
                this.props.updateDiseaseObj(this.state.diseaseObj);
            });
        }
    },

    /**
     * Handler for button press event to copy disease from Group
     */
    handleCopyGroupDisease(e) {
        e.preventDefault(); e.stopPropagation();
        let group = this.state.group;
        let diseaseObj = this.state.diseaseObj;
        this.setState({error: null}, () => {
            this.props.clearErrorInParent();
        });
        if (group && group.commonDiagnosis && group.commonDiagnosis.length) {
            this.handleCopyDiseaseStates(group.commonDiagnosis[0], diseaseObj);
            
            this.setState({diseaseObj: diseaseObj}, () => {
                // Pass data object back to parent
                this.props.updateDiseaseObj(this.state.diseaseObj);
            });
        }
    },

    /**
     * Handler for button press event to copy disease from Family
     */
    handleCopyFamilyDisease(e) {
        e.preventDefault(); e.stopPropagation();
        let family = this.state.family;
        let diseaseObj = this.state.diseaseObj;
        this.setState({error: null}, () => {
            this.props.clearErrorInParent();
        });
        if (family && family.commonDiagnosis && family.commonDiagnosis.length) {
            this.handleCopyDiseaseStates(family.commonDiagnosis[0], diseaseObj);
            
            this.setState({diseaseObj: diseaseObj}, () => {
                // Pass data object back to parent
                this.props.updateDiseaseObj(this.state.diseaseObj);
            });
        }
    },

    /**
     * Shared method called by handleCopyDisease()
     * @param {*} disease
     * @param {*} diseaseObj
     */
    handleCopyDiseaseStates(disease, diseaseObj) {
        if (disease.id) { this.setState({diseaseId: disease.id}, () => { diseaseObj['id'] = disease.id }) };
        if (disease.term) { this.setState({diseaseTerm: disease.term}, () => { diseaseObj['term'] = disease.term }) };
        if (disease.ontology) { this.setState({diseaseOntology: disease.ontology}, () => { diseaseObj['ontology'] = disease.ontology }) };
        if (disease.description) { this.setState({diseaseDescription: disease.description}, () => { diseaseObj['description'] = disease.description }) };
        if (disease.synonyms && disease.synonyms.length) { this.setState({synonyms: disease.synonyms}, () => { diseaseObj['synonyms'] = disease.synonyms }) };
        if (disease.phenotypes && disease.phenotypes.length) { this.setState({phenotypes: disease.phenotypes}, () => { diseaseObj['phenotypes'] = disease.phenotypes }) };
        if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}, () => { diseaseObj['freetext'] = true }) };
    },

    /**
     * Handler for button press event to delete disease from the evidence
     */
    handleDeleteDisease(e) {
        e.preventDefault(); e.stopPropagation();
        let diseaseObj = this.state.diseaseObj;
        this.setState({
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            diseaseObj: {},
            error: null
        }, () => {
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
            this.props.clearErrorInParent();
        });
    },

    render() {
        let diseaseId = this.state.diseaseId;
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseOntology = this.state.diseaseOntology;
        let diseaseDescription = this.state.diseaseDescription;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;
        let phenotypes = this.state.phenotypes;
        let synonyms = this.state.synonyms;
        let addDiseaseModalBtn = diseaseTerm ? <span>Disease<i className="icon icon-pencil"></i></span> : <span>Disease<i className="icon icon-plus-circle"></i></span>;
        let error = this.state.error;

        return (
            <div className="form-group add-disease-group">
                <label htmlFor="add-disease" className="col-sm-5 control-label">
                    <span>Disease for individual{this.props.probandLabel}:
                        {this.state.required ? <span className="required-field"> *</span> : null}
                        <span className="control-label-note">Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a> using <a href={external_url_map['OLS']} target="_blank">OLS</a></span>
                    </span>
                </label>
                <div className="col-sm-7 add-disease inline-button-wrapper clearfix" id="add-disease">
                    <div ref="diseaseName" className={diseaseTerm ? "disease-name col-sm-9" : "disease-name"}>
                        {error ?
                            <span className="form-error">{error}</span>
                            :
                            <span>
                                {this.renderDiseaseData(diseaseId, diseaseTerm, diseaseDescription, phenotypes, diseaseFreeTextConfirm)}
                            </span>
                        }
                    </div>
                    {!diseaseTerm ?
                        <ul className={error ? "add-disease-button-group pull-right" : "add-disease-button-group"}>
                            <li>
                                {this.renderCopyDiseaseButton()}
                            </li>
                            <li>- or -</li>
                            <li>
                                <DiseaseModal
                                    addDiseaseModalBtn={addDiseaseModalBtn}
                                    diseaseId={diseaseId}
                                    diseaseTerm={diseaseTerm}
                                    diseaseOntology={diseaseOntology}
                                    diseaseDescription={diseaseDescription}
                                    diseaseFreeTextConfirm={diseaseFreeTextConfirm}
                                    phenotypes={phenotypes}
                                    synonyms={synonyms}
                                    passDataToParent={this.passDataToParent}
                                    addDiseaseModalBtnLayoutClass=" evidence-disease"
                                />
                            </li>
                        </ul>
                    :
                        <div className="delete-disease-button pull-right">
                            <Input type="button" ref="groupDeleteDisease" title="Delete disease"
                                wrapperClassName="disease-delete" inputClassName="btn-default"
                                clickHandler={this.handleDeleteDisease} />
                        </div>
                    }
                </div>
            </div>
        );
    }
});
