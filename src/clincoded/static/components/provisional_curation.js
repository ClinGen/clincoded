'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, history_views, userMatch, queryKeyValue } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';
import { ClassificationDefinition } from './provisional_classification/definition';
import * as CuratorHistory from './curator_history';
import * as methods from './methods';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const CurationPalette = curator.CurationPalette;

var ProvisionalCuration = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func,
        closeModal: PropTypes.func
    },

    queryValues: {},

    propTypes: {
        href: PropTypes.string,
        session: PropTypes.object,
        affiliation: PropTypes.object
    },

    getInitialState: function() {
        return {
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: {}, // login user's existing provisional object, must be null initially.
            //assessments: null,  // list of all assessments, must be nul initially.
            totalScore: null,
            autoClassification: 'No Classification',
            alteredClassification: 'No Modification',
            replicatedOverTime: false,
            reasons: '',
            classificationStatus: 'In progress',
            classificationStatusChecked: false,
            evidenceSummary: '',
            contradictingEvidence: {
                proband: false, caseControl: false, experimental: false
            },
            resetAlteredClassification: false,
            scoreTableValues: {
                // variables for autosomal dominant data
                probandOtherVariantCount: 0, probandOtherVariantPoints: 0, probandOtherVariantPointsCounted: 0,
                probandNullVariantCount: 0, probandNullVariantPoints: 0, probandNullVariantPointsCounted: 0,
                variantDenovoCount: 0, variantDenovoPoints: 0, variantDenovoPointsCounted: 0,
                // variables for autosomal recessive data
                autosomalRecessivePointsCounted: 0,
                twoVariantsProvenCount: 0, twoVariantsProvenPoints: 0,
                twoVariantsNotProvenCount: 0, twoVariantsNotProvenPoints: 0,
                // variables for segregation data
                // segregationPoints is actually the raw, unconverted score; segregationPointsCounted is calculated and displayed score
                segregationCount: 0, segregationPoints: 0, segregationPointsCounted: 0,
                // variables for case-control data
                caseControlCount: 0, caseControlPoints: 0, caseControlPointsCounted: 0,
                // variables for Experimental data
                functionalPointsCounted: 0, functionalAlterationPointsCounted: 0, modelsRescuePointsCounted: 0,
                biochemicalFunctionCount: 0, biochemicalFunctionPoints: 0,
                proteinInteractionsCount: 0, proteinInteractionsPoints: 0,
                expressionCount: 0, expressionPoints: 0,
                patientCellsCount: 0, patientCellsPoints: 0,
                nonPatientCellsCount: 0, nonPatientCellsPoints: 0,
                nonHumanModelCount: 0, nonHumanModelPoints: 0,
                cellCultureCount: 0, cellCulturePoints: 0,
                rescueHumanModelCount: 0, rescueHumanModelPoints: 0,
                rescueNonHumanModelCount: 0, rescueNonHumanModelPoints: 0,
                rescueCellCultureCount: 0, rescueCellCulturePoints: 0,
                rescuePatientCellsCount: 0, rescuePatientCellsPoints: 0,
                // variables for total counts
                geneticEvidenceTotalPoints: 0, experimentalEvidenceTotalPoints: 0
            }
        };
    },

    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;

        // get gdm from db.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '' // search for entire data set of the gdm
        ]);
        this.getRestDatas(
            uris
        ).then(datas => {
            var stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid;

            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;
                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // search for provisional owned by affiliation or login user
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (let provisionalClassification of stateObj.gdm.provisionalClassifications) {
                    let curatorAffiliation = this.props.affiliation && Object.keys(this.props.affiliation).length;
                    let affiliation = provisionalClassification.affiliation ? provisionalClassification.affiliation : null;
                    let creator = provisionalClassification.submitted_by;
                    if ((affiliation && curatorAffiliation && affiliation === curatorAffiliation.affiliation_id) || (!affiliation && !curatorAffiliation && creator.uuid === stateObj.user)) {
                        stateObj.provisional = provisionalClassification;
                        stateObj.alteredClassification = stateObj.provisional.alteredClassification;
                        stateObj.replicatedOverTime = stateObj.provisional.replicatedOverTime;
                        stateObj.reasons = stateObj.provisional.reasons;
                        stateObj.classificationStatus = stateObj.provisional.hasOwnProperty('classificationStatus') ? stateObj.provisional.classificationStatus : 'In progress',
                        stateObj.classificationStatusChecked = stateObj.provisional.classificationStatus !== 'In progress' ? true : false,
                        stateObj.evidenceSummary = stateObj.provisional.hasOwnProperty('evidenceSummary') ? stateObj.provisional.evidenceSummary : '';
                    }
                }
            }
            stateObj.previousUrl = url;
            this.setState(stateObj);

            return Promise.resolve();
        }).then(result => {
            // once we have the GDM info, calculate the values for the score table
            this.calculateScoreTable();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    componentDidMount: function() {
        this.loadData();
    },

    componentDidUpdate(prevProps, prevState) {
        // Need to delay the function call until the DOM is rendered
        // Only do invoke this call when the referrer is the classification view-only page
        const referrer = queryKeyValue('referrer', this.props.href);
        if (referrer && referrer.indexOf('classification-view') > -1) {
            setTimeout(this.scrollElementIntoView, 500);
        }
        // Highlight the modified classification dropdown menu and
        // its explanation text field if there is a svaed classifition
        if (Object.keys(this.state.provisional).length) {
            const alteredClassificationMenu = document.querySelector('.altered-classification select');
            const alteredClassificationReasonField = document.querySelector('.altered-classification-reasons textarea');
            if (alteredClassificationMenu) {
                alteredClassificationMenu.classList.add('form-control-info');
            }
            if (alteredClassificationReasonField && this.state.reasons) {
                alteredClassificationReasonField.classList.add('form-control-info');
            }
        }
    },

    componentWillUnmount() {
        this.setState({resetAlteredClassification: false});
    },

    /**
     * Method to show the saved classification data in viewport
     */
    scrollElementIntoView() {
        const element = document.querySelector('#classification-view');
        if (element) {
            element.scrollIntoView();
        }
    },

    submitForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // Save all form values from the DOM.
        this.saveAllFormValues();
        if (this.validateDefault()) {
            var calculate = queryKeyValue('calculate', this.props.href);
            var edit = queryKeyValue('edit', this.props.href);
            var newProvisional = this.state.provisional.uuid ? curator.flatten(this.state.provisional) : {};
            newProvisional.totalScore = Number(this.state.totalScore);
            newProvisional.autoClassification = this.state.autoClassification;
            newProvisional.alteredClassification = this.state.alteredClassification;
            newProvisional.reasons = this.state.reasons;
            newProvisional.replicatedOverTime = this.state.replicatedOverTime;
            newProvisional.contradictingEvidence = this.state.contradictingEvidence;
            newProvisional.classificationStatus = this.state.classificationStatus;
            newProvisional.evidenceSummary = this.state.evidenceSummary;

            // Add affiliation if the user is associated with an affiliation
            // and if the data object has no affiliation
            if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                if (!newProvisional.affiliation) {
                    newProvisional.affiliation = this.props.affiliation.affiliation_id;
                }
            }

            // check required item (reasons)
            var formErr = false;
            if (!newProvisional.reasons && newProvisional.alteredClassification !== 'No Modification') {
                formErr = true;
                this.setFormErrors('reasons', 'Required when changing classification.');
            }
            if (newProvisional.autoClassification === newProvisional.alteredClassification) {
                formErr = true;
                this.setFormErrors('alteredClassification', 'Modified classification should be different from calculated classification');
            }
            if (!formErr) {
                var backUrl = '/curation-central/?gdm=' + this.state.gdm.uuid;
                backUrl += this.queryValues.pmid ? '&pmid=' + this.queryValues.pmid : '';
                if (this.state.provisional.uuid) { // edit existing provisional
                    this.putRestData('/provisional/' + this.state.provisional.uuid, newProvisional).then(data => {
                        var provisionalClassification = data['@graph'][0];

                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: provisionalClassification.alteredClassification
                            }
                        };
                        this.recordHistory('modify', provisionalClassification, meta);

                        this.resetAllFormValues();
                        window.location.href = '/provisional-classification/?gdm=' + this.state.gdm.uuid;
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = : %o', e);
                    });
                } else { // save a new calculation and provisional classification
                    this.postRestData('/provisional/', newProvisional).then(data => {
                        return data['@graph'][0];
                    }).then(savedProvisional => {
                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: savedProvisional.alteredClassification
                            }
                        };
                        this.recordHistory('add', savedProvisional, meta);

                        var theGdm = curator.flatten(this.state.gdm);
                        if (theGdm.provisionalClassifications) {
                            theGdm.provisionalClassifications.push(savedProvisional['@id']);
                        }
                        else {
                            theGdm.provisionalClassifications = [savedProvisional['@id']];
                        }

                        return this.putRestData('/gdm/' + this.state.gdm.uuid, theGdm).then(data => {
                            return data['@graph'][0];
                        });
                    }).then(savedGdm => {
                        this.resetAllFormValues();
                        window.location.href = '/provisional-classification/?gdm=' + this.state.gdm.uuid;
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = %o', e);
                    });
                }
            }
        }
    },

    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        window.history.go(-1);
    },

    handleChange: function(ref, e) {
        if (ref === 'alteredClassification') {
            this.setState({
                alteredClassification: this.refs[ref].getValue(),
                resetAlteredClassification: false
            }, () => {
                // Remove highlighting of modified classification selection dropdown menu
                // when the selected option is changed
                document.querySelector('.altered-classification select').classList.remove('form-control-info');
            });
        } else if (ref === 'reasons') {
            this.setState({reasons: this.refs[ref].getValue()}, () => {
                // Remove highlighting of modified classification selection dropdown menu
                // when the selected option is changed
                document.querySelector('.altered-classification-reasons textarea').classList.remove('form-control-info');
            });
        } else if (ref === 'classification-evidence-summary') {
            this.setState({evidenceSummary: this.refs[ref].getValue()});
        } else if (ref === 'classification-status') {
            this.setState({classificationStatusChecked: !this.state.classificationStatusChecked}, () => {
                if (this.state.classificationStatusChecked) {
                    this.setState({classificationStatus: 'Provisional'});
                } else {
                    this.setState({classificationStatus: 'In progress'});
                }
            });
        }
    },

    handleReplicatedOverTime: function() {
        let replicatedOverTime = this.state.replicatedOverTime;
        if (!replicatedOverTime) {
            replicatedOverTime = true;
        } else {
            replicatedOverTime = false;
        }
        this.setState({replicatedOverTime: replicatedOverTime}, this.calculateClassifications(this.state.totalScore, replicatedOverTime));
    },

    familyScraper: function(user, families, annotation, segregationCount, segregationPoints, individualMatched) {
        // function for looping through family (of GDM or of group) and finding all relevent information needed for score calculations
        // returns dictionary of relevant items that need to be updated within NewCalculation()
        families.forEach(family => {
            // get segregation of family, but only if it was made by user (may change later - MC)
            let curatorAffiliation = this.props.affiliation && Object.keys(this.props.affiliation).length;
            if ((family.affiliation && curatorAffiliation && family.segregation && family.affiliation === curatorAffiliation.affiliation_id)
                || (!family.affiliation && !curatorAffiliation && family.segregation && family.submitted_by.uuid === user)) {
                // get lod score of segregation of family
                if (family.segregation.includeLodScoreInAggregateCalculation) {
                    if ("lodPublished" in family.segregation && family.segregation.lodPublished === true && family.segregation.publishedLodScore) {
                        segregationCount += 1;
                        segregationPoints += family.segregation.publishedLodScore;
                    } else if ("lodPublished" in family.segregation && family.segregation.lodPublished === false && family.segregation.estimatedLodScore) {
                        segregationCount += 1;
                        segregationPoints += family.segregation.estimatedLodScore;
                    }
                }
            }
            // get proband individuals of family
            if (family.individualIncluded && family.individualIncluded.length) {
                individualMatched = this.individualScraper(family.individualIncluded, individualMatched);
            }
        });

        return {
            segregationCount: segregationCount,
            segregationPoints: segregationPoints,
            individualMatched: individualMatched
        };
    },

    individualScraper: function(individuals, individualMatched) {
        if (individuals) {
            individuals.forEach(individual => {
                if (individual.proband === true && (individual.scores && individual.scores.length)) {
                    individualMatched.push(individual);
                }
            });
        }
        return individualMatched;
    },

    calculateScoreTable: function() {
        // Generate a new summary for url ../provisional-curation/?gdm=GDMId&calculate=yes
        // Calculation rules are defined by Small GCWG. See ClinGen_Interface_4_2015.pptx and Clinical Validity Classifications for detail
        let gdm = this.state.gdm;
        let scoreTableValues = this.state.scoreTableValues;
        let contradictingEvidence = this.state.contradictingEvidence;
        let curatorAffiliation = this.props.affiliation && Object.keys(this.props.affiliation).length;

        const MAX_SCORE_CONSTANTS = {
            VARIANT_IS_DE_NOVO: 12,
            PREDICTED_OR_PROVEN_NULL_VARIANT: 10,
            OTHER_VARIANT_TYPE_WITH_GENE_IMPACT: 7,
            AUTOSOMAL_RECESSIVE: 12,
            SEGREGATION: 3,
            CASE_CONTROL: 12,
            FUNCTIONAL: 2,
            FUNCTIONAL_ALTERATION: 2,
            MODELS_RESCUE: 4,
            GENETIC_EVIDENCE: 12,
            EXPERIMENTAL_EVIDENCE: 6,
            TOTAL: 18
        };

        /*****************************************************/
        /* Find all proband individuals that had been scored */
        /*****************************************************/
        let probandTotal = []; // all probands
        var proband_variants = [];
        let tempFamilyScraperValues = {};
        let caseControlTotal = [];

        // scan gdm
        let annotations = gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
        annotations.forEach(annotation => {
            let groups, families, individuals, experimentals;
            let individualMatched = [];

            // loop through groups
            groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
            groups.forEach(group => {
                // loop through families using FamilyScraper
                families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
                tempFamilyScraperValues = this.familyScraper(this.state.user, families, annotation, scoreTableValues['segregationCount'], scoreTableValues['segregationPoints'], individualMatched);
                scoreTableValues['segregationCount'] = tempFamilyScraperValues['segregationCount'];
                scoreTableValues['segregationPoints'] = tempFamilyScraperValues['segregationPoints'];
                individualMatched = tempFamilyScraperValues['individualMatched'];
                // get proband individuals of group
                if (group.individualIncluded && group.individualIncluded.length) {
                    individualMatched = this.individualScraper(group.individualIncluded, individualMatched);
                }
            });

            // loop through families using FamilyScraper
            families = annotation.families && annotation.families.length ? annotation.families : [];
            tempFamilyScraperValues = this.familyScraper(this.state.user, families, annotation, scoreTableValues['segregationCount'], scoreTableValues['segregationPoints'], individualMatched);
            scoreTableValues['segregationCount'] = tempFamilyScraperValues['segregationCount'];
            scoreTableValues['segregationPoints'] = tempFamilyScraperValues['segregationPoints'];
            individualMatched = tempFamilyScraperValues['individualMatched'];

            // push all matched individuals from families and families of groups to probandTotal
            individualMatched.forEach(item => {
                probandTotal.push(item);
            });

            // loop through individuals
            if (annotation.individuals && annotation.individuals.length) {
                // get proband individuals
                individualMatched = [];
                individualMatched = this.individualScraper(annotation.individuals, individualMatched);
                // push all matched individuals to probandTotal
                individualMatched.forEach(item => {
                    probandTotal.push(item);
                });
            }

            // loop through case-controls
            let caseControlMatched = [];
            if (annotation.caseControlStudies && annotation.caseControlStudies.length) {
                annotation.caseControlStudies.forEach(caseControl => {
                    if (caseControl.scores && caseControl.scores.length) {
                        caseControl.scores.forEach(score => {
                            if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id)
                                || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === this.state.user)) {
                                if ('score' in score && score.score !== 'none') {
                                    scoreTableValues['caseControlCount'] += 1;
                                    scoreTableValues['caseControlPoints'] += parseFloat(score.score);
                                }
                            }
                        });
                    }
                });
            }

            // loop through experimentals
            experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
            experimentals.forEach(experimental => {
                // loop through scores, if any
                if (experimental.scores && experimental.scores.length) {
                    experimental.scores.forEach(score => {
                        // only care about scores made by current user
                        if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id)
                            || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === this.state.user)) {
                            if (score.scoreStatus === 'Score') {
                                // parse score of experimental
                                let experimentalScore = 0;
                                if ('score' in score && score.score !== 'none') {
                                    experimentalScore = parseFloat(score.score); // Use the score selected by curator (if any)
                                } else if ('calculatedScore' in score && score.calculatedScore !== 'none') {
                                    experimentalScore = parseFloat(score.calculatedScore); // Otherwise, use default score (if any)
                                }

                                // assign score to correct sub-type depending on experiment type and other variables
                                if (experimental.evidenceType && experimental.evidenceType === 'Biochemical Function') {
                                    scoreTableValues['biochemicalFunctionCount'] += 1;
                                    scoreTableValues['biochemicalFunctionPoints'] += experimentalScore;
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Protein Interactions') {
                                    scoreTableValues['proteinInteractionsCount'] += 1;
                                    scoreTableValues['proteinInteractionsPoints'] += experimentalScore;
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Expression') {
                                    scoreTableValues['expressionCount'] += 1;
                                    scoreTableValues['expressionPoints'] += experimentalScore;
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Functional Alteration') {
                                    if (experimental.functionalAlteration.functionalAlterationType
                                        && experimental.functionalAlteration.functionalAlterationType === 'Patient cells') {
                                        scoreTableValues['patientCellsCount'] += 1;
                                        scoreTableValues['patientCellsPoints'] += experimentalScore;
                                    } else if (experimental.functionalAlteration.functionalAlterationType
                                        && experimental.functionalAlteration.functionalAlterationType === 'Non-patient cells') {
                                        scoreTableValues['nonPatientCellsCount'] += 1;
                                        scoreTableValues['nonPatientCellsPoints'] += experimentalScore;
                                    }
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Model Systems') {
                                    if (experimental.modelSystems.modelSystemsType
                                        && experimental.modelSystems.modelSystemsType === 'Non-human model organism') {
                                        scoreTableValues['nonHumanModelCount'] += 1;
                                        scoreTableValues['nonHumanModelPoints'] += experimentalScore;
                                    } else if (experimental.modelSystems.modelSystemsType
                                        && experimental.modelSystems.modelSystemsType === 'Cell culture model') {
                                        scoreTableValues['cellCultureCount'] += 1;
                                        scoreTableValues['cellCulturePoints'] += experimentalScore;
                                    }
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Rescue') {
                                    if (experimental.rescue.rescueType
                                        && experimental.rescue.rescueType === 'Human') {
                                        scoreTableValues['rescueHumanModelCount'] += 1;
                                        scoreTableValues['rescueHumanModelPoints'] += experimentalScore;
                                    } else if (experimental.rescue.rescueType
                                        && experimental.rescue.rescueType === 'Non-human model organism') {
                                        scoreTableValues['rescueNonHumanModelCount'] += 1;
                                        scoreTableValues['rescueNonHumanModelPoints'] += experimentalScore;
                                    } else if (experimental.rescue.rescueType
                                        && experimental.rescue.rescueType === 'Cell culture model') {
                                        scoreTableValues['rescueCellCultureCount'] += 1;
                                        scoreTableValues['rescueCellCulturePoints'] += experimentalScore;
                                    } else if (experimental.rescue.rescueType
                                        && experimental.rescue.rescueType === 'Patient cells') {
                                        scoreTableValues['rescuePatientCellsCount'] += 1;
                                        scoreTableValues['rescuePatientCellsPoints'] += experimentalScore;
                                    }
                                }
                            } else if (score.scoreStatus === 'Contradicts') {
                                // set flag if a contradicting experimental evidence is found
                                contradictingEvidence.experimental = true;
                            }
                        }
                    });
                }
            });
        });

        // scan probands
        probandTotal.forEach(proband => {
            proband.scores.forEach(score => {
                if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id)
                    || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === this.state.user)) {
                    if (score.scoreStatus === 'Score') {
                        // parse proband score
                        let probandScore = 0;
                        if ('score' in score && score.score !== 'none') {
                            probandScore += parseFloat(score.score);
                        } else if ('calculatedScore' in score && score.calculatedScore !== 'none') {
                            probandScore += parseFloat(score.calculatedScore);
                        }
                        // assign score to correct sub-type depending on score type
                        if (score.caseInfoType && score.caseInfoType === 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT' && score.scoreStatus === 'Score') {
                            scoreTableValues['probandOtherVariantCount'] += 1;
                            scoreTableValues['probandOtherVariantPoints'] += probandScore;
                        } else if (score.caseInfoType && score.caseInfoType === 'PREDICTED_OR_PROVEN_NULL_VARIANT' && score.scoreStatus === 'Score') {
                            scoreTableValues['probandNullVariantCount'] += 1;
                            scoreTableValues['probandNullVariantPoints'] += probandScore;
                        } else if (score.caseInfoType && score.caseInfoType === 'VARIANT_IS_DE_NOVO' && score.scoreStatus === 'Score') {
                            scoreTableValues['variantDenovoCount'] += 1;
                            scoreTableValues['variantDenovoPoints'] += probandScore;
                        } else if (score.caseInfoType && score.caseInfoType === 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS' && score.scoreStatus === 'Score') {
                            scoreTableValues['twoVariantsNotProvenCount'] += 1;
                            scoreTableValues['twoVariantsNotProvenPoints'] += probandScore;
                        } else if (score.caseInfoType && score.caseInfoType === 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO' && score.scoreStatus === 'Score') {
                            scoreTableValues['twoVariantsProvenCount'] += 1;
                            scoreTableValues['twoVariantsProvenPoints'] += probandScore;
                        }
                    } else if (score.scoreStatus === 'Contradicts') {
                        // set flag if a contradicting proband evidence is found
                        contradictingEvidence.proband = true;
                    }
                }
            });
        });

        // calculate segregation counted points
        scoreTableValues['segregationPoints'] = Math.round((scoreTableValues['segregationPoints'] + 0.00001) * 100) / 100;
        if (scoreTableValues['segregationPoints'] >= 0.75 && scoreTableValues['segregationPoints'] <= 0.99) {
            scoreTableValues['segregationPointsCounted'] = 1;
        } else if (scoreTableValues['segregationPoints'] >= 1 && scoreTableValues['segregationPoints'] <= 1.24) {
            scoreTableValues['segregationPointsCounted'] = .5;
        } else if (scoreTableValues['segregationPoints'] >= 1.25 && scoreTableValues['segregationPoints'] <= 1.49) {
            scoreTableValues['segregationPointsCounted'] = 2.5;
        } else if (scoreTableValues['segregationPoints'] >= 1.5 && scoreTableValues['segregationPoints'] <= 1.74) {
            scoreTableValues['segregationPointsCounted'] = 3;
        } else if (scoreTableValues['segregationPoints'] >= 1.75) {
            scoreTableValues['segregationPointsCounted'] = MAX_SCORE_CONSTANTS.SEGREGATION;
        }

        // calculate other counted points
        let tempPoints = 0;

        scoreTableValues['probandOtherVariantPointsCounted'] = scoreTableValues['probandOtherVariantPoints'] < MAX_SCORE_CONSTANTS.OTHER_VARIANT_TYPE_WITH_GENE_IMPACT ? scoreTableValues['probandOtherVariantPoints'] : MAX_SCORE_CONSTANTS.OTHER_VARIANT_TYPE_WITH_GENE_IMPACT;

        scoreTableValues['probandNullVariantPointsCounted'] = scoreTableValues['probandNullVariantPoints'] < MAX_SCORE_CONSTANTS.PREDICTED_OR_PROVEN_NULL_VARIANT ? scoreTableValues['probandNullVariantPoints'] : MAX_SCORE_CONSTANTS.PREDICTED_OR_PROVEN_NULL_VARIANT;

        scoreTableValues['variantDenovoPointsCounted'] = scoreTableValues['variantDenovoPoints'] < MAX_SCORE_CONSTANTS.VARIANT_IS_DE_NOVO ? scoreTableValues['variantDenovoPoints'] : MAX_SCORE_CONSTANTS.VARIANT_IS_DE_NOVO;

        tempPoints = scoreTableValues['twoVariantsProvenPoints'] + scoreTableValues['twoVariantsNotProvenPoints'];
        scoreTableValues['autosomalRecessivePointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.AUTOSOMAL_RECESSIVE ? tempPoints : MAX_SCORE_CONSTANTS.AUTOSOMAL_RECESSIVE;

        scoreTableValues['caseControlPointsCounted'] = scoreTableValues['caseControlPoints'] < MAX_SCORE_CONSTANTS.CASE_CONTROL ? scoreTableValues['caseControlPoints'] : MAX_SCORE_CONSTANTS.CASE_CONTROL;

        tempPoints = scoreTableValues['biochemicalFunctionPoints'] + scoreTableValues['proteinInteractionsPoints'] + scoreTableValues['expressionPoints'];
        scoreTableValues['functionalPointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL;

        tempPoints = scoreTableValues['patientCellsPoints'] + scoreTableValues['nonPatientCellsPoints'];
        scoreTableValues['functionalAlterationPointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION;

        tempPoints = scoreTableValues['nonHumanModelPoints'] + scoreTableValues['cellCulturePoints'] + scoreTableValues['rescueHumanModelPoints'] + scoreTableValues['rescueNonHumanModelPoints']
                    + scoreTableValues['rescueCellCulturePoints'] + scoreTableValues['rescuePatientCellsPoints'];
        scoreTableValues['modelsRescuePointsCounted'] = tempPoints < MAX_SCORE_CONSTANTS.MODELS_RESCUE ? tempPoints : MAX_SCORE_CONSTANTS.MODELS_RESCUE;

        tempPoints = scoreTableValues['probandOtherVariantPointsCounted'] + scoreTableValues['probandNullVariantPointsCounted'] + scoreTableValues['variantDenovoPointsCounted'] + scoreTableValues['autosomalRecessivePointsCounted'] + scoreTableValues['segregationPointsCounted'] + scoreTableValues['caseControlPointsCounted'];
        scoreTableValues['geneticEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE ? parseFloat(tempPoints).toFixed(2) : MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE;

        tempPoints = scoreTableValues['functionalPointsCounted'] + scoreTableValues['functionalAlterationPointsCounted'] + scoreTableValues['modelsRescuePointsCounted'];
        scoreTableValues['experimentalEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE ? parseFloat(tempPoints).toFixed(2) : MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE;

        let totalScore = parseFloat(scoreTableValues['geneticEvidenceTotalPoints']) + parseFloat(scoreTableValues['experimentalEvidenceTotalPoints']);

        // set scoreTabValues state
        this.setState({totalScore: parseFloat(totalScore).toFixed(2), contradictingEvidence: contradictingEvidence, scoreTableValues: scoreTableValues});

        // set classification
        this.calculateClassifications(totalScore, this.state.replicatedOverTime);
    },

    calculateClassifications: function(totalPoints, replicatedOverTime) {
        let autoClassification = "No Classification";
        if (totalPoints >= 1 && totalPoints <= 6) {
            autoClassification = "Limited";
        } else if (totalPoints > 6 && totalPoints <= 11) {
            autoClassification = "Moderate";
        } else if (totalPoints > 11 && totalPoints <= 18 && !replicatedOverTime) {
            autoClassification = "Strong";
        } else if (totalPoints > 11 && totalPoints <= 18 && replicatedOverTime) {
            autoClassification = "Definitive";
        }
        this.setState({autoClassification: autoClassification}, () => {
            // Reset modified classification state to 'No Modification'
            // if the new and current calculated classification is the same
            if (this.state.alteredClassification === this.state.autoClassification) {
                this.setState({
                    alteredClassification: 'No Modification',
                    resetAlteredClassification: true
                });
            }
        });
    },

    render: function() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        let calculate = queryKeyValue('calculate', this.props.href);
        let edit = queryKeyValue('edit', this.props.href);
        let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        let gdm = this.state.gdm ? this.state.gdm : null;
        let autoClassification = this.state.autoClassification;
        let scoreTableValues = this.state.scoreTableValues;

        let show_clsfctn = queryKeyValue('classification', this.props.href);
        let summaryMatrix = queryKeyValue('summarymatrix', this.props.href);
        let expMatrix = queryKeyValue('expmatrix', this.props.href);

        // set the 'Current Classification' appropriately only if previous provisional exists
        let provisional = this.state.provisional;
        let currentClassification = 'None';
        if (provisional.last_modified) {
            if (provisional.alteredClassification && provisional.alteredClassification !== 'No Modification') {
                currentClassification = provisional.alteredClassification;
            } else {
                currentClassification = provisional.autoClassification ? provisional.autoClassification : this.state.autoClassification;
            }
        }
        return (
            <div>
                { show_clsfctn === 'display' ?
                    <div>{ClassificationDefinition()}</div>
                    :
                    ( gdm ?
                        <div>
                            <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} summaryPage={true} linkGdm={true} />
                            <div className="container summary-provisional-classification-wrapper">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <PanelGroup accordion>
                                        <Panel title="Calculated Classification Matrix" open>
                                            <div className="form-group">
                                                <div className="summary-matrix-wrapper">
                                                    <table className="summary-matrix">
                                                        <tbody>
                                                            <tr className="header large bg-gray separator-below">
                                                                <td colSpan="5">Evidence Type</td>
                                                                <td>Count</td>
                                                                <td>Total Points</td>
                                                                <td>Points Counted</td>
                                                            </tr>
                                                            <tr>
                                                                <td rowSpan="8" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
                                                                <td rowSpan="6" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
                                                                <td rowSpan="5" className="header"><div className="rotate-text"><div>Variant</div></div></td>
                                                                <td rowSpan="3" className="header">Autosomal Dominant OR X-linked Disorder</td>
                                                                <td>Proband with other variant type with some evidence of gene impact</td>
                                                                <td>{scoreTableValues['probandOtherVariantCount']}</td>
                                                                <td>{scoreTableValues['probandOtherVariantPoints']}</td>
                                                                <td>{scoreTableValues['probandOtherVariantPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Proband with predicted or proven null variant</td>
                                                                <td>{scoreTableValues['probandNullVariantCount']}</td>
                                                                <td>{scoreTableValues['probandNullVariantPoints']}</td>
                                                                <td>{scoreTableValues['probandNullVariantPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Variant is <i>de novo</i></td>
                                                                <td>{scoreTableValues['variantDenovoCount']}</td>
                                                                <td>{scoreTableValues['variantDenovoPoints']}</td>
                                                                <td>{scoreTableValues['variantDenovoPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td rowSpan="2" className="header">Autosomal Recessive Disorder</td>
                                                                <td>Two variants (not predicted/proven null) with some evidence of gene impact in <i>trans</i></td>
                                                                <td>{scoreTableValues['twoVariantsNotProvenCount']}</td>
                                                                <td>{scoreTableValues['twoVariantsNotProvenPoints']}</td>
                                                                <td rowSpan="2">{scoreTableValues['autosomalRecessivePointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Two variants in <i>trans</i> and at least one <i>de novo</i> or a predicted/proven null variant</td>
                                                                <td>{scoreTableValues['twoVariantsProvenCount']}</td>
                                                                <td>{scoreTableValues['twoVariantsProvenPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="3" className="header">Segregation</td>
                                                                <td>{scoreTableValues['segregationCount']}</td>
                                                                <td><span>{scoreTableValues['segregationPointsCounted']}</span> (<abbr title="Combined LOD Score"><span>{scoreTableValues['segregationPoints']}</span><strong>*</strong></abbr>)</td>
                                                                <td>{scoreTableValues['segregationPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="4" className="header">Case-Control</td>
                                                                <td>{scoreTableValues['caseControlCount']}</td>
                                                                <td>{scoreTableValues['caseControlPoints']}</td>
                                                                <td>{scoreTableValues['caseControlPointsCounted']}</td>
                                                            </tr>
                                                            <tr className="header separator-below">
                                                                <td colSpan="6">Genetic Evidence Total</td>
                                                                <td>{scoreTableValues['geneticEvidenceTotalPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td rowSpan="12" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
                                                                <td colSpan="3" rowSpan="3" className="header">Functional</td>
                                                                <td>Biochemical Functions</td>
                                                                <td>{scoreTableValues['biochemicalFunctionCount']}</td>
                                                                <td>{scoreTableValues['biochemicalFunctionPoints']}</td>
                                                                <td rowSpan="3">{scoreTableValues['functionalPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Protein Interactions</td>
                                                                <td>{scoreTableValues['proteinInteractionsCount']}</td>
                                                                <td>{scoreTableValues['proteinInteractionsPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Expression</td>
                                                                <td>{scoreTableValues['expressionCount']}</td>
                                                                <td>{scoreTableValues['expressionPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
                                                                <td>Patient cells</td>
                                                                <td>{scoreTableValues['patientCellsCount']}</td>
                                                                <td>{scoreTableValues['patientCellsPoints']}</td>
                                                                <td rowSpan="2">{scoreTableValues['functionalAlterationPointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Non-patient cells</td>
                                                                <td>{scoreTableValues['nonPatientCellsCount']}</td>
                                                                <td>{scoreTableValues['nonPatientCellsPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="3" rowSpan="2" className="header">Models</td>
                                                                <td>Non-human model organism</td>
                                                                <td>{scoreTableValues['nonHumanModelCount']}</td>
                                                                <td>{scoreTableValues['nonHumanModelPoints']}</td>
                                                                <td rowSpan="6">{scoreTableValues['modelsRescuePointsCounted']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Cell culture model</td>
                                                                <td>{scoreTableValues['cellCultureCount']}</td>
                                                                <td>{scoreTableValues['cellCulturePoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="3" rowSpan="4" className="header">Rescue</td>
                                                                <td>Rescue in human</td>
                                                                <td>{scoreTableValues['rescueHumanModelCount']}</td>
                                                                <td>{scoreTableValues['rescueHumanModelPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Rescue in non-human model organism</td>
                                                                <td>{scoreTableValues['rescueNonHumanModelCount']}</td>
                                                                <td>{scoreTableValues['rescueNonHumanModelPoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Rescue in cell culture model</td>
                                                                <td>{scoreTableValues['rescueCellCultureCount']}</td>
                                                                <td>{scoreTableValues['rescueCellCulturePoints']}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Rescue in patient cells</td>
                                                                <td>{scoreTableValues['rescuePatientCellsCount']}</td>
                                                                <td>{scoreTableValues['rescuePatientCellsPoints']}</td>
                                                            </tr>
                                                            <tr className="header separator-below">
                                                                <td colSpan="6">Experimental Evidence Total</td>
                                                                <td>{scoreTableValues['experimentalEvidenceTotalPoints']}</td>
                                                            </tr>
                                                            <tr className="total-row header">
                                                                <td colSpan="7">Total Points</td>
                                                                <td>{this.state.totalScore}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <strong>*</strong> &ndash; Combined LOD Score
                                                </div>
                                                <div className="summary-provisional-classification-description">
                                                    <p className="alert alert-warning">
                                                        <i className="icon icon-exclamation-circle"></i> The <strong>Total Points</strong> shown above are based on the set of saved evidence and accompanying scores existing
                                                        when the "View Classification Matrix" button was clicked. To save a Classification for this Gene Disease Record based on this evidence, please see the section below.
                                                    </p>
                                                </div>
                                                <div className="provisional-classification-wrapper">
                                                    <table className="summary-matrix">
                                                        <tbody>
                                                            <tr className="header large bg-gray">
                                                                <td colSpan="5">Gene/Disease Pair</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Assertion Criteria</td>
                                                                <td>Genetic Evidence (0-12 points)</td>
                                                                <td>Experimental Evidence (0-6 points)</td>
                                                                <td>Total Points (0-18 points)</td>
                                                                <td>Replication Over Time (Yes/No)</td>
                                                            </tr>
                                                            <tr className="header large bg-gray separator-below">
                                                                <td>Assigned Points</td>
                                                                <td>{scoreTableValues['geneticEvidenceTotalPoints']}</td>
                                                                <td>{scoreTableValues['experimentalEvidenceTotalPoints']}</td>
                                                                <td>{this.state.totalScore}</td>
                                                                <td>
                                                                    <input type="checkbox" className="checkbox" onChange={this.handleReplicatedOverTime} checked={this.state.replicatedOverTime} />
                                                                </td>
                                                            </tr>
                                                            <tr className="header large">
                                                                <td colSpan="3" rowSpan="4">Calculated Classification</td>
                                                                <td className={autoClassification === 'Limited' ? ' bg-emphasis' : null}>LIMITED</td>
                                                                <td className={autoClassification === 'Limited' ? ' bg-emphasis' : null}>1-6</td>
                                                            </tr>
                                                            <tr className={"header large" + (autoClassification === 'Moderate' ? ' bg-emphasis' : null)}>
                                                                <td>MODERATE</td>
                                                                <td>7-11</td>
                                                            </tr>
                                                            <tr className={"header large" + (autoClassification === 'Strong' ? ' bg-emphasis' : null)}>
                                                                <td>STRONG</td>
                                                                <td>12-18</td>
                                                            </tr>
                                                            <tr className={"header large" + (autoClassification === 'Definitive' ? ' bg-emphasis' : null)}>
                                                                <td>DEFINITIVE</td>
                                                                <td>12-18 & Replicated Over Time</td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="2" className="header large">Contradictory Evidence?</td>
                                                                <td colSpan="3">
                                                                    Proband: <strong>{this.state.contradictingEvidence.proband ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                                                                    {/*Case-control: <strong>{this.state.contradictingEvidence.caseControl ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;*/}
                                                                    Experimental: <strong>{this.state.contradictingEvidence.experimental ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td colSpan="5">
                                                                    <a name="classification-view" id="classification-view"></a>
                                                                    <div className="col-md-12 classification-form-content-wrapper">
                                                                        <div className="col-xs-12 col-sm-6">
                                                                            <div className="altered-classification">
                                                                                <Input type="select" ref="alteredClassification"
                                                                                    label={<strong>Modify Calculated <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</strong>}
                                                                                    error={this.getFormError('alteredClassification')} clearError={this.clrFormErrors.bind(null, 'alteredClassification')}
                                                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                                                                    defaultValue={this.state.alteredClassification} handleChange={this.handleChange}>
                                                                                    <option value="No Modification">No Modification</option>
                                                                                    {autoClassification === 'Definitive' ? null : <option value="Definitive">Definitive</option>}
                                                                                    {autoClassification === 'Strong' ? null : <option value="Strong">Strong</option>}
                                                                                    {autoClassification === 'Moderate' ? null : <option value="Moderate">Moderate</option>}
                                                                                    {autoClassification === 'Limited' ? null : <option value="Limited">Limited</option>}
                                                                                    <option value="Disputed">Disputed</option>
                                                                                    <option value="Refuted">Refuted</option>
                                                                                    <option value="No Reported Evidence">No Reported Evidence (calculated score is based on Experimental evidence only)</option>
                                                                                </Input>
                                                                            </div>
                                                                            <div className="altered-classification-reasons">
                                                                                <Input type="textarea" ref="reasons" rows="5" label="Explain Reason(s) for Change" labelClassName="col-sm-5 control-label"
                                                                                    wrapperClassName="col-sm-7" groupClassName="form-group" error={this.getFormError('reasons')} value={this.state.reasons}
                                                                                    clearError={this.clrFormErrors.bind(null, 'reasons')} handleChange={this.handleChange}
                                                                                    required={this.state.alteredClassification !== 'No Modification' ? true : false}
                                                                                    customErrorMsg="Required when changing classification" />
                                                                                {this.state.resetAlteredClassification ?
                                                                                    <div className="altered-classification-reset-warning">
                                                                                        <div className="alert alert-danger">
                                                                                            <i className="icon icon-exclamation-triangle"></i> This value has been reset to "No Modification" as the Calculated Classification based on the new
                                                                                            Total Points is now equivalent to your last saved Classification value. Click "Save" to save the Calculated Classification value, or modify to a new
                                                                                            value and click "Save."
                                                                                        </div>
                                                                                    </div>
                                                                                    : null}
                                                                            </div>
                                                                        </div>
                                                                        <div className="col-xs-12 col-sm-6">
                                                                            <div className="classification-status">
                                                                                <span>Mark status as "Provisional Classification" <i>(optional)</i>:</span>
                                                                                <Input type="checkbox" ref="classification-status" checked={this.state.classificationStatusChecked} handleChange={this.handleChange}
                                                                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-1" groupClassName="form-group" />
                                                                            </div>
                                                                            <div className="classification-evidence-summary">
                                                                                <Input type="textarea" ref="classification-evidence-summary" label="Evidence Summary:"
                                                                                    value={this.state.evidenceSummary} handleChange={this.handleChange}
                                                                                    placeholder="Summary of the evidence and rationale for the clinical validity classification (optional)." rows="5"
                                                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr className="total-row header">
                                                                <td colSpan="2">Last Saved Summary Classification</td>
                                                                <td colSpan="4">
                                                                    {currentClassification == 'None' ?
                                                                        <span>{currentClassification}</span>
                                                                        :
                                                                        <div>{currentClassification}
                                                                            <br />
                                                                            <span className="large">({moment(provisional.last_modified).format("YYYY MMM DD, h:mm a")})</span>
                                                                        </div>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div>
                                                    {Object.keys(provisional).length ?
                                                        <p className="alert alert-info">
                                                            <i className="icon icon-info-circle"></i> Click Save to save the Calculated Classification (highlighted in blue) without modification, or modify the
                                                            Classification value in the pull-down and hit Save. You may also choose to mark your Classification as Provisional.                                                      
                                                        </p>
                                                        :
                                                        <p className="alert alert-info">
                                                            <i className="icon icon-info-circle"></i> The above Classification Matrix was calculated based on the current evidence and accompanying scores saved in the database
                                                            when you clicked the "View Classification Matrix" button to navigate to this page. To save a new Classification based on this current evidence, please fill in
                                                            the fields above and click "Save". Otherwise, click "Cancel".
                                                        </p>
                                                    }
                                                </div>
                                            </div>
                                        </Panel>
                                    </PanelGroup>
                                    <div className='modal-footer'>
                                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                                        <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                                    </div>
                                </Form>
                            </div>
                        </div>
                        :
                        null
                    )
                }
            </div>
        );
    }
});

curator_page.register(ProvisionalCuration,  'curator_page', 'provisional-curation');

// Description of 4 leves of classification in summary table
// the below 4 functions are not being used anywhere. Commenting out for backup
// purposes. Perhaps remove in the next re-visit of this page. - MC
/*
var LimitedClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">LIMITED CLASSIFICATION</p>
            <p>There is <strong>limited</strong> evidence to support a causal role for this gene in this disease, such as:</p>
            <ul>
                <li>Fewer than three observations of variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Multiple variants reported in unrelated probands but <i>without</i> sufficient evidence that the variants alter function</li>
                <li>Limited experimental data&sup2; supporting the gene-disease association</li>
            </ul>
            <p>The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged that contradicts the role of the gene in the noted disease.</p>
        </div>
    );
};

var ModerateClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">MODERATE CLASSIFICATION</p>
            <p>There is <strong>moderate</strong> evidence to support a causal role for this gene in this diseaese, such as:</p>
            <ul>
                <li>At least 3 unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Moderate experimental data&sup2; supporting the gene-disease association</li>
            </ul>
            <p>The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged that contradicts the role of the gene in the noded disease.</p>
        </div>
    );
};

var StrongClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">STRONG CLASSIFICATION</p>
            <p>
                The role of this gene in disease has been independently demonstrated in at least two separate studies providing&nbsp;
                <strong>strong</strong> supporting evidence for this gene&#39;s role in disease, such as the following types of evidence:
            </p>
            <ul>
                <li>Strong variant-level evidence demonstrating numerous unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Compelling gene-level evidence from different types of supporting experimental data&sup2;.</li>
            </ul>
            <p>In addition, no convincing evidence has emerged that contradicts the role of the gene in the noted disease.</p>
        </div>
    );
};

var DefinitiveClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">DEFINITIVE CLASSIFICATION</p>
            <p>
                The role of this gene in this particular disease hase been repeatedly demonstrated in both the research and clinical
                diagnostic settings, and has been upheld over time (in general, at least 3 years). No convincing evidence has emerged
                that contradicts the role of the gene in the specified disease.
            </p>
        </div>
    );
};
*/

// Display a history item for adding a family
class ProvisionalAddModHistory extends Component {
    render() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;
        var provisional = history.primary;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> {meta.alteredClassification.toUpperCase()} added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                {provisional.affiliation ?
                    <span>; last edited by {provisional.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(ProvisionalAddModHistory, 'provisionalClassification', 'add');


// Display a history item for modifying a family
class ProvisionalModifyHistory extends Component {
    render() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;
        var provisional = history.primary;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> modified to {meta.alteredClassification.toUpperCase()} for </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                {provisional.affiliation ?
                    <span>; last edited by {provisional.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(ProvisionalModifyHistory, 'provisionalClassification', 'modify');


// Display a history item for deleting a family
class ProvisionalDeleteHistory extends Component {
    render() {
        return <div>PROVISIONALDELETE</div>;
    }
}

history_views.register(ProvisionalDeleteHistory, 'provisionalClassification', 'delete');
