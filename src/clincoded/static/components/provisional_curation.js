'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var methods = require('./methods');
var parseAndLogError = require('./mixins').parseAndLogError;
var CuratorHistory = require('./curator_history');
var modal = require('../libs/bootstrap/modal');
var Modal = modal.Modal;
var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var queryKeyValue = globals.queryKeyValue;
var userMatch = globals.userMatch;

var ProvisionalCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func,
        closeModal: React.PropTypes.func
    },

    queryValues: {},

    getInitialState: function() {
        return {
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: {}, // login user's existing provisional object, must be null initially.
            //assessments: null,  // list of all assessments, must be nul initially.
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

            // search for provisional owned by login user
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (var i in stateObj.gdm.provisionalClassifications) {
                    var owner = stateObj.gdm.provisionalClassifications[i].submitted_by;
                    if (owner.uuid === stateObj.user) { // find
                        stateObj.provisional = stateObj.gdm.provisionalClassifications[i];
                        stateObj.alteredClassification = stateObj.provisional.alteredClassification;
                        stateObj.replicatedOverTime = stateObj.provisional.replicatedOverTime;
                        stateObj.reasons = stateObj.provisional.reasons;
                        break;
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

            // check required item (reasons)
            var formErr = false;
            if (!newProvisional.reasons && newProvisional.alteredClassification !== 'No Selection') {
                formErr = true;
                this.setFormErrors('reasons', 'Required when changing classification.');
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
                        window.history.go(-1);
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
                        window.history.go(-1);
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
            this.setState({alteredClassification: this.refs[ref].getValue()});
        } else if (ref === 'reasons') {
            this.setState({reasons: this.refs[ref].getValue()});
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
        scoreTableValues['geneticEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE ? tempPoints : MAX_SCORE_CONSTANTS.GENETIC_EVIDENCE;

        tempPoints = scoreTableValues['functionalPointsCounted'] + scoreTableValues['functionalAlterationPointsCounted'] + scoreTableValues['modelsRescuePointsCounted'];
        scoreTableValues['experimentalEvidenceTotalPoints'] = tempPoints < MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE ? tempPoints : MAX_SCORE_CONSTANTS.EXPERIMENTAL_EVIDENCE;

        let totalScore = scoreTableValues['geneticEvidenceTotalPoints'] + scoreTableValues['experimentalEvidenceTotalPoints'];

        // set scoreTabValues state
        this.setState({totalScore: totalScore, contradictingEvidence: contradictingEvidence, scoreTableValues: scoreTableValues});

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
        this.setState({autoClassification: autoClassification});
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
            if (provisional.alteredClassification && provisional.alteredClassification !== 'No Selection') {
                currentClassification = provisional.alteredClassification;
            } else {
                currentClassification = provisional.autoClassification ? provisional.autoClassification : this.state.autoClassification;
            }
        }
        return (
            <div>
                { show_clsfctn === 'display' ?
                    Classification.call()
                    :
                    ( gdm ?
                        <div>
                            <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} summaryPage={true} linkGdm={true} />
                            <div className="container">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <PanelGroup accordion>
                                        <Panel title="New Summary & Provisional Classification" open>
                                            <div className="form-group">
                                                <div>
                                                    The calculated values below are based on the set of saved evidence that existed when the "Generate New Summary"
                                                    button was clicked. To save these values and the calculated or selected Classification, click "Save" below - they
                                                    will then represent the new "Last Saved Summary & Provisional Classification".
                                                </div>
                                                <div><span>&nbsp;</span></div>
                                                <br />
                                                <div className="container">
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
                                                <br />

                                                <div className="container">
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
                                                                    <Input type="select" ref="alteredClassification"
                                                                        label={<strong>Modify Provisional&nbsp;<a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</strong>}
                                                                        labelClassName="col-sm-3 control-label" handleChange={this.handleChange}
                                                                        wrapperClassName="col-sm-9" defaultValue={this.state.alteredClassification}
                                                                        groupClassName="form-group">
                                                                        <option value="No Selection">No Selection</option>
                                                                        {autoClassification === 'Definitive' ? null : <option value="Definitive">Definitive</option>}
                                                                        {autoClassification === 'Strong' ? null : <option value="Strong">Strong</option>}
                                                                        {autoClassification === 'Moderate' ? null : <option value="Moderate">Moderate</option>}
                                                                        {autoClassification === 'Limited' ? null : <option value="Limited">Limited</option>}
                                                                        <option value="Disputed">Disputed</option>
                                                                        <option value="Refuted">Refuted</option>
                                                                        <option value="No Reported Evidence">No Reported Evidence (calculated score is based on Experimental evidence only)</option>
                                                                    </Input>
                                                                </td>
                                                            </tr>
                                                            <tr className="separator-below">
                                                                <td colSpan="5">
                                                                    <Input type="textarea" ref="reasons" rows="5" label="Explain Reason(s) for Change" labelClassName="col-sm-3 control-label"
                                                                        wrapperClassName="col-sm-9" groupClassName="form-group" error={this.getFormError('reasons')} value={this.state.reasons}
                                                                        clearError={this.clrFormErrors.bind(null, 'reasons')} handleChange={this.handleChange} />
                                                                </td>
                                                            </tr>
                                                            <tr className="total-row header">
                                                                <td colSpan="2">Current Saved Provisional Classification</td>
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

globals.curator_page.register(ProvisionalCuration,  'curator_page', 'provisional-curation');

// Generate Classification Description page for url ../provisional-curation/?gdm=GDMId&classification=display
var Classification = function() {
    return (
        <div className="container classification-cell">
            <h1>Clinical Validity Classifications</h1>
            <div className="classificationTable">
                <table>
                    <tbody>
                        <tr className="greyRow">
                            <td colSpan='2' className="titleCell">Evidence Level</td>
                            <td className="titleCell">Evidence Description</td>
                        </tr>
                        <tr>
                            <td rowSpan='7' className="verticalCell">
                                <div className="verticalContent spptEvd">
                                    Supportive&nbsp;Evidence
                                </div>
                            </td>
                            <td className="levelCell">DEFINITIVE</td>
                            <td>
                                The role of this gene in this particular disease hase been repeatedly demonstrated in both the research and clinical
                                diagnostic settings, and has been upheld over time (in general, at least 3 years). No convincing evidence has emerged
                                that contradicts the role of the gene in the specified disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">STRONG</td>
                            <td>
                                The role of this gene in disease has been independently demonstrated in at least two separate studies providing&nbsp;
                                <strong>strong</strong> supporting evidence for this gene&#39;s role in disease, such as the following types of evidence:
                                <ul>
                                    <li>Strong variant-level evidence demonstrating numerous unrelated probands with variants that provide convincing
                                    evidence for disease causality&sup1;</li>
                                    <li>Compelling gene-level evidence from different types of supporting experimental data&sup2;.</li>
                                </ul>
                                In addition, no convincing evidence has emerged that contradicts the role of the gene in the noted disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">MODERATE</td>
                            <td>
                                There is <strong>moderate</strong> evidence to support a causal role for this gene in this diseaese, such as:
                                <ul>
                                    <li>At least 3 unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                                    <li>Moderate experimental data&sup2; supporting the gene-disease association</li>
                                </ul>
                                The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged
                                that contradicts the role of the gene in the noded disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">LIMITED</td>
                            <td>
                                There is <strong>limited</strong> evidence to support a causal role for this gene in this disease, such as:
                                <ul>
                                    <li>Fewer than three observations of variants that provide convincing evidence for disease causality&sup1;</li>
                                    <li>Multiple variants reported in unrelated probands but <i>without</i> sufficient evidence that the variants alter function</li>
                                    <li>Limited experimental data&sup2; supporting the gene-disease association</li>
                                </ul>
                                The role of this gene in  disease may not have been independently reported, but no convincing evidence has emerged that
                                contradicts the role of the gene in the noted disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td colSpan="2" className="levelCell">NO REPORTED<br />EVIDENCE</td>
                            <td>
                                No evidence reported for a causal role in disease. These genes might be &#34;candidate&#34; genes based on animal models or implication
                                in pathways known to be involved in human diseases, but no reports have implicated the gene in human disease cases.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="verticalCell">
                                <div className="verticalContent cntrdctEvd">
                                    Contradictory&nbsp;Evidence
                                </div>
                            </td>
                            <td className="levelCell">
                                CONFLICTING<br />EVIDENCE<br />REPORTED
                            </td>
                            <td>
                                Although there has been an assertion of a gene-disease association, conflicting evidence for the role of this gene in disease has arisen
                                since the time of the initial report indicating a disease association. Depending on the quantity and quality of evidence disputing the
                                association, the gene/disease association may be further defined by the following two sub-categories:
                                <ol className="olTitle">
                                    <li type="1">
                                        Disputed
                                        <ol className="olContent">
                                            <li type="a">
                                                Convincing evidence <i>disputing</i> a role for this gene in this disease has arisen since the initial report identifying an
                                                association between the gene and disease.
                                            </li>
                                            <li type="a">
                                                Refuting evidence need not outweigh existing evidence supporting the gene:disease association.
                                            </li>
                                        </ol>
                                    </li>
                                    <li type="1">
                                        Refuted
                                        <ol className="olContent">
                                            <li type="a">
                                                Evidence refuting the role of the gene in the specified disease has been reported and significantly outweighs any evidence
                                                supporting the role.
                                            </li>
                                            <li type="a">
                                                This designation is to be applied at the discretion of clinical domain experts after thorough review of available evidence
                                            </li>
                                        </ol>
                                    </li>
                                </ol>
                            </td>
                        </tr>
                        <tr className="greyRow">
                            <td colSpan="3" className="levelCell">NOTES</td>
                        </tr>
                        <tr>
                            <td colSpan="3">
                                <p>
                                    &sup1;Variants that have evidence to disrupt function and/or have other strong genetic and population data (e.g. <i>de novo</i>&nbsp;
                                    occurrence, absence in controls, etc) can be used as evidence in support of a variant&#39;s causality in this framework.
                                </p>
                                <p>&sup2;Examples of appropriate types of supporting experimental data based on those outlined in MacArthur et al. 2014.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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
var ProvisionalAddModHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> {meta.alteredClassification.toUpperCase()} added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ProvisionalAddModHistory, 'ProvisionalClassification', 'add');


// Display a history item for modifying a family
var ProvisionalModifyHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> modified to {meta.alteredClassification.toUpperCase()} for </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ProvisionalModifyHistory, 'ProvisionalClassification', 'modify');


// Display a history item for deleting a family
var ProvisionalDeleteHistory = React.createClass({
    render: function() {
        return <div>PROVISIONALDELETE</div>;
    }
});

globals.history_views.register(ProvisionalDeleteHistory, 'ProvisionalClassification', 'delete');
