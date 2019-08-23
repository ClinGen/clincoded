'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from '../../rest';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { PanelGroup, Panel } from '../../../libs/bootstrap/panel';
import { CompleteSection } from './shared/complete_section';
import { scrollElementIntoView } from '../../../libs/helpers/scroll_into_view';
import FunctionalDataTable from './functional/functional_data_table';

const vciFormHelper = require('./shared/form');
const CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
const evaluation_section_mapping = require('./mapping/evaluation_section.json');
const extraEvidence = require('./shared/extra_evidence');

// Display the curator data of the curation data
var CurationInterpretationFunctional = module.exports.CurationInterpretationFunctional = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        data: PropTypes.object,
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        ext_genboreeFuncData: PropTypes.object,
        loading_genboreeFuncData: PropTypes.bool,
        error_genboreeFuncData: PropTypes.object,
        href_url: PropTypes.object,
        affiliation: PropTypes.object,
        session: PropTypes.object,
        selectedCriteria: PropTypes.string
    },

    getInitialState() {
        return {
            data: this.props.data,
            clinvar_id: null,
            interpretation: this.props.interpretation,
            submitBusy: false,
            pmid: 0,
            selectedCriteria: this.props.selectedCriteria,
            selectedFunctionalTab: 0,
            funcDataObjDiffFlag: false
        };
    },

    componentDidMount() {
        if (this.state.selectedCriteria) {
            setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
        }
        if (this.props.ext_genboreeFuncData && this.state.interpretation && this.state.interpretation.evaluations) {
            this.compareFunctionalData(this.props.ext_genboreeFuncData, this.state.interpretation.evaluations);
        }
    },

    componentWillReceiveProps(nextProps) {
        this.setState({data: nextProps.data, interpretation: nextProps.interpretation});
        if (nextProps.selectedCriteria) {
            this.setState({selectedCriteria: nextProps.selectedCriteria}, () => {
                setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
            });
        }
        if (this.props.ext_genboreeFuncData && nextProps.interpretation && nextProps.interpretation.evaluations) {
            this.compareFunctionalData(this.props.ext_genboreeFuncData, nextProps.interpretation.evaluations);
        }
    },

    compareFunctionalData: function(newFuncData, savedEvals) {
        // Returns true if @newData is different from @oldData, otherwise returns false
        const isDiffAfisVersion = (newData, oldData) => {
            const oldAfis = _.property(['ld', 'AlleleFunctionalImpactStatement'])(oldData);
            const newAfis = _.property(['ld', 'AlleleFunctionalImpactStatement'])(newData);
            if (!oldAfis || !newAfis || oldAfis.length !== newAfis.length) {
                return true;
            }
            const afisKeys = newAfis && Object.keys(newAfis);
            return afisKeys.some(key => {
                const oldStatements = oldAfis[key] && oldAfis[key].statements;
                const newStatements = newAfis[key] && newAfis[key].statements;
                if (!oldStatements || !newStatements || oldStatements.length !== newStatements.length) {
                    return true;
                }
                return newStatements.some((statement, index) => {
                    if (statement.rev !== oldStatements[index].rev) {
                        return true;
                    }
                });
            });
        };
        savedEvals.some(evaluation => {
            if (['BS3', 'PS3'].indexOf(evaluation.criteria) > -1) {
                const funcDataObjDiffFlag = isDiffAfisVersion(newFuncData, evaluation.functional.functionalData);
                this.setState({funcDataObjDiffFlag});
                return true;
            }
        });
    },

    isPatientSourced: function(materialId, ldSet = []) {
        return ldSet.some(set => {
            const ldSetMaterialId = _.property(['entContent', 'entities', 'Material', 0, 'ldhId'])(set);
            if (ldSetMaterialId === materialId) {
                const isPatientSourced = _.property(['entContent', 'relation', 'value'])(set);
                if (isPatientSourced === 'Yes') {
                    return true;
                }
            }
        });
    },

    getGenotypeLabel: function(materialId, ldSet = [], genotypes = []) {
        let genotypeLabel = 'none';
        ldSet.some(set => {
            const ldSetMaterialId = _.property(['entContent', 'entities', 'Material', 0, 'ldhId'])(set);
            if (ldSetMaterialId === materialId) {
                const ldSetGenotypeId = _.property(['entContent', 'entities', 'Genotype', 0, 'ldhId'])(set);
                return genotypes.some(genotype => {
                    if (genotype.ldhId === ldSetGenotypeId) {
                        genotypeLabel = genotype.entId;
                        return true;
                    }
                });
            }
        });
        return genotypeLabel;
    },

    getOntologiesUrl: function(code = '', iri = '') {
        if (iri.includes('geneontology.org')) {
            return iri;
        }
        const ontologyId = code.split(':')[0];
        return `https://www.ebi.ac.uk/ols/ontologies/${ontologyId}/terms?iri=${encodeURIComponent(iri)}`;
    },

    handleTabSelect: function(selectedFunctionalTab) {
        this.setState({selectedFunctionalTab});
    },

    render() {
        const affiliation = this.props.affiliation, session = this.props.session;
        const {
            ext_genboreeFuncData,
            loading_genboreeFuncData,
            error_genboreeFuncData,
        } = this.props;
        const { funcDataObjDiffFlag, selectedFunctionalTab } = this.state;
        return (
            <div className="variant-interpretation functional">
                <PanelGroup accordion><Panel title="Hotspot or functional domain" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-experimental-panel-hotspot-functiona-domain" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup1} criteria={['PM1']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup1Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="experimental" subcategory="hotspot-functiona-domain" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Hotspot or functional domain)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['PM1']} />
                </Panel></PanelGroup>
                <PanelGroup accordion><Panel title="Experimental Studies" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-experimental-panel-experimental-studies" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup2} criteria={['BS3', 'PS3']}
                                    evidenceData={ext_genboreeFuncData} evidenceDataUpdated={funcDataObjDiffFlag} criteriaCrossCheck={[['BS3', 'PS3']]}
                                    formDataUpdater={criteriaGroup2Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    {!loading_genboreeFuncData && funcDataObjDiffFlag ?
                        <div className="row">
                            <p className="alert alert-warning">
                                <strong>Notice:</strong> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
                            </p>
                        </div>
                        : null}
                    <FunctionalDataTable
                        selectedTab={selectedFunctionalTab}
                        ext_genboreeFuncData={ext_genboreeFuncData}
                        loading_genboreeFuncData={loading_genboreeFuncData}
                        error_genboreeFuncData={error_genboreeFuncData}
                        handleTabSelect={this.handleTabSelect}
                        isPatientSourced={this.isPatientSourced}
                        getGenotypeLabel={this.getGenotypeLabel}
                        getOntologiesUrl={this.getOntologiesUrl}
                    />
                    <extraEvidence.ExtraEvidenceTable category="experimental" subcategory="experimental-studies" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Experimental Studies)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['BS3', 'PS3']} />
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="experimental" updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['PM1']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PM1'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup2 = function() {
    let criteriaList1 = ['BS3', 'PS3']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup2Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS3', 'PS3'], null);
};

