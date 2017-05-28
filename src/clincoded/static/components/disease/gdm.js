"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { external_url_map } from '../globals';

import { DiseaseModal } from './modal';

/**
 * Component for adding disease when creating a new gene-disease record
 * and for editing disease (in the header) after a gdm had been created
 * (but not after a pmid had been added to the gdm)
 */
const GdmDisease = module.exports.GdmDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object, // For editing disease (passed to Modal)
        updateDiseaseObj: PropTypes.func,
        clearErrorInParent: PropTypes.func,
        error: PropTypes.string,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            gdm: this.props.gdm,
            error: this.props.error,
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

    componentDidMount() {
        let gdm = this.state.gdm;
        if (gdm && gdm.disease) {
            this.setDiseaseObjectStates(gdm.disease);
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm}, () => {
                let gdm = this.state.gdm;
                if (gdm && gdm.disease) {
                    this.setDiseaseObjectStates(gdm.disease);
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
        if (synonyms) {
            diseaseObj['synonyms'] = synonyms;
            this.setState({synonyms: synonyms});
        } else {
            if (diseaseObj['synonyms']) { delete diseaseObj['synonyms'] };
            this.setState({synonyms: []});
        }
        if (phenotypes) {
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

    renderDiseaseData(id, term, desc, hpo, freetext) {
        let source = !freetext ? id : this.props.session.user_properties.title;
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
        let inputLabel = diseaseFreeTextConfirm ? <span>Non-ID term:</span> : <span>Select disease:</span>;

        return (
            <div className="form-group add-disease-group">
                <label htmlFor="add-disease" className="col-sm-5 control-label">
                    <span>{inputLabel}<span className="required-field"> *</span><span className="control-label-note">Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a> using <a href={external_url_map['OLS']} target="_blank">OLS</a></span></span>
                </label>
                <div className="col-sm-7 add-disease inline-button-wrapper clearfix" id="add-disease">
                    <div ref="diseaseName" className={diseaseTerm || error ? "disease-name col-sm-8" : "disease-name"}>
                        {error ?
                            <span className="form-error">{error}</span>
                            :
                            <span>
                                {this.renderDiseaseData(diseaseId, diseaseTerm, diseaseDescription, phenotypes, diseaseFreeTextConfirm)}
                            </span>
                        }
                    </div>
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
                        addDiseaseModalBtnLayoutClass={diseaseTerm || error ? ' pull-right' : ''}
                    />
                </div>
            </div>
        );
    }
});