'use strict';
// Third-party libs
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { PanelGroup, Panel } from '../../../libs/bootstrap/panel';

// Internal libs
import { RestMixin } from '../../rest';
import { CompleteSection } from './shared/complete_section';
import { scrollElementIntoView } from '../../../libs/helpers/scroll_into_view';

const vciFormHelper = require('./shared/form');
const CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
const evaluation_section_mapping = require('./mapping/evaluation_section.json');
var curator = require('../../curator');
var CuratorHistory = require('../../curator_history');
import { ExtraEvidenceTable } from './segregation/addEvidence';
import { MasterEvidenceTable } from './segregation/masterTable';

// Display the curator data of the curation data
var CurationInterpretationSegregation = module.exports.CurationInterpretationSegregation = createReactClass({
    mixins: [RestMixin, CuratorHistory],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
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
            selectedCriteria: this.props.selectedCriteria,
            deleteBusy: false,
            editBusy: false,
            updateMsg: null
        };
    },

    componentDidMount() {
        if (this.state.selectedCriteria) {
            setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
        }
    },

    componentWillReceiveProps(nextProps) {
        this.setState({data: nextProps.data, interpretation: nextProps.interpretation});
        if (nextProps.selectedCriteria) {
            this.setState({selectedCriteria: nextProps.selectedCriteria}, () => {
                setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
            });
        }
    },

    /**
     * Delete the given evidence from its interpretation.
     * 
     * @param {object} evidence     // Evidence to be deleted
     * @param {string} subcategory  // Subcategory this evidence belongs to
     */
    deleteEvidenceFunc: function(evidence) {
        //TODO: Update evidence object or re-create it so that it passes the update validation.  See the open screenshot for details.

        this.setState({deleteBusy: true});

        let deleteTargetId = evidence['@id'];
        let flatInterpretation = null;
        let freshInterpretation = null;

        let extra_evidence = {
            variant: evidence.variant,
            category: evidence.category,
            subcategory: evidence.subcategory,
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

    /**
     * 
     * @param {bool} finished      If we have finished with data collection
     * @param {object} evidence    The new/modified evidence source data
     * @param {object} id          The evidence id if editing evidence. null if new evidence.
     */
    evidenceCollectionDone: function(finished, evidence, id, subcategory) {
        if (!finished) {
            return;
        } else {
            this.setState({editBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner
            if (id === null) {
                // set the submitter data as 'affiliation full name (user name)' or 'user name' if no affiliation
                let affiliationName = this.props.affiliation ? this.props.affiliation.affiliation_fullname : null;
                let userName = `${this.props.session.user_properties['first_name']} ${this.props.session.user_properties['last_name']}`;
                evidence['_submitted_by'] = affiliationName ? `${affiliationName} (${userName})` : `${userName}`;
            }

            let flatInterpretation = null;
            let freshInterpretation = null;
            // TODO - not sure if need to find criteria that has value from source.data
            let evidenceCriteria = 'none';

            this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
                // get updated interpretation object, then flatten it
                freshInterpretation = interpretation;
                flatInterpretation = curator.flatten(freshInterpretation);

                // create extra_evidence object to be inserted
                let extra_evidence = {
                    variant: this.state.interpretation.variant['@id'],
                    category: 'case-segregation',
                    subcategory: subcategory,
                    // articles: [this.refs['edit-pmid'].getValue()],
                    articles: [],
                    evidenceCriteria: evidenceCriteria,  // criteria has value which is not used for case gegregation
                    // evidenceDescription: this.refs['edit-description'].getValue(),
                    evidenceDescription: '',
                    source: evidence
                };

                // Add affiliation if the user is associated with an affiliation
                // and if the data object has no affiliation
                if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                    if (!extra_evidence.affiliation) {
                        extra_evidence.affiliation = this.props.affiliation.affiliation_id;
                    }
                }
                if (id === null) {
                    // create new extra evidence
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
                    return this.putRestData(id + '?render=false', extra_evidence).then(result => {
                        // post the new extra evidence object, then add its @id to the interpretation's extra_evidence_list array
                        if (!flatInterpretation.extra_evidence_list) {
                            flatInterpretation.extra_evidence_list = [];
                        }
                        flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);
                        // update interpretation object
                        return this.recordHistory('modify-hide', result['@graph'][0])
                    });
                }
            }).then(interpretation => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({editBusy: false, descriptionInput: null});
                this.props.updateInterpretationObj();
            }).catch(error => {
                this.setState({editBusy: false, updateMsg: <span className="text-danger">Something went wrong while trying to save this evidence!</span>});
                console.error(error);
            });
        }
    },

    /**
     * Check if the current login user can modify the given evidence.
     *
     * @param {object} evidence  // Evidence to be checked for
     */
    canCurrUserModifyEvidence(evidence) {
        let created_affiliation = evidence.affiliation;
        let curr_affiliation = this.props.affiliation;
        let created_user = evidence.submitted_by['@id'];
        let curr_user = this.props.session.user_properties['@id'];

        if ((created_affiliation && curr_affiliation && created_affiliation === curr_affiliation.affiliation_id) ||
            (!created_affiliation && !curr_affiliation && created_user === curr_user)) {
                return true;
        }
        return false;
    },

    renderCriteriaEvalLink() {
        return (
            <span>
                <a href="https://www.clinicalgenome.org/working-groups/sequence-variant-interpretation/" target="_blank" rel="noopener noreferrer">
                    Sequence Variant Interpretation (SVI) Working Group guidance
                </a>
            </span>
        );
    },

    renderMasterTable() {
        return <MasterEvidenceTable
                    evidence_arr = {this.getAllInterpretations()}
                    affiliation = {this.props.affiliation}
                    session = {this.props.session}
                    viewOnly = {this.state.data && !this.state.interpretation}
                    deleteEvidenceFunc = {this.deleteEvidenceFunc}
                    evidenceCollectionDone = {this.evidenceCollectionDone}
                    canCurrUserModifyEvidence={this.canCurrUserModifyEvidence}
                >
                </MasterEvidenceTable>
    },

    getAllInterpretations() {
        let relevantEvidenceListRaw = [];
        if (this.props.data && this.props.data.associatedInterpretations) {
            this.props.data.associatedInterpretations.map(interpretation => {
                if (interpretation.extra_evidence_list) {
                    interpretation.extra_evidence_list.forEach(extra_evidence => {
                        // temporary codes
                        if (extra_evidence.category === 'case-segregation') {
                            relevantEvidenceListRaw.push(extra_evidence);
                        }
                    });
                }
            });
        }
        let relevantEvidenceList = _(relevantEvidenceListRaw).sortBy(evidence => {
            return evidence.date_created;
        }).reverse();
        return relevantEvidenceList;
    },

    render() {
        let that = this;
        function getVariantUUID() {
            if (that.state && that.state.data) {
                return that.state.data['@id'];
            }
            return null;
        }
        const affiliation = this.props.affiliation, session = this.props.session;
        let panel_data = [
            {
                title: 'Observed in healthy adult(s)',
                key: 1,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-observed-in-healthy',
                criteria: ['BS2'],
                curation: {
                    content: criteriaGroup1,
                    formDataUpdater: criteriaGroup1Update
                },
                extraEvidence: {
                    subcategory: 'observed-in-healthy',
                    tableName: <span>Curated Evidence (Observed in healthy adult(s))</span>
                }
            },
            {
                title: 'Case-control',
                key: 2,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-case-control',
                criteria: ['PS4'],
                curation: {
                    content: criteriaGroup2,
                    formDataUpdater: criteriaGroup2Update
                },
                extraEvidence: {
                    subcategory: 'case-control',
                    tableName: <span>Curated Literature Evidence (Case-control)</span>
                }
            },
            {
                title: 'Segregation data',
                key: 3,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-segregation-data',
                criteria: ['BS4', 'PP1'],
                curation: {
                    content: criteriaGroup3,
                    formDataUpdater: criteriaGroup3Update
                },
                extraEvidence: {
                    subcategory: 'segregation-data',
                    tableName: <span>Curated Literature Evidence (Segregation data)</span>
                }
            },
            {
                title: <h4><i>de novo</i> occurrence</h4>,
                key: 4,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-de-novo',
                criteria: ['PM6', 'PS2'],
                curation: {
                    content: criteriaGroup4,
                    formDataUpdater: criteriaGroup4Update
                },
                extraEvidence: {
                    subcategory: 'de-novo',
                    tableName: <span>Curated Literature Evidence (<i>de novo</i> occurrence)</span>
                }
            },
            {
                title: <h4>Allele data (<i>cis/trans</i>)</h4>,
                key: 5,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-allele-data',
                criteria: ['BP2', 'PM3'],
                curation: {
                    content: criteriaGroup5,
                    formDataUpdater: criteriaGroup5Update
                },
                extraEvidence: {
                    subcategory: 'allele-data',
                    tableName: <span>Curated Literature Evidence (Allele Data (<i>cis/trans</i>))</span>
                }
            },
            {
                title: 'Alternate mechanism for disease',
                key: 6,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-alternate-mechanism',
                criteria: ['BP5'],
                curation: {
                    content: criteriaGroup6,
                    formDataUpdater: criteriaGroup6Update
                },
                extraEvidence: {
                    subcategory: 'alternate-mechanism',
                    tableName: <span>Curated Literature Evidence (Alternate mechanism for disease)</span>
                }
            },
            {
                title: 'Specificity of phenotype',
                key: 7,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-specificity-of-phenotype',
                criteria: ['PP4'],
                curation: {
                    content: criteriaGroup7,
                    formDataUpdater: criteriaGroup7Update
                },
                extraEvidence: {
                    subcategory: 'specificity-of-phenotype',
                    tableName: <span>Curated Literature Evidence (Specificity of phenotype)</span>
                }
            }
        ];

        const panels = panel_data.map(panel => {
            let interpretationForm = null;
            if (this.state.data && this.state.interpretation) {
              interpretationForm = <div className="row">
                  <div className="col-sm-12">
                    <CurationInterpretationForm
                        // Specific configutations
                        renderedFormContent={panel.curation.content}
                        criteria={panel.criteria}
                        formDataUpdater={panel.curation.formDataUpdater}
                        
                        // Common configurations
                        evidenceData={null}
                        evidenceDataUpdated={true}
                        variantUuid={getVariantUUID()}
                        interpretation={this.state.interpretation}
                        updateInterpretationObj={this.props.updateInterpretationObj}
                        affiliation={this.props.affiliation}
                        session={this.props.session}
                    />
                  </div>
                </div>
            }
            let extraEvidenceForm = <ExtraEvidenceTable 
                // Specific configurations
                subcategory={panel.extraEvidence.subcategory}
                tableName={panel.extraEvidence.tableName}
                criteriaList={panel.criteria}

                // Common configurations
                category="case-segregation"
                session={this.props.session}
                href_url={this.props.href_url}
                variant={this.state.data}
                interpretation={this.state.interpretation}
                updateInterpretationObj={this.props.updateInterpretationObj}
                viewOnly={this.state.data && !this.state.interpretation}
                affiliation={this.props.affiliation}
                deleteEvidenceFunc={this.deleteEvidenceFunc}
                evidenceCollectionDone = {this.evidenceCollectionDone}
                canCurrUserModifyEvidence={this.canCurrUserModifyEvidence}
            />
            return <PanelGroup accordion key={panel.key}>
                <Panel
                    title={panel.title}
                    panelBodyClassName={panel.bodyClassName}
                    panelClassName={panel.panelClassName}
                    open
                    >
                        {interpretationForm}
                        {extraEvidenceForm}
                </Panel>
            </PanelGroup>
        });

        return (
            <div className="variant-interpretation segregation">
                {this.state.interpretation ?
                    <p className="alert alert-warning">Users should not enter unique or sensitive information that is likely to identify an individual.
                        Users should not publish data found in this interface without permission from the individual(s) who entered the data. For publication
                        of aggregate information, please contact ClinGen at <a href="mailto:clingen@clinicalgenome.org">clingen@clinicalgenome.org</a>.</p>
                    : null }

                {this.renderMasterTable()}
                {panels}

                <PanelGroup accordion><Panel title="Reputable source" panelBodyClassName="panel-wide-content reputable-source"
                    panelClassName="tab-segegration-panel-reputable-source" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <p className="alert alert-warning">ClinGen has determined that the following rules should not be applied in any context.</p>
                                <CurationInterpretationForm renderedFormContent={criteriaGroup8} criteria={['BP6', 'PP5']}
                                    evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BP6', 'PP5']]}
                                    formDataUpdater={criteriaGroup8Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    disableEvalForm={true} affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="segregation-case" updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['BS2']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS2'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup2 = function() {
    let criteriaList1 = ['PS4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup2Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PS4'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup3 = function() {
    let criteriaList1 = ['BS4'], // array of criteria code handled subgroup of this section
        criteriaList2 = ['PP1']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup3Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS4', 'PP1'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup4 = function() {
    let criteriaList1 = ['PM6'], // array of criteria code handled subgroup of this section
        criteriaList2 = ['PS2']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup4Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PM6', 'PS2'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup5 = function() {
    let criteriaList1 = ['BP2'], // array of criteria code handled subgroup of this section
        criteriaList2 = ['PM3']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup5Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP2', 'PM3'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup6 = function() {
    let criteriaList1 = ['BP5']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup6Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP5'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup7 = function() {
    let criteriaList1 = ['PP4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup7Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PP4'], null);
};


/**
 * Callback for rendering of this group of interpretation forms
 * Disabling form currently only applies to 'BP6' and 'PP5' if the gene is NEITHER BRCA1 or BRCA2
 * @param {boolean} disableEvalForm - The flag to disable criteria evaluation form
 */
var criteriaGroup8 = function(disableEvalForm) {
    let criteriaList1 = ['BP6', 'PP5']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, true)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup8Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP6', 'PP5'], null);
};

