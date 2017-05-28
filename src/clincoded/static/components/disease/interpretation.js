"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { external_url_map } from '../globals';

import { DiseaseModal } from './modal';

/**
 * Component for adding/deleting disease associated with an interpretation in VCI
 */
const InterpretationDisease = module.exports.InterpretationDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        interpretation: PropTypes.object, // For editing disease (passed to Modal)
        diseaseObj: PropTypes.object,
        updateDiseaseObj: PropTypes.func,
        clearErrorInParent: PropTypes.func,
        error: PropTypes.string,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            interpretation: this.props.interpretation,
            diseaseObj: this.props.diseaseObj,
            error: this.props.error,
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
        let family = this.props.family;
        if (family && family.commonDiagnosis) {
            this.setDiseaseObjectStates(family.commonDiagnosis[0]);
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
            this.setState({family: nextProps.family}, () => {
                let family = this.state.family;
                if (family && family.commonDiagnosis) {
                    this.setDiseaseObjectStates(family.commonDiagnosis[0]);
                }
            });
        }
        if (nextProps.error) {
            this.setState({error: nextProps.error});
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
        if (context === 'group-curation' || (context === 'family-curation' && !group) || (context === 'individual-curation' && !group && !family)) {
            return (
                <Input type="button" ref="copyGdmDisease" title="Copy disease term from Gene-Disease Record"
                    wrapperClassName="gdm-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyGdmDisease} />
            );
        } else if ((context === 'family-curation' && group) || (context === 'individual-curation' && group && !family)) {
            return (
                <Input type="button" ref="copyGroupDisease" title="Copy disease term from Associated Group"
                    wrapperClassName="group-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyGroupDisease} />
            );
        } else if (context === 'individual-curation' && !group && family) {
            return (
                <Input type="button" ref="copyFamilyDisease" title="Copy disease term from Associated Family"
                    wrapperClassName="family-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyFamilyDisease} />
            );
        } else if (context === 'family-curation' && proband) {
            /**
             * Copy disease into the 'Family — Variant(s) Segregating with Proband' section
             * from what had been selected for Family, either by copying from Group or adding new one
             */
            return (
                <Input type="button" ref="copyFamilyProbandDisease" title="Copy disease term from Family"
                    wrapperClassName="family-proband-disease-copy" inputClassName="btn-default"
                    clickHandler={this.handleCopyFamilyProbandDisease} />
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
     * Handler for button press event to copy disease from Family
     */
    handleCopyFamilyProbandDisease(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({error: null}, () => {
            this.props.clearErrorInParent();
            this.props.updateFamilyProbandDiseaseObj();
        });
    },

    /**
     * Shared method called by handleCopyGdmDisease(e), handleCopyGroupDisease(e), handleCopyFamilyDisease(e)
     * @param {*} disease 
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
            diseaseObj: diseaseObj
        }, () => {
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
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
                    <span>Disease(s) in Common:<span className="required-field"> *</span><span className="control-label-note">Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a> using <a href={external_url_map['OLS']} target="_blank">OLS</a></span></span>
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
