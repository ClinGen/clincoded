"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { external_url_map } from '../globals';

import { DiseaseModal } from './modal';

/**
 * Component for adding/copying/deleting disease when creating adding a proband individual
 * to a new family evidence that is currently being created.
 */
const FamilyProbandDisease = module.exports.FamilyProbandDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object, // For editing disease (passed to Modal)
        group: PropTypes.object,
        family: PropTypes.object,
        probandDiseaseObj: PropTypes.object,
        updateFamilyProbandDiseaseObj: PropTypes.func,
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
            probandDiseaseObj: this.props.probandDiseaseObj,
            error: this.props.error,
            required: this.props.required,
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            diseaseObj: {}
        };
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.probandDiseaseObj) {
            this.setState({probandDiseaseObj: nextProps.probandDiseaseObj}, () => {
                let probandDiseaseObj = this.state.probandDiseaseObj;
                if (Object.keys(probandDiseaseObj).length) {
                    this.setDiseaseObjectStates(probandDiseaseObj);
                }
            });
        }
        if (nextProps.error) {
            this.setState({error: nextProps.error});
        }
        /**
         * Set the value either true or false
         */
        this.setState({required: nextProps.required});
    },

    /**
     * Shared method called by componentWillReceiveProps(nextProps)
     * @param {*} disease
     */
    setDiseaseObjectStates(disease) {
        if (disease.id) { this.setState({diseaseId: disease.id}); }
        if (disease.term) { this.setState({diseaseTerm: disease.term}); }
        if (disease.ontology) { this.setState({diseaseOntology: disease.ontology}); }
        if (disease.description) { this.setState({diseaseDescription: disease.description}); }
        if (disease.synonyms) { this.setState({synonyms: disease.synonyms}); }
        if (disease.phenotypes) { this.setState({phenotypes: disease.phenotypes}); }
        if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}); }
    },

    passDataToParent(id, term, ontology, description, synonyms, phenotypes, freetext) {
        let diseaseObj = this.state.diseaseObj;
        this.setState({error: null}, () => {
            this.props.clearErrorInParent('familyProband');
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
            // Pass data object back to parent
            this.props.updateFamilyProbandDiseaseObj('add', this.state.diseaseObj);
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
        /**
         * Copy disease into the 'Family — Variant(s) Segregating with Proband' section
         * from what had been selected for Family, either by copying from Group or adding new one
         */
        return (
            <Input type="button" ref="copyFamilyProbandDisease" title="Copy disease term from Family"
                wrapperClassName="family-proband-disease-copy" inputClassName="btn-default"
                clickHandler={this.handleCopyFamilyProbandDisease} />
        );
    },

    /**
     * Handler for button press event to copy disease from family into proband
     */
    handleCopyFamilyProbandDisease(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({error: null}, () => {
            this.props.clearErrorInParent('familyProband');
            this.props.updateFamilyProbandDiseaseObj('copy');
        });
    },

    /**
     * Handler for button press event to delete disease from the evidence
     */
    handleDeleteDisease(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            probandDiseaseObj: {},
            error: null
        }, () => {
            // Pass data object back to parent
            this.props.updateFamilyProbandDiseaseObj('delete');
            this.props.clearErrorInParent('familyProband');
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
                    <span>Disease(s) for Individual:
                        {this.state.required ? <span className="required-field"> *</span> : null}
                        <span className="control-label-note">Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a> using OLS</span>
                    </span>
                </label>
                <div className="col-sm-7 add-disease inline-button-wrapper clearfix" id="add-disease">
                    <div ref="diseaseName" className={diseaseTerm ? "disease-name col-sm-9" : (error ? "disease-name error pull-left" : "disease-name")}>
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
                        <div className="delete-disease-button">
                            <a className="btn btn-danger pull-right disease-delete" onClick={this.handleDeleteDisease}>
                                <span>Disease<i className="icon icon-trash-o"></i></span>
                            </a>
                        </div>
                    }
                </div>
            </div>
        );
    }
});
