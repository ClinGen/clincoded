'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { queryKeyValue } from '../globals';
import { GeneDiseaseSummaryClassification } from './summary_classification';

class GeneDiseaseScoreMatrix extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: this.props.user, // login user uuid
            gdm: this.props.gdm, // current gdm object, must be null initially.
            provisional: this.props.provisional, // login user's existing provisional object, must be null initially.
            totalScore: null,
            autoClassification: 'No Classification',
            alteredClassification: 'No Selection',
            replicatedOverTime: false,
            reasons: "",
            contradictingEvidence: {
                proband: false, caseControl: false, experimental: false
            },
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
                animalModelCount: 0, animalModelPoints: 0,
                cellCultureCount: 0, cellCulturePoints: 0,
                rescueCount: 0, rescuePoints: 0,
                rescueEngineeredCount: 0, rescueEngineeredPoints: 0,
                // variables for total counts
                geneticEvidenceTotalPoints: 0, experimentalEvidenceTotalPoints: 0
            }
        };
        this.handleReplicatedOverTime = this.handleReplicatedOverTime.bind(this);
    }

    componentDidMount() {
        if (Object.keys(this.state.provisional).length) {
            this.setState({
                alteredClassification: this.state.provisional.alteredClassification,
                replicatedOverTime: this.state.provisional.replicatedOverTime,
                reasons: this.state.provisional.reasons
            });
        }
        if (this.state.gdm && Object.keys(this.state.gdm).length) {
            console.warn('Calling calculate score table from componentDidMount()');
            this.calculateScoreTable();
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.user) {
            this.setState({user: nextProps.user});
        }
        if (nextProps.provisional) {
            this.setState({provisional: nextProps.provisional});
        }
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm});
        }
        if (Object.keys(this.state.provisional).length) {
            this.setState({
                alteredClassification: this.state.provisional.alteredClassification,
                replicatedOverTime: this.state.provisional.replicatedOverTime,
                reasons: this.state.provisional.reasons
            });
        }
        if (this.state.gdm && Object.keys(this.state.gdm).length) {
            console.warn('Calling calculate score table from componentWillReceiveProps(nextProps)...');
            this.calculateScoreTable();
        }
        this.setState({disabledInput: this.state.disabledInput});
    }

    shouldComponentUpdate(nextProps, nextState) {
        var key;
        if (nextProps) {
            for (key in nextProps) {
                if (nextProps[key] !== this.props[key]) {
                    console.warn('changed props: %s', key);
                    return true;
                }
            }
        }
        if (nextState) {
            for (key in nextState) {
                if (nextState[key] !== this.state[key]) {
                    console.warn('changed state: %s', key);
                    return true;
                }
            }
        }
        return false;
    }

    handleReplicatedOverTime(e) {
        const target = e.target;
        const checked = target.checked ? true : false;
        this.setState({replicatedOverTime: checked}, () => {
            this.calculateClassifications(this.state.totalScore, this.state.replicatedOverTime);
        });
    }

    familyScraper(user, families, annotation, segregationCount, segregationPoints, individualMatched) {
        // function for looping through family (of GDM or of group) and finding all relevent information needed for score calculations
        // returns dictionary of relevant items that need to be updated within NewCalculation()
        families.forEach(family => {
            // get segregation of family, but only if it was made by user (may change later - MC)
            if (family.segregation && family.submitted_by.uuid === user) {
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
    }

    individualScraper(individuals, individualMatched) {
        if (individuals) {
            individuals.forEach(individual => {
                if (individual.proband === true && (individual.scores && individual.scores.length)) {
                    individualMatched.push(individual);
                }
            });
        }
        return individualMatched;
    }

    calculateScoreTable() {
        // Generate a new summary for url ../provisional-curation/?gdm=GDMId&calculate=yes
        // Calculation rules are defined by Small GCWG. See ClinGen_Interface_4_2015.pptx and Clinical Validity Classifications for detail
        let gdm = this.state.gdm;
        let scoreTableValues = this.state.scoreTableValues;
        let contradictingEvidence = this.state.contradictingEvidence;

        const MAX_SCORE_CONSTANTS = {
            VARIANT_IS_DE_NOVO: 12,
            PREDICTED_OR_PROVEN_NULL_VARIANT: 10,
            OTHER_VARIANT_TYPE_WITH_GENE_IMPACT: 7,
            AUTOSOMAL_RECESSIVE: 12,
            SEGREGATION: 7,
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
                            if (score.submitted_by.uuid === this.state.user) {
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
                        if (score.submitted_by.uuid === this.state.user) {
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
                                    if (experimental.functionalAlteration.cellMutationOrEngineeredEquivalent
                                        && experimental.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Patient cells') {
                                        scoreTableValues['patientCellsCount'] += 1;
                                        scoreTableValues['patientCellsPoints'] += experimentalScore;
                                    } else if (experimental.functionalAlteration.cellMutationOrEngineeredEquivalent
                                        && experimental.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Engineered equivalent') {
                                        scoreTableValues['nonPatientCellsCount'] += 1;
                                        scoreTableValues['nonPatientCellsPoints'] += experimentalScore;
                                    }
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Model Systems') {
                                    if (experimental.modelSystems.animalOrCellCulture
                                        && experimental.modelSystems.animalOrCellCulture === 'Animal model') {
                                        scoreTableValues['animalModelCount'] += 1;
                                        scoreTableValues['animalModelPoints'] += experimentalScore;
                                    } else if (experimental.modelSystems.animalOrCellCulture
                                        && experimental.modelSystems.animalOrCellCulture === 'Engineered equivalent') {
                                        scoreTableValues['cellCultureCount'] += 1;
                                        scoreTableValues['cellCulturePoints'] += experimentalScore;
                                    }
                                } else if (experimental.evidenceType && experimental.evidenceType === 'Rescue') {
                                    if (experimental.rescue.patientCellOrEngineeredEquivalent
                                        && experimental.rescue.patientCellOrEngineeredEquivalent === 'Patient cells') {
                                        scoreTableValues['rescueCount'] += 1;
                                        scoreTableValues['rescuePoints'] += experimentalScore;
                                    } else if (experimental.rescue.patientCellOrEngineeredEquivalent
                                        && experimental.rescue.patientCellOrEngineeredEquivalent === 'Engineered equivalent') {
                                        scoreTableValues['rescueEngineeredCount'] += 1;
                                        scoreTableValues['rescueEngineeredPoints'] += experimentalScore;
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
                if (score.submitted_by.uuid === this.state.user) {
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
        } else if (scoreTableValues['segregationPoints'] >= 1.75 && scoreTableValues['segregationPoints'] <= 1.99) {
            scoreTableValues['segregationPointsCounted'] = 3.5;
        } else if (scoreTableValues['segregationPoints'] >= 2 && scoreTableValues['segregationPoints'] <= 2.49) {
            scoreTableValues['segregationPointsCounted'] = 4;
        } else if (scoreTableValues['segregationPoints'] >= 2.5 && scoreTableValues['segregationPoints'] <= 2.99) {
            scoreTableValues['segregationPointsCounted'] = 4.5;
        } else if (scoreTableValues['segregationPoints'] >= 3 && scoreTableValues['segregationPoints'] <= 3.49) {
            scoreTableValues['segregationPointsCounted'] = 5;
        } else if (scoreTableValues['segregationPoints'] >= 3.5 && scoreTableValues['segregationPoints'] <= 3.99) {
            scoreTableValues['segregationPointsCounted'] = 5.5;
        } else if (scoreTableValues['segregationPoints'] >= 4 && scoreTableValues['segregationPoints'] <= 4.49) {
            scoreTableValues['segregationPointsCounted'] = 6;
        } else if (scoreTableValues['segregationPoints'] >= 4.5 && scoreTableValues['segregationPoints'] <= 4.99) {
            scoreTableValues['segregationPointsCounted'] = 6.5;
        } else if (scoreTableValues['segregationPoints'] >= 5) {
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

        tempPoints = scoreTableValues['animalModelPoints'] + scoreTableValues['cellCulturePoints'] + scoreTableValues['rescuePoints'] + scoreTableValues['rescueEngineeredPoints'];
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
    }

    calculateClassifications(totalPoints, replicatedOverTime) {
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
        this.setState({autoClassification: autoClassification});
    }

    render() {
        let gdm = this.state.gdm ? this.state.gdm : null;
        let autoClassification = this.state.autoClassification;
        let scoreTableValues = this.state.scoreTableValues;

        // set the 'Current Classification' appropriately only if previous provisional exists
        let provisional = this.state.provisional;
        let currentClassification = 'None';
        if (provisional.last_modified) {
            if (provisional.alteredClassification && provisional.alteredClassification !== 'No Selection') {
                currentClassification = provisional.alteredClassification;
            } else {
                currentClassification = provisional.autoClassification ? provisional.autoClassification : this.state.autoClassification;
            }
        }
        return (
            <div className="summary-provisional-classification-wrapper">
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
                                <td rowSpan="10" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
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
                                <td>Patient Cells</td>
                                <td>{scoreTableValues['patientCellsCount']}</td>
                                <td>{scoreTableValues['patientCellsPoints']}</td>
                                <td rowSpan="2">{scoreTableValues['functionalAlterationPointsCounted']}</td>
                            </tr>
                            <tr>
                                <td>Non-patient Cells</td>
                                <td>{scoreTableValues['nonPatientCellsCount']}</td>
                                <td>{scoreTableValues['nonPatientCellsPoints']}</td>
                            </tr>
                            <tr>
                                <td colSpan="3" rowSpan="4" className="header">Models & Rescue</td>
                                <td>Animal Model</td>
                                <td>{scoreTableValues['animalModelCount']}</td>
                                <td>{scoreTableValues['animalModelPoints']}</td>
                                <td rowSpan="4">{scoreTableValues['modelsRescuePointsCounted']}</td>
                            </tr>
                            <tr>
                                <td>Cell Culture Model System</td>
                                <td>{scoreTableValues['cellCultureCount']}</td>
                                <td>{scoreTableValues['cellCulturePoints']}</td>
                            </tr>
                            <tr>
                                <td>Rescue in Animal Model</td>
                                <td>{scoreTableValues['rescueCount']}</td>
                                <td>{scoreTableValues['rescuePoints']}</td>
                            </tr>
                            <tr>
                                <td>Rescue in Engineered Equivalent</td>
                                <td>{scoreTableValues['rescueEngineeredCount']}</td>
                                <td>{scoreTableValues['rescueEngineeredPoints']}</td>
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
                <div className="summary-matrix-wrapper">
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
                                    {this.props.editKey && this.props.editKey === 'true' ?
                                        <input type="checkbox" className="checkbox"
                                            ref={(checkbox) => { this.checkboxInput = checkbox; }}
                                            onChange={this.handleReplicatedOverTime}
                                            checked={this.state.replicatedOverTime}
                                        />
                                        :
                                        <span>{this.state.replicatedOverTime ? 'Yes' : 'No'}</span>
                                    }
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
                            <tr className="total-row header">
                                <td colSpan="2">Current Saved Summary Classification</td>
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
                {this.props.isProvisionalClassification ?
                    <GeneDiseaseSummaryClassification user={this.state.user} gdm={gdm} provisional={provisional}
                        totalScore={this.state.totalScore}
                        autoClassification={this.state.autoClassification}
                        replicatedOverTime={this.state.replicatedOverTime}
                        contradictingEvidence={this.state.contradictingEvidence}
                        editKey={this.props.editKey} />
                    : null}
            </div>
        );
    }
}

GeneDiseaseScoreMatrix.propTypes = {
    gdm: PropTypes.object,
    provisional: PropTypes.object,
    user: PropTypes.string,
    isProvisionalClassification: PropTypes.bool,
    editKey: PropTypes.string
};

export default GeneDiseaseScoreMatrix;
