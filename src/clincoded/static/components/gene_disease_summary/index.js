'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { curator_page, userMatch, queryKeyValue, external_url_map } from '../globals';
import { RestMixin } from '../rest';
import GeneDiseaseEvidenceSummaryHeader from './header';
import GeneDiseaseEvidenceSummaryCaseLevel from './case_level';
import GeneDiseaseEvidenceSummarySegregation from './case_level_segregation';
import GeneDiseaseEvidenceSummaryCaseControl from './case_control';
import GeneDiseaseEvidenceSummaryExperimental from './experimental';
import GeneDiseaseEvidenceSummaryClassificationMatrix from './classification_matrix';
import CASE_INFO_TYPES from '../score/constants/case_info_types';

const GeneDiseaseEvidenceSummary = createReactClass({
    /**
     * FIXME: Should try switching to native fetch() Web API
     * when IE 11 supports (e.g. http://caniuse.com/#search=fetch)
     */
    mixins: [RestMixin],

    propTypes: {
        href: PropTypes.string,
        session: PropTypes.object,
        affiliation: PropTypes.object
    },

    getInitialState() {
        return {
            user: null, // Logged-in user uuid
            gdm: null, // The gdm object associated with the eivdence
            provisional: {}, // Logged-in user's existing provisional object
            caseLevelEvidenceList: [],
            segregationEvidenceList: [],
            caseControlEvidenceList: [],
            experimentalEvidenceList: [],
            preview: queryKeyValue('preview', this.props.href)
        };
    },

    componentDidMount() {
        this.loadData();
    },

    componentDidUpdate(prevProps, prevState) {
        // Remove header and notice bar (if any) from DOM
        let siteHeader = document.querySelector('.site-header');
        siteHeader.setAttribute('style', 'display:none');
        let affiliationUtilityBar = document.querySelector('.affiliation-utility-container');
        if (affiliationUtilityBar) {
            affiliationUtilityBar.setAttribute('style', 'display:none');
        }
    },

    loadData() {
        const gdmUuid = queryKeyValue('gdm', this.props.href);
        const snapshotUuid = queryKeyValue('snapshot', this.props.href);
        let uri;
        if (gdmUuid) {
            uri = '/gdm/' + gdmUuid;
        } else if (snapshotUuid) {
            uri = '/snapshot/' + snapshotUuid;
        }
        this.getRestData(uri).then(data => {
            let stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid;
            // Just to be sure that the response is a gdm object
            if (data['@type'][0] === 'gdm') {
                stateObj.gdm = data;
            } else if (data['@type'][0] === 'snapshot') {
                stateObj.gdm = JSON.parse(data.resourceParent);
            }
            // search for provisional owned by login user
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (let provisionalClassification of stateObj.gdm.provisionalClassifications) {
                    let curatorAffiliation = this.props.affiliation;
                    let affiliation = provisionalClassification.affiliation ? provisionalClassification.affiliation : null;
                    let creator = provisionalClassification.submitted_by;
                    if ((affiliation && curatorAffiliation && affiliation === curatorAffiliation.affiliation_id) || (!affiliation && !curatorAffiliation && creator.uuid === stateObj.user)) {
                        stateObj.provisional = provisionalClassification;
                        stateObj.alteredClassification = stateObj.provisional.alteredClassification;
                        stateObj.replicatedOverTime = stateObj.provisional.replicatedOverTime;
                        stateObj.reasons = stateObj.provisional.reasons;
                        break;
                    }
                }
            }
            this.setState(stateObj);
            return Promise.resolve();
        }).then(result => {
            // Once we have the GDM data, invoke other processes such as parsing, calculation and rendering
            const user = this.state.user;
            const gdm = this.state.gdm;
            const annotations = gdm && gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
            const curatorAffiliation = this.props.affiliation;
            // Parse proband evidence and its associated segregation data
            this.parseCaseLevelEvidence(annotations, user, curatorAffiliation);
            // Parse segregation evidence with LOD scores but without proband
            this.parseCaseLevelSegregationEvidence(annotations, user, curatorAffiliation);
            // Parse case-control evidence and its associated disease data
            this.parseCaseControlEvidence(annotations, user, curatorAffiliation);
            // Parse experimental evidence and its associated annotation data
            this.parseExperimentalEvidence(annotations, user, curatorAffiliation);
            // Calculate the values for the score table
            // this.calculateScoreTable();
        }).catch(err => {
            console.log('Error in loading or parsing data =: %o', err);
        });
    },

    /**
     * Method to loop through individuals (of GDM or of group) and find all scored proband evidence
     * @param {array} individuals - a list of individual evidence
     * @param {array} individualMatched - list of scored proband evidence
     */
    individualScraper(individuals, individualMatched) {
        if (individuals && individuals.length) {
            individuals.forEach(individual => {
                if (individual.proband === true && (individual.scores && individual.scores.length)) {
                    individualMatched.push(individual);
                }
            });
        }
        return individualMatched;
    },

    /**
     * Method to loop through families (of GDM or of group) and find all scored proband evidence
     * @param {array} families - a list of family evidence
     * @param {array} individualMatched - list of scored proband evidence
     */
    familyScraper(families, individualMatched) {
        if (families && families.length) {
            families.forEach(family => {
                if (family.segregation && family.individualIncluded && family.individualIncluded.length) {
                    individualMatched = this.individualScraper(family.individualIncluded, individualMatched);
                }
            });
        }
        return individualMatched;
    },

    /**
     * Method to find the scored case level (proband) evidence entries both created
     * by the currently logged-in user or simply just scored by this user
     * @param {array} annotations - a list of annotations in a given gdm
     * @param {string} user - user's uuid
     */
    parseCaseLevelEvidence(annotations, user, curatorAffiliation) {
        let caseLevelEvidenceList = this.state.caseLevelEvidenceList;
        /*****************************************************/
        /* Find all proband individuals that had been scored */
        /*****************************************************/
        let probandTotal = [], tempFamilyScraperValues = [];

        if (annotations.length) {
            annotations.forEach(annotation => {
                let individualMatched = [];
                
                // Iterate groups
                let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
                if (groups && groups.length) {
                    groups.forEach(group => {
                        families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
                        tempFamilyScraperValues = this.familyScraper(families, individualMatched);
                        individualMatched = tempFamilyScraperValues;
                        // get proband individuals of group
                        if (group.individualIncluded && group.individualIncluded.length) {
                            individualMatched = this.individualScraper(group.individualIncluded, individualMatched);
                        }
                    });
                }

                // Iterate families 
                let families = annotation.families && annotation.families.length ? annotation.families : [];
                tempFamilyScraperValues = this.familyScraper(families, individualMatched);
                individualMatched = tempFamilyScraperValues;

                // push all matched individuals from families and families of groups to probandTotal
                individualMatched.forEach(item => {
                    probandTotal.push(item);
                });

                // Iterate individuals
                let individuals = annotation.individuals && annotation.individuals.length ? annotation.individuals : [];
                if (individuals && individuals.length) {
                    // get proband individuals
                    individualMatched = [];
                    individualMatched = this.individualScraper(individuals, individualMatched);
                    // push all matched individuals to probandTotal
                    individualMatched.forEach(item => {
                        probandTotal.push(item);
                    });
                }
            });
        }

        // Iterate probands
        probandTotal.forEach(proband => {
            // Loop through scores, if any
            if (proband.scores && proband.scores.length) {
                proband.scores.forEach(score => {
                    // Only interested in the logged-in user's scores and their associated evidence
                    if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id) || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === user)) {
                        if ('scoreStatus' in score && (score.scoreStatus !== 'none' || score.scoreStatus !== '')) {
                            let caseLevelEvidence = {};
                            let annotation = {}, associatedFamily;
                            // Find the annotation that the proband directly or indirectly belongs to
                            if (proband.associatedAnnotations.length) {
                                annotation = proband.associatedAnnotations[0];
                            } else if (proband.associatedGroups.length) {
                                if (proband.associatedGroups[0].associatedAnnotations.length){
                                    annotation = proband.associatedGroups[0].associatedAnnotations[0];
                                }
                            } else if (proband.associatedFamilies.length) {
                                associatedFamily = proband.associatedFamilies[0];
                                if (proband.associatedFamilies[0].associatedGroups.length) {
                                    if (proband.associatedFamilies[0].associatedGroups[0].associatedAnnotations.length) {
                                        annotation = proband.associatedFamilies[0].associatedGroups[0].associatedAnnotations[0];
                                    }
                                } else if (proband.associatedFamilies[0].associatedAnnotations.length) {
                                    annotation = proband.associatedFamilies[0].associatedAnnotations[0];
                                }
                            }
                            let pubDate = (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                            let segregation = associatedFamily && associatedFamily.segregation ? associatedFamily.segregation : null;
                            // Define object key/value pairs
                            caseLevelEvidence['variantType'] = score.caseInfoType && score.caseInfoType.length ? this.mapVariantType(score.caseInfoType) : '';
                            caseLevelEvidence['variants'] = proband.variants && proband.variants.length ? proband.variants : [];
                            caseLevelEvidence['authors'] = annotation.article.authors;
                            caseLevelEvidence['pmid'] = annotation.article.pmid;
                            caseLevelEvidence['pubYear'] = pubDate[1];
                            caseLevelEvidence['label'] = proband.label ? proband.label : '';
                            caseLevelEvidence['sex'] = proband.sex ? proband.sex : '';
                            caseLevelEvidence['ageType'] = proband.ageType ? proband.ageType : '';
                            caseLevelEvidence['ageValue'] = proband.ageValue ? proband.ageValue : null;
                            caseLevelEvidence['ageUnit'] = proband.ageUnit && proband.ageUnit.length ? proband.ageUnit : '';
                            caseLevelEvidence['ethnicity'] = proband.ethnicity && proband.ethnicity.length ? proband.ethnicity : '';
                            caseLevelEvidence['hpoIdInDiagnosis'] = proband.hpoIdInDiagnosis && proband.hpoIdInDiagnosis.length ? proband.hpoIdInDiagnosis : [];
                            caseLevelEvidence['termsInDiagnosis'] = proband.termsInDiagnosis && proband.termsInDiagnosis.length ? proband.termsInDiagnosis : '';
                            caseLevelEvidence['previousTestingDescription'] = proband.method && proband.method.previousTestingDescription ? proband.method.previousTestingDescription : '';
                            caseLevelEvidence['genotypingMethods'] = proband.method && proband.method.genotypingMethods && proband.method.genotypingMethods.length ? proband.method.genotypingMethods : [];
                            caseLevelEvidence['specificMutationsGenotypedMethod'] = proband.method && proband.method.specificMutationsGenotypedMethod ? proband.method.specificMutationsGenotypedMethod : '';
                            caseLevelEvidence['scoreStatus'] = score.scoreStatus;
                            caseLevelEvidence['defaultScore'] = score.calculatedScore ? score.calculatedScore : null;
                            caseLevelEvidence['modifiedScore'] = score.hasOwnProperty('score') ? score.score : null;
                            caseLevelEvidence['scoreExplanation'] = score.scoreExplanation && score.scoreExplanation.length ? score.scoreExplanation : '';
                            caseLevelEvidence['segregationNumAffected'] = segregation && segregation.numberOfAffectedWithGenotype ? segregation.numberOfAffectedWithGenotype : null;
                            caseLevelEvidence['segregationNumUnaffected'] = segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
                            caseLevelEvidence['segregationPublishedLodScore'] = segregation && segregation.publishedLodScore ? segregation.publishedLodScore : null;
                            caseLevelEvidence['segregationEstimatedLodScore'] = segregation && segregation.estimatedLodScore ? segregation.estimatedLodScore : null;
                            caseLevelEvidence['includeLodScoreInAggregateCalculation'] = segregation && segregation.hasOwnProperty('includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
                            // Put object into array
                            caseLevelEvidenceList.push(caseLevelEvidence);
                            this.setState({caseLevelEvidenceList: caseLevelEvidenceList});
                        }
                    }
                });
            }
        });
    },

    /**
     * Method to loop through families (of GDM or of group) and find all family evidence without proband, or with proband but no score
     * @param {array} families - a list of family evidence
     * @param {array} familyMatched - list of matched family evidence
     */
    segregationScraper(families, familyMatched) {
        if (families && families.length) {
            families.forEach(family => {
                if (family.segregation) {
                    if (family.individualIncluded && family.individualIncluded.length) {
                        family.individualIncluded.forEach(individual => {
                            if (!individual.proband || typeof individual.proband === 'undefined') {
                                familyMatched.push(family);
                            }
                            if (individual.proband && (!individual.scores || (individual.scores && !individual.scores.length))) {
                                familyMatched.push(family);
                            }
                        });
                    }
                    if (!family.individualIncluded || (family.individualIncluded && !family.individualIncluded.length)) {
                        familyMatched.push(family);
                    }
                }
            });
        }
        return familyMatched;
    },

    /**
     * Method to find the case level segregation evidence entries both created
     * by the currently logged-in user and having LOD scores but without proband
     * @param {array} annotations - a list of annotations in a given gdm
     * @param {string} user - user's uuid
     */
    parseCaseLevelSegregationEvidence(annotations, user, curatorAffiliation) {
        let segregationEvidenceList = this.state.segregationEvidenceList;
        let segregationTotal = [], tempSegregationScraperValues = [];
        if (annotations.length) {
            annotations.forEach(annotation => {
                let familyMatched = [];
                // Iterate groups
                let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
                if (groups && groups.length) {
                    groups.forEach(group => {
                        families = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
                        tempSegregationScraperValues = this.segregationScraper(families, familyMatched);
                        familyMatched = tempSegregationScraperValues;
                    });
                }

                // Iterate families and find all segregation without proband
                let families = annotation.families && annotation.families.length ? annotation.families : [];
                tempSegregationScraperValues = this.segregationScraper(families, familyMatched);
                familyMatched = tempSegregationScraperValues;

                // Push all matched families to segregationTotal
                familyMatched.forEach(item => {
                    segregationTotal.push(item);
                });
            });
        }

        // Iterate segregations
        segregationTotal.forEach(family => {
            if ((family.affiliation && curatorAffiliation && family.affiliation === curatorAffiliation.affiliation_id) || (!family.affiliation && !curatorAffiliation && family.submitted_by.uuid === user)) {
                let segregation = family.segregation ? family.segregation : null;
                if (segregation && (segregation.estimatedLodScore || segregation.publishedLodScore)) {
                    let segregationEvidence = {};
                    let annotation = {};
                    // Find the annotation that family directly or indirectly belongs to
                    if (family.associatedAnnotations.length) {
                        annotation = family.associatedAnnotations[0];
                    } else if (family.associatedGroups.length) {
                        if (family.associatedGroups[0].associatedAnnotations.length){
                            annotation = family.associatedGroups[0].associatedAnnotations[0];
                        }
                    }
                    let pubDate = (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                    // Define object key/value pairs
                    segregationEvidence['authors'] = annotation.article.authors;
                    segregationEvidence['pmid'] = annotation.article.pmid;
                    segregationEvidence['pubYear'] = pubDate[1];
                    segregationEvidence['label'] = family.label ? family.label : '';
                    segregationEvidence['ethnicity'] = family.ethnicity ? family.ethnicity : '';
                    segregationEvidence['hpoIdInDiagnosis'] = family.hpoIdInDiagnosis && family.hpoIdInDiagnosis.length ? family.hpoIdInDiagnosis : [];
                    segregationEvidence['termsInDiagnosis'] = family.termsInDiagnosis && family.termsInDiagnosis.length ? family.termsInDiagnosis : '';
                    segregationEvidence['segregationNumAffected'] = segregation.numberOfAffectedWithGenotype ? segregation.numberOfAffectedWithGenotype : null;
                    segregationEvidence['segregationNumUnaffected'] = segregation.numberOfUnaffectedWithoutBiallelicGenotype ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : null;
                    segregationEvidence['segregationPublishedLodScore'] = segregation.publishedLodScore ? segregation.publishedLodScore : null;
                    segregationEvidence['segregationEstimatedLodScore'] = segregation.estimatedLodScore ? segregation.estimatedLodScore : null;
                    segregationEvidence['includeLodScoreInAggregateCalculation'] = segregation && segregation.hasOwnProperty('includeLodScoreInAggregateCalculation') && segregation.includeLodScoreInAggregateCalculation;
                    // Put object into array
                    segregationEvidenceList.push(segregationEvidence);
                    this.setState({segregationEvidenceList: segregationEvidenceList});
                }
            }
        });

        return segregationEvidenceList;
    },

    /**
     * Method to map the score's case info type to their description
     * @param {string} caseInfoType - case info type constant value
     */
    mapVariantType(caseInfoType) {
        let variantTypeDescription;
        const allVariantTypes = CASE_INFO_TYPES.OTHER;
        allVariantTypes.forEach(variant => {
            if (variant.TYPE === caseInfoType) {
                variantTypeDescription = variant.DESCRIPTION;
            }
        });
        return variantTypeDescription;
    },

    /**
     * Method to find the scored case-control evidence entries both created
     * by the currently logged-in user or simply just scored by this user
     * @param {array} annotations - a list of annotations in a given gdm
     * @param {string} user - user's uuid
     */
    parseCaseControlEvidence(annotations, user, curatorAffiliation) {
        let caseControlEvidenceList = this.state.caseControlEvidenceList;
        if (annotations.length) {
            annotations.forEach(annotation => {
                // loop through case-controls
                let caseControlStudies = annotation.caseControlStudies && annotation.caseControlStudies.length ? annotation.caseControlStudies : [];
                if (caseControlStudies && caseControlStudies.length) {
                    caseControlStudies.forEach(caseControl => {
                        // Loop through scores, if any
                        if (caseControl.scores && caseControl.scores.length) {
                            caseControl.scores.forEach(score => {
                                // Only interested in the logged-in user's scores and their associated evidence
                                if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id) || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === user)) {
                                    if ('score' in score && score.score !== 'none') {
                                        let caseControlEvidence = {};

                                        let pubDate = (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                                        // Define object key/value pairs
                                        caseControlEvidence['authors'] = annotation.article.authors;
                                        caseControlEvidence['pmid'] = annotation.article.pmid;
                                        caseControlEvidence['pubYear'] = pubDate[1];
                                        caseControlEvidence['label'] = caseControl.label ? caseControl.label : '';
                                        caseControlEvidence['studyType'] = caseControl.studyType ? caseControl.studyType : '';
                                        caseControlEvidence['detectionMethod'] = caseControl.caseCohort && caseControl.caseCohort.method ? caseControl.caseCohort.method.specificMutationsGenotypedMethod : '';
                                        caseControlEvidence['caseCohort_numberWithVariant'] = typeof caseControl.caseCohort.numberWithVariant === 'number' ? caseControl.caseCohort.numberWithVariant : null;
                                        caseControlEvidence['caseCohort_numberAllGenotypedSequenced'] = typeof caseControl.caseCohort.numberAllGenotypedSequenced === 'number' ? caseControl.caseCohort.numberAllGenotypedSequenced : null;
                                        caseControlEvidence['controlCohort_numberWithVariant'] = typeof caseControl.controlCohort.numberWithVariant === 'number' ? caseControl.controlCohort.numberWithVariant : null;
                                        caseControlEvidence['controlCohort_numberAllGenotypedSequenced'] = typeof caseControl.controlCohort.numberAllGenotypedSequenced === 'number' ? caseControl.controlCohort.numberAllGenotypedSequenced : null;
                                        caseControlEvidence['comments'] = caseControl.comments ? caseControl.comments : '';
                                        caseControlEvidence['explanationForDifference'] = caseControl.explanationForDifference ? caseControl.explanationForDifference : '';
                                        caseControlEvidence['statisticValueType'] = caseControl.statisticalValues[0].valueType ? caseControl.statisticalValues[0].valueType : '';
                                        caseControlEvidence['statisticValueTypeOther'] = caseControl.statisticalValues[0].otherType ? caseControl.statisticalValues[0].otherType : '';
                                        caseControlEvidence['statisticValue'] = caseControl.statisticalValues[0].value ? caseControl.statisticalValues[0].value : null;
                                        caseControlEvidence['pValue'] = caseControl.pValue ? caseControl.pValue : null;
                                        caseControlEvidence['confidenceIntervalFrom'] = caseControl.confidenceIntervalFrom ? caseControl.confidenceIntervalFrom : null;
                                        caseControlEvidence['confidenceIntervalTo'] = caseControl.confidenceIntervalTo ? caseControl.confidenceIntervalTo : null;
                                        caseControlEvidence['score'] = score.hasOwnProperty('score') ? score.score : null;
                                        if (caseControl.caseCohort.commonDiagnosis && caseControl.caseCohort.commonDiagnosis.length) {
                                            const disease = caseControl.caseCohort.commonDiagnosis[0];
                                            caseControlEvidence['diseaseId'] = disease.diseaseId ? disease.diseaseId : null;
                                            caseControlEvidence['diseaseTerm'] = disease.term ? disease.term : '';
                                            caseControlEvidence['diseaseFreetext'] = disease.hasOwnProperty('freetext') ? disease.freetext : false;
                                            caseControlEvidence['diseasePhenotypes'] = disease.phenotypes && disease.phenotypes.length ? disease.phenotypes : [];
                                            // Put object into array
                                            caseControlEvidenceList.push(caseControlEvidence);
                                            this.setState({caseControlEvidenceList: caseControlEvidenceList});
                                        } else {
                                            caseControlEvidence['diseaseId'] = null;
                                            caseControlEvidence['diseaseTerm'] = '';
                                            caseControlEvidence['diseaseFreetext'] = false;
                                            caseControlEvidence['diseasePhenotypes'] = [];
                                            caseControlEvidence['termsInDiagnosis'] = caseControl.caseCohort.termsInDiagnosis && caseControl.caseCohort.termsInDiagnosis.length ? caseControl.caseCohort.termsInDiagnosis : '';
                                            caseControlEvidence['hpoIdInDiagnosis'] = caseControl.caseCohort.hpoIdInDiagnosis && caseControl.caseCohort.hpoIdInDiagnosis.length ? caseControl.caseCohort.hpoIdInDiagnosis : [];
                                            // Put object into array
                                            caseControlEvidenceList.push(caseControlEvidence);
                                            this.setState({caseControlEvidenceList: caseControlEvidenceList});
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }
    },

    /**
     * Method to find the scored experimental evidence (e.g. 'Score', 'Review' or 'Contradicts')
     * entries both created by the currently logged-in user or simply just scored by this user
     * @param {array} annotations - a list of annotations in a given gdm
     * @param {string} user - user's uuid
     */
    parseExperimentalEvidence(annotations, user, curatorAffiliation) {
        let experimentalEvidenceList = this.state.experimentalEvidenceList;

        if (annotations.length) {
            annotations.forEach(annotation => {
                // Loop through experimentals
                let experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
                experimentals.forEach(experimental => {
                    // Loop through scores, if any
                    if (experimental.scores && experimental.scores.length) {
                        experimental.scores.forEach(score => {
                            let experimentalEvidence = {};
                            // Only interested in the logged-in user's scores and their associated evidence
                            if ((score.affiliation && curatorAffiliation && score.affiliation === curatorAffiliation.affiliation_id) || (!score.affiliation && !curatorAffiliation && score.submitted_by.uuid === user)) {
                                if ('scoreStatus' in score && (score.scoreStatus !== 'none' || score.scoreStatus !== '')) {
                                    let pubDate = (/^([\d]{4})(.*?)$/).exec(annotation.article.date);
                                    // Define object key/value pairs
                                    experimentalEvidence['label'] = experimental.label ? experimental.label : '';
                                    experimentalEvidence['evidenceType'] = experimental.evidenceType;
                                    experimentalEvidence['evidenceSubtype'] = this.mapEvidenceSubtype(experimental);
                                    experimentalEvidence['pmid'] = annotation.article.pmid;
                                    experimentalEvidence['pubYear'] = pubDate[1];
                                    experimentalEvidence['authors'] = annotation.article.authors;
                                    experimentalEvidence['explanation'] = this.mapExperimentalEvidenceExplanation(experimental);
                                    experimentalEvidence['scoreStatus'] = score.scoreStatus;
                                    experimentalEvidence['defaultScore'] = score.calculatedScore;
                                    experimentalEvidence['modifiedScore'] = score.hasOwnProperty('score') ? score.score : null;
                                    experimentalEvidence['scoreExplanation'] = score.scoreExplanation && score.scoreExplanation.length ? score.scoreExplanation : '';
                                    // Put object into array
                                    experimentalEvidenceList.push(experimentalEvidence);
                                    this.setState({experimentalEvidenceList: experimentalEvidenceList});
                                }
                            }
                        });
                    }
                });
            });
        }
    },

    /**
     * Method to map the experimental subtype to their corresponding parent type
     * @param {object} evidence - scored experimental evidence
     */
    mapEvidenceSubtype(evidence) {
        let type;
        if (evidence && evidence.evidenceType) {
            switch (evidence.evidenceType) {
                case 'Biochemical Function':
                    type = evidence.biochemicalFunction.geneWithSameFunctionSameDisease && Object.keys(evidence.biochemicalFunction.geneWithSameFunctionSameDisease).length ?
                        'A' : 'B';
                    break;
                case 'Protein Interactions':
                    type = evidence.proteinInteractions.interactionType ? evidence.proteinInteractions.interactionType : null;
                    break;
                case 'Expression':
                    type = evidence.expression.normalExpression && Object.keys(evidence.expression.normalExpression).length ?
                        'A' : 'B';
                    break;
                case 'Functional Alteration':
                    type = evidence.functionalAlteration.functionalAlterationType ? evidence.functionalAlteration.functionalAlterationType : null;
                    break;
                case 'Model Systems':
                    type = evidence.modelSystems.modelSystemsType ? evidence.modelSystems.modelSystemsType : null;
                    break;
                case 'Rescue':
                    type = evidence.rescue.rescueType ? evidence.rescue.rescueType : null;
                    break;
                default:
                    type = '';
            }
        }
        return type;
    },

    /**
     * Method to map the experimental evidence type to their corresponding explanations
     * @param {object} evidence - scored experimental evidence
     */
    mapExperimentalEvidenceExplanation(evidence) {
        let explanation;
        if (evidence && evidence.evidenceType) {
            switch (evidence.evidenceType) {
                case 'Biochemical Function':
                    if (evidence.biochemicalFunction.geneWithSameFunctionSameDisease && Object.keys(evidence.biochemicalFunction.geneWithSameFunctionSameDisease).length) {
                        explanation = evidence.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction ? evidence.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction : '';
                    } else if (evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype && Object.keys(evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype).length) {
                        explanation = evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation ? evidence.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation : '';
                    }
                    break;
                case 'Protein Interactions':
                    explanation = evidence.proteinInteractions.relationshipOfOtherGenesToDisese ? evidence.proteinInteractions.relationshipOfOtherGenesToDisese : null;
                    break;
                case 'Expression':
                    if (evidence.expression.normalExpression && Object.keys(evidence.expression.normalExpression).length) {
                        explanation = evidence.expression.normalExpression.evidence ? evidence.expression.normalExpression.evidence : '';
                    } else if (evidence.expression.alteredExpression && Object.keys(evidence.expression.alteredExpression).length) {
                        explanation = evidence.expression.alteredExpression.evidence ? evidence.expression.alteredExpression.evidence : '';
                    }
                    break;
                case 'Functional Alteration':
                    explanation = evidence.functionalAlteration.evidenceForNormalFunction ? evidence.functionalAlteration.evidenceForNormalFunction : null;
                    break;
                case 'Model Systems':
                    explanation = evidence.modelSystems.explanation ? evidence.modelSystems.explanation : null;
                    break;
                case 'Rescue':
                    explanation = evidence.rescue.explanation ? evidence.rescue.explanation : null;
                    break;
                default:
                    explanation = '';
            }
        }
        return explanation;
    },

    /**
     * Method to close current window
     * @param {*} e - Window event
     */
    handleWindowClose(e) {
        window.close();
    },

    /**
     * Method to genetate PDF from HTML
     * @param {*} e - Window event
     */
    handlePrintPDF(e) {
        window.print();
    },

    render() {
        const gdm = this.state.gdm;
        const provisional = this.state.provisional;
        const annotations = gdm && gdm.annotations && gdm.annotations.length ? gdm.annotations : [];

        return (
            <div className="gene-disease-evidence-summary-wrapper">
                <div className="window-close-btn-wrapper">
                    <button className="btn btn-default" onClick={this.handleWindowClose}><i className="icon icon-close"></i> Close</button>
                </div>
                <div className={this.state.preview && this.state.preview === 'yes' ?
                    'evidence-panel-wrapper preview-only-overlay' : 'evidence-panel-wrapper'}>
                    {!this.state.preview ?
                        <GeneDiseaseEvidenceSummaryHeader gdm={gdm} provisional={provisional} />
                        : <div className="spacer">&nbsp;</div>}
                    {provisional && Object.keys(provisional).length ?
                        <GeneDiseaseEvidenceSummaryClassificationMatrix classification={provisional} />
                        :null}
                    <GeneDiseaseEvidenceSummaryCaseLevel caseLevelEvidenceList={this.state.caseLevelEvidenceList} />
                    <GeneDiseaseEvidenceSummarySegregation segregationEvidenceList={this.state.segregationEvidenceList} />
                    <GeneDiseaseEvidenceSummaryCaseControl caseControlEvidenceList={this.state.caseControlEvidenceList} />
                    <GeneDiseaseEvidenceSummaryExperimental experimentalEvidenceList={this.state.experimentalEvidenceList} />
                </div>
                <p className="print-info-note">
                    <i className="icon icon-info-circle"></i> For best printing, choose "Landscape" for layout, 50% for Scale, "Minimum" for Margins, and select "Background graphics".
                </p>
                <div className="pdf-download-wrapper">
                    <button className="btn btn-default btn-inline-spacer" onClick={this.handleWindowClose}><i className="icon icon-close"></i> Close</button>
                    <button className="btn btn-primary btn-inline-spacer pull-right" onClick={this.handlePrintPDF}>Print PDF</button>
                </div>
            </div>
        );
    }

});

curator_page.register(GeneDiseaseEvidenceSummary,  'curator_page', 'gene-disease-evidence-summary');