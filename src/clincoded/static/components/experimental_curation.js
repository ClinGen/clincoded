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
var Assessments = require('./assessment');
var add_external_resource = require('./add_external_resource');
var CuratorHistory = require('./curator_history');

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var ViewRecordHeader = curator.ViewRecordHeader;
var CurationPalette = curator.CurationPalette;
var AssessmentTracker = Assessments.AssessmentTracker;
var AssessmentPanel = Assessments.AssessmentPanel;
var AssessmentMixin = Assessments.AssessmentMixin;
var PmidSummary = curator.PmidSummary;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var PmidDoiButtons = curator.PmidDoiButtons;
var queryKeyValue = globals.queryKeyValue;
var country_codes = globals.country_codes;
var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;
var DeleteButton = curator.DeleteButton;
var AddResourceId = add_external_resource.AddResourceId;

var ScoreExperimental = require('./score/experimental_score').ScoreExperimental;
var ScoreViewer = require('./score/viewer').ScoreViewer;

const MAX_VARIANTS = 5;

var initialCv = {
    assessmentTracker: null, // Tracking object for a single assessment
    experimentalDataAssessed: false, // TRUE if experimental data has been assessed by self or others
    othersAssessed: false // TRUE if other curators have assessed the experimental data
};

var ExperimentalCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, AssessmentMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    cv: initialCv,

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        this.cv.assessmentTracker = initialCv;

        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            experimental: null, // If we're editing an Experimental Data entry, this gets the fleshed-out group Experimental Data entry we're editing
            experimentalNameVisible: false,  // Is the Experimental Data Name field visible?
            experimentalName: '', // Currently entered name of the Experimental Data entry
            experimentalType: '',  // Currently entered type of the Experimental Data entry
            experimentalTypeDescription: [], // Description of the selected Experimental Data type
            experimentalSubtype: 'none', // Currently entered subtype of the Experimental Data entry (if applicable)
            othersAssessed: false, // TRUE if other curators have assessed the experimental data entry
            geneImplicatedWithDisease: false, // checkbox state values
            geneImplicatedInDisease: false,
            expressedInTissue: false,
            expressedInPatients: false,
            patientVariantRescue: false,
            wildTypeRescuePhenotype: false,
            biochemicalFunctionHPO: false, // form enabled/disabled checks
            biochemicalFunctionFT: false,
            functionalAlterationPCEE: '',
            modelSystemsNHACCM: '',
            modelSystemsPOMSHPO: false,
            modelSystemsPOMSFT: false,
            modelSystemsPPHPO: false,
            modelSystemsPPFT: false,
            rescuePCEE: '',
            rescuePRHPO: false,
            rescuePRFT: false,
            variantCount: 0, // Number of variants to display
            variantInfo: {}, // Extra holding info for variant display
            addVariantDisabled: false, // True if Add Another Variant button enabled
            submitBusy: false, // True while form is submitting
            userScoreObj: {}, // Logged-in user's score object
            uniprotId: '',
            formError: false
        };
    },

    // Called by child function props to update user score obj
    handleUserScoreObj: function(newUserScoreObj) {
        this.setState({userScoreObj: newUserScoreObj});
    },

    // sets the description text below the experimental data type dropdown
    getExperimentalTypeDescription: function(item, subitem) {
        subitem = typeof subitem !== 'undefined' ? subitem : '';
        var experimentalTypeDescriptionList = {
            'Biochemical Function': [
                'A. The gene product performs a biochemical function shared with other known genes in the disease of interest',
                'B. The gene product is consistent with the observed phenotype(s)'
            ],
            'Protein Interactions': ['The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest'],
            'Expression': [
                'A. The gene is expressed in tissues relevant to the disease of interest',
                'B. The gene is altered in expression in patients who have the disease'
            ],
            'Functional Alteration': ['The gene and/or gene product function is demonstrably altered in patients carrying candidate mutations or engineered equivalents'],
            'Model Systems': ['Non-human animal OR cell-culture models with a similarly disrupted copy of the affected gene show a phenotype consistent with human disease state'],
            'Rescue': ['The cellular phenotype in patient-derived cells OR engineered equivalents can be rescued by addition of the wild-type gene product']
        };
        if (subitem == 'A') {
            return [experimentalTypeDescriptionList[item][0]];
        } else if (subitem == 'B') {
            return [experimentalTypeDescriptionList[item][1]];
        } else {
            return experimentalTypeDescriptionList[item];
        }
    },

    // Handle value changes in forms
    handleChange: function(ref, e) {
        var clinvarid, othervariant, user;
        if (ref === 'experimentalName' && this.refs[ref].getValue()) {
            this.setState({experimentalName: this.refs[ref].getValue()});
        } else if (ref === 'experimentalType') {
            var tempExperimentalType = this.refs[ref].getValue();
            // if assessmentTracker was set previously, reset its value
            if (this.cv.assessmentTracker) {
                // set values for assessmentTracker
                user = this.props.session && this.props.session.user_properties;
                this.cv.assessmentTracker.setCurrentVal(Assessments.DEFAULT_VALUE);
                this.setAssessmentValue(this.cv.assessmentTracker, Assessments.DEFAULT_VALUE);
            }
            this.setState({
                experimentalName: '',
                experimentalType: tempExperimentalType,
                experimentalTypeDescription: this.getExperimentalTypeDescription(tempExperimentalType)
            });
            if (this.state.experimentalNameVisible) {
                this.refs['experimentalName'].setValue('');
            }
            if (tempExperimentalType == 'none') {
                // reset form
                this.setState({
                    experimentalNameVisible: false,
                    experimentalTypeDescription: []
                });
            } else if (tempExperimentalType == 'Biochemical Function' || tempExperimentalType == 'Expression') {
                // display only subtype field if type is Biochemical Function or Expression
                this.setState({
                    experimentalSubtype: 'none',
                    experimentalTypeDescription: this.getExperimentalTypeDescription(tempExperimentalType),
                    experimentalNameVisible: false
                });
            } else {
                this.setState({experimentalNameVisible: true});
            }
        } else if (ref === 'experimentalSubtype') {
            var tempExperimentalSubtype = this.refs[ref].getValue();
            this.setState({experimentalSubtype: tempExperimentalSubtype});
            // if assessmentTracker was set previously, reset its value
            if (this.cv.assessmentTracker) {
                // set values for assessmentTracker
                user = this.props.session && this.props.session.user_properties;
                this.cv.assessmentTracker.setCurrentVal(Assessments.DEFAULT_VALUE);
                this.setAssessmentValue(this.cv.assessmentTracker, Assessments.DEFAULT_VALUE);
            }
            // Reset values when changing between Subtypes
            if (this.refs['experimentalName']) {
                this.refs['experimentalName'].setValue('');
                this.setState({experimentalName: ''});
            }
            if (this.refs['identifiedFunction']) {
                this.refs['identifiedFunction'].setValue('');
            }
            if (this.refs['identifiedFunctionTerms']) {
                this.refs['identifiedFunctionTerms'].setValue('');
            }
            if (this.refs['evidenceForFunction']) {
                this.refs['evidenceForFunction'].resetValue();
            }
            if (this.refs['evidenceForFunctionInPaper']) {
                this.refs['evidenceForFunctionInPaper'].resetValue();
            }
            if (this.refs['geneWithSameFunctionSameDisease.geneImplicatedWithDisease']) {
                this.refs['geneWithSameFunctionSameDisease.geneImplicatedWithDisease'].resetValue();
                this.setState({geneImplicatedWithDisease: false});
            }
            if (this.refs['organOfTissue']) {
                this.refs['organOfTissue'].setValue('');
            }
            if (this.refs['normalExpression.expressedInTissue']) {
                this.refs['normalExpression.expressedInTissue'].resetValue();
                this.setState({expressedInTissue: false});
            }
            if (this.refs['alteredExpression.expressedInPatients']) {
                this.refs['alteredExpression.expressedInPatients'].resetValue();
                this.setState({expressedInPatients: false});
            }
            // If a subtype is not selected, do not let the user  specify the experimental name
            if (tempExperimentalSubtype == 'none' || tempExperimentalSubtype === '') {
                this.setState({
                    experimentalTypeDescription: this.getExperimentalTypeDescription(this.state.experimentalType),
                    experimentalNameVisible: false
                });
            } else {
                this.setState({
                    experimentalTypeDescription: this.getExperimentalTypeDescription(this.state.experimentalType, tempExperimentalSubtype.charAt(0)),
                    experimentalNameVisible: true
                });
            }
        } else if (ref === 'geneWithSameFunctionSameDisease.geneImplicatedWithDisease') {
            this.setState({geneImplicatedWithDisease: this.refs[ref].toggleValue()});
            if (this.refs['geneWithSameFunctionSameDisease.geneImplicatedWithDisease'].getValue() === false) {
                this.refs['geneWithSameFunctionSameDisease.explanationOfOtherGenes'].resetValue();
                this.refs['geneWithSameFunctionSameDisease.evidenceInPaper'].resetValue();
            }
        } else if (ref === 'geneImplicatedInDisease') {
            this.setState({geneImplicatedInDisease: this.refs[ref].toggleValue()});
            if (this.refs['geneImplicatedInDisease'].getValue() === false) {
                this.refs['relationshipOfOtherGenesToDisese'].resetValue();
                this.refs['evidenceInPaper'].resetValue();
            }
        } else if (ref === 'normalExpression.expressedInTissue') {
            this.setState({expressedInTissue: this.refs[ref].toggleValue()});
            if (this.refs['normalExpression.expressedInTissue'].getValue() === false) {
                this.refs['normalExpression.evidence'].resetValue();
                this.refs['normalExpression.evidenceInPaper'].resetValue();
            }
        } else if (ref === 'alteredExpression.expressedInPatients') {
            this.setState({expressedInPatients: this.refs[ref].toggleValue()});
            if (this.refs['alteredExpression.expressedInPatients'].getValue() === false) {
                this.refs['alteredExpression.evidence'].resetValue();
                this.refs['alteredExpression.evidenceInPaper'].resetValue();
            }
        } else if (ref === 'wildTypeRescuePhenotype') {
            this.setState({wildTypeRescuePhenotype: this.refs[ref].toggleValue()});
        } else if (ref === 'patientVariantRescue') {
            this.setState({patientVariantRescue: this.refs[ref].toggleValue()});
        } else if (ref === 'geneFunctionConsistentWithPhenotype.phenotypeHPO') {
            if (this.refs['geneFunctionConsistentWithPhenotype.phenotypeHPO'].getValue() === '') {
                this.setState({biochemicalFunctionHPO: false});
            } else {
                this.setState({biochemicalFunctionHPO: true});
            }
        } else if (ref === 'geneFunctionConsistentWithPhenotype.phenotypeFreeText') {
            if (this.refs['geneFunctionConsistentWithPhenotype.phenotypeFreeText'].getValue() === '') {
                this.setState({biochemicalFunctionFT: false});
            } else {
                this.setState({biochemicalFunctionFT: true});
            }
        } else if (ref === 'cellMutationOrEngineeredEquivalent') {
            this.setState({functionalAlterationPCEE: this.refs['cellMutationOrEngineeredEquivalent'].getValue()});
        } else if (ref === 'animalOrCellCulture') {
            this.setState({modelSystemsNHACCM: this.refs['animalOrCellCulture'].getValue()});
        } else if (ref === 'model.phenotypeHPOObserved') {
            if (this.refs['model.phenotypeHPOObserved'].getValue() === '') {
                this.setState({modelSystemsPOMSHPO: false});
            } else {
                this.setState({modelSystemsPOMSHPO: true});
            }
        } else if (ref === 'phenotypeFreetextObserved') {
            if (this.refs['phenotypeFreetextObserved'].getValue() === '') {
                this.setState({modelSystemsPOMSFT: false});
            } else {
                this.setState({modelSystemsPOMSFT: true});
            }
        } else if (ref === 'model.phenotypeHPO') {
            if (this.refs['model.phenotypeHPO'].getValue() === '') {
                this.setState({modelSystemsPPHPO: false});
            } else {
                this.setState({modelSystemsPPHPO: true});
            }
        } else if (ref === 'model.phenotypeFreeText') {
            if (this.refs['model.phenotypeFreeText'].getValue() === '') {
                this.setState({modelSystemsPPFT: false});
            } else {
                this.setState({modelSystemsPPFT: true});
            }
        } else if (ref === 'rescue.phenotypeHPO') {
            if (this.refs['rescue.phenotypeHPO'].getValue() === '') {
                this.setState({rescuePRHPO: false});
            } else {
                this.setState({rescuePRHPO: true});
            }
        } else if (ref === 'rescue.phenotypeFreeText') {
            if (this.refs['rescue.phenotypeFreeText'].getValue() === '') {
                this.setState({rescuePRFT: false});
            } else {
                this.setState({rescuePRFT: true});
            }
        } else if (ref === 'patientCellOrEngineeredEquivalent') {
            this.setState({rescuePCEE: this.refs['patientCellOrEngineeredEquivalent'].getValue()});
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var experimentalUuid = this.queryValues.experimentalUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            experimentalUuid ? '/experimental/' + experimentalUuid : '',
            annotationUuid ? '/evidence/' + annotationUuid : ''
        ]);

        // With all given query string variables, get the corresponding objects from the DB.
        this.getRestDatas(
            uris
        ).then(datas => {
            var user = this.props.session && this.props.session.user_properties;
            var userAssessment;

            // See what we got back so we can build an object to copy in this React object's state to rerender the page.
            var stateObj = {};
            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;

                    case 'experimental':
                        stateObj.experimental = data;
                        break;

                    case 'annotation':
                        stateObj.annotation = data;
                        break;

                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm) {
                this.getUniprotId(stateObj.gdm);
                if (stateObj.gdm.omimId) {
                    this.setOmimIdState(stateObj.gdm.omimId);
                }
            }

            // Load data and set states as needed
            if (stateObj.experimental) {
                this.setState({
                    experimentalName: stateObj.experimental.label,
                    experimentalType: stateObj.experimental.evidenceType,
                    experimentalTypeDescription: this.getExperimentalTypeDescription(stateObj.experimental.evidenceType),
                    experimentalNameVisible: true
                });
                if (stateObj.experimental.evidenceType === 'Biochemical Function') {
                    if (!_.isEmpty(stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease)) {
                        this.setState({
                            experimentalSubtype: "A. Gene(s) with same function implicated in same disease",
                            experimentalTypeDescription: this.getExperimentalTypeDescription(stateObj.experimental.evidenceType, 'A')
                        });
                        if (stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease) {
                            this.setState({geneImplicatedWithDisease: stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease});
                        }
                    } else if (!_.isEmpty(stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype)) {
                        this.setState({
                            experimentalSubtype: "B. Gene function consistent with phenotype(s)",
                            experimentalTypeDescription: this.getExperimentalTypeDescription(stateObj.experimental.evidenceType, 'B')
                        });
                        if (stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO && stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.length > 0) {
                            this.setState({'biochemicalFunctionHPO': true});
                        }
                        if (stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText && stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText !== '') {
                            this.setState({'biochemicalFunctionFT': true});
                        }
                    }
                } else if (stateObj.experimental.evidenceType === 'Protein Interactions') {
                    if (stateObj.experimental.proteinInteractions.geneImplicatedInDisease) {
                        this.setState({geneImplicatedInDisease: stateObj.experimental.proteinInteractions.geneImplicatedInDisease});
                    }
                } else if (stateObj.experimental.evidenceType === 'Expression') {
                    if (!_.isEmpty(stateObj.experimental.expression.normalExpression)) {
                        this.setState({
                            experimentalSubtype: "A. Gene normally expressed in tissue relevant to the disease",
                            experimentalTypeDescription: this.getExperimentalTypeDescription(stateObj.experimental.evidenceType, 'A')
                        });
                        if (stateObj.experimental.expression.normalExpression.expressedInTissue) {
                            this.setState({expressedInTissue: stateObj.experimental.expression.normalExpression.expressedInTissue});
                        }
                    } else if (!_.isEmpty(stateObj.experimental.expression.alteredExpression)) {
                        this.setState({
                            experimentalSubtype: "B. Altered expression in Patients",
                            experimentalTypeDescription: this.getExperimentalTypeDescription(stateObj.experimental.evidenceType, 'B')
                        });
                        if (stateObj.experimental.expression.alteredExpression.expressedInPatients) {
                            this.setState({expressedInPatients: stateObj.experimental.expression.alteredExpression.expressedInPatients});
                        }
                    }
                } else if (stateObj.experimental.evidenceType === 'Functional Alteration') {
                    this.setState({functionalAlterationPCEE: stateObj.experimental.functionalAlteration.cellMutationOrEngineeredEquivalent});
                } else if (stateObj.experimental.evidenceType === 'Model Systems') {
                    this.setState({modelSystemsNHACCM: stateObj.experimental.modelSystems.animalOrCellCulture});
                    if (stateObj.experimental.modelSystems.phenotypeHPOObserved !== '') {
                        this.setState({modelSystemsPOMSHPO: true});
                    }
                    if (stateObj.experimental.modelSystems.phenotypeFreetextObserved !== '') {
                        this.setState({modelSystemsPOMSFT: true});
                    }
                    if (stateObj.experimental.modelSystems.phenotypeHPO !== '') {
                        this.setState({modelSystemsPPHPO: true});
                    }
                    if (stateObj.experimental.modelSystems.phenotypeFreeText !== '') {
                        this.setState({modelSystemsPPFT: true});
                    }
                } else if (stateObj.experimental.evidenceType === 'Rescue') {
                    this.setState({rescuePCEE: stateObj.experimental.rescue.patientCellOrEngineeredEquivalent});
                    if (stateObj.experimental.rescue.wildTypeRescuePhenotype) {
                        this.setState({wildTypeRescuePhenotype: stateObj.experimental.rescue.wildTypeRescuePhenotype});
                    }
                    if (stateObj.experimental.rescue.patientVariantRescue) {
                        this.setState({patientVariantRescue: stateObj.experimental.rescue.patientVariantRescue});
                    }
                    if (stateObj.experimental.rescue.phenotypeHPO !== '') {
                        this.setState({rescuePRHPO: true});
                    }
                    if (stateObj.experimental.rescue.phenotypeFreeText !== '') {
                        this.setState({rescuePRFT: true});
                    }
                }

                // See if we need to disable the Add Variant button based on the number of variants configured
                if (stateObj.experimental.variants) {
                    var variants = stateObj.experimental.variants;
                    if (variants && variants.length > 0) {
                        // We have variants
                        stateObj.variantCount = variants.length;
                        stateObj.addVariantDisabled = false;
                        stateObj.variantInfo = {};

                        for (var i = 0; i < variants.length; i++) {
                            if (variants[i].clinvarVariantId || variants[i].carId) {
                                stateObj.variantInfo[i] = {
                                    'clinvarVariantId': variants[i].clinvarVariantId ? variants[i].clinvarVariantId : null,
                                    'clinvarVariantTitle': variants[i].clinvarVariantTitle ? variants[i].clinvarVariantTitle : null,
                                    'carId': variants[i].carId ? variants[i].carId : null,
                                    'grch38': variants[i].hgvsNames && variants[i].hgvsNames.GRCh38 ? variants[i].hgvsNames.GRCh38 : null,
                                    'uuid': variants[i].uuid
                                };
                            }
                        }
                    }
                }

                // Find the current user's assessment from the assessment list
                if (stateObj.experimental.assessments && stateObj.experimental.assessments.length) {
                    // Find the assessment belonging to the logged-in curator, if any.
                    userAssessment = Assessments.userAssessment(stateObj.experimental.assessments, user && user.uuid);

                    // See if any assessments are non-default
                    this.cv.experimentalDataAssessed = _(stateObj.experimental.assessments).find(function(assessment) {
                        return assessment.value !== Assessments.DEFAULT_VALUE;
                    });

                    // See if others have assessed
                    if (user && user.uuid) {
                        this.cv.othersAssessed = Assessments.othersAssessed(stateObj.experimental.assessments, user.uuid);
                    }
                }
            }

            // Make a new tracking object for the current assessment. Either or both of the original assessment or user can be blank
            // and assigned later. Then set the component state's assessment value to the assessment's value -- default if there was no
            // assessment.
            var tempEvidenceType = '';
            if (stateObj.experimental) {
                tempEvidenceType = stateObj.experimental.evidenceType;
            }
            var assessmentTracker = this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, tempEvidenceType);
            this.setAssessmentValue(assessmentTracker);

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No one’s waiting but the user; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s', e);
        });
    },

    // After the Experimental Data Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        this.loadData();
    },

    componentWillUnmount: function() {
        this.cv.othersAssessed = false;
    },

    // Clear error state when either experimentalType or experimentalSubtype selection is changed
    componentDidUpdate: function(prevProps, prevState) {
        if (typeof prevState.experimentalType !== undefined && prevState.experimentalType !== this.state.experimentalType) {
            this.setState({formErrors: []});
        } else if (typeof prevState.experimentalSubtype !== undefined && prevState.experimentalSubtype !== this.state.experimentalSubtype) {
            this.setState({formErrors: []});
        }
    },

    // When the user changes the assessment value, this gets called
    updateAssessment: function(value) {
        var assessment = this.state.assessment;
        assessment.value = value;
        this.setState({assessment: assessment});
    },

    // validate values and return error messages as needed
    validateFormTerms: function(formError, type, terms, formField, limit) {
        limit = typeof limit !== 'undefined' ? limit : 0;
        var errorMsgs = {
            'clIDs': {
                'invalid1': "Use CL Ontology ID (e.g. CL_0000057)",
                'invalid': "Use CL Ontologys (e.g. CL_0000057) separated by commas",
                'limit1': "Enter only one CL Ontology ID",
                'limit': "Enter only " + limit + " CL Ontology IDs"
            },
            'efoIDs': {
                'invalid1': "Use EFO ID (e.g. EFO_0001187)",
                'invalid': "Use EFO IDs (e.g. EFO_0001187) separated by commas",
                'limit1': "Enter only one EFO ID",
                'limit': "Enter only " + limit + " EFO IDs"
            },
            'geneSymbols': {
                'invalid1': "Use gene symbol (e.g. SMAD3)",
                'invalid': "Use gene symbols (e.g. SMAD3) separated by commas",
                'limit1': "Enter only one gene symbol",
                'limit': "Enter only " + limit + " gene symbols"
            },
            'goSlimIds': {
                'invalid1': "Use GO ID (e.g. GO:0006259)",
                'invalid': "Use GO IDs (e.g. GO:0006259) separated by commas",
                'limit1': "Enter only one GO ID",
                'limit': "Enter only " + limit + " GO IDs"
            },
            'hpoIDs': {
                'invalid1': "Use HPO ID (e.g. HP:0000001)",
                'invalid': "Use HPO IDs (e.g. HP:0000001) separated by commas",
                'limit1': "Enter only one HPO ID",
                'limit': "Enter only " + limit + " HPO IDs"
            },
            'uberonIDs': {
                'invalid1': "Use Uberon ID (e.g. UBERON_0015228)",
                'invalid': "Use Uberon IDs (e.g. UBERON_0015228) separated by commas",
                'limit1': "Enter only one Uberon ID",
                'limit': "Enter only " + limit + " Uberon IDs"
            }
        };
        if (terms && terms.length && _(terms).any(function(id) { return id === null; })) {
            // term is bad
            formError = true;
            if (limit == 1) {
                this.setFormErrors(formField, errorMsgs[type]['invalid1']);
            } else {
                this.setFormErrors(formField, errorMsgs[type]['invalid']);
            }
        }
        if (limit !== 0 && terms.length > limit) {
            // number of terms more than specified limit
            formError = true;
            if (limit == 1) {
                this.setFormErrors(formField, errorMsgs[type]['limit1']);
            } else {
                this.setFormErrors(formField, errorMsgs[type]['limit']);
            }
        }
        return formError;
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Make sure there is an explanation for the score selected differently from the default score
        let newUserScoreObj = Object.keys(this.state.userScoreObj).length ? this.state.userScoreObj : {};
        if (Object.keys(newUserScoreObj).length) {
            if(newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && !newUserScoreObj.scoreExplanation) {
                this.setState({formError: true});
                return false;
            }
        }

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var groupGenes;
            var goSlimIDs, geneSymbols, hpoIDs, uberonIDs, clIDs, efoIDs;
            var formError = false;

            if (this.state.experimentalType == 'Biochemical Function') {
                // Check form for Biochemical Function panel
                if (this.state.experimentalSubtype.charAt(0) == 'A' && !this.getFormValue('geneWithSameFunctionSameDisease.geneImplicatedWithDisease')) {
                    formError = true;
                    this.setFormErrors('geneWithSameFunctionSameDisease.geneImplicatedWithDisease', "Please see note below.");
                }
                // Make sure neither 'identifiedFunction' nor 'identifiedFunctionTerms' fields are empty
                if (!formError && !this.getFormValue('identifiedFunction') && !this.getFormValue('identifiedFunctionTerms')) {
                    formError = true;
                    this.setFormErrors('identifiedFunction', 'Enter GO ID and/or free text.');
                    this.setFormErrors('identifiedFunctionTerms', 'Enter GO ID and/or free text.');
                }
                // check goSlims
                if (this.getFormValue('identifiedFunction')) {
                    goSlimIDs = curator.capture.goslims(this.getFormValue('identifiedFunction'));
                    formError = this.validateFormTerms(formError, 'goSlimIds', goSlimIDs, 'identifiedFunction', 1);
                }
                // check geneSymbols
                geneSymbols = curator.capture.genes(this.getFormValue('geneWithSameFunctionSameDisease.genes'));
                formError = this.validateFormTerms(formError, 'geneSymbols', geneSymbols, 'geneWithSameFunctionSameDisease.genes');
                // check hpoIDs
                hpoIDs = curator.capture.hpoids(this.getFormValue('geneFunctionConsistentWithPhenotype.phenotypeHPO'));
                formError = this.validateFormTerms(formError, 'hpoIDs', hpoIDs, 'geneFunctionConsistentWithPhenotype.phenotypeHPO');
            }
            else if (this.state.experimentalType == 'Protein Interactions') {
                // Check form for Protein Interactions panel
                // check geneSymbols
                if (!this.getFormValue('geneImplicatedInDisease')) {
                    formError = true;
                    this.setFormErrors('geneImplicatedInDisease', "Please see note below.");
                }
                geneSymbols = curator.capture.genes(this.getFormValue('interactingGenes'));
                formError = this.validateFormTerms(formError, 'geneSymbols', geneSymbols, 'interactingGenes');
            }
            else if (this.state.experimentalType == 'Expression') {
                // Check form for Expression panel
                if (this.state.experimentalSubtype.charAt(0) == 'B' && !this.getFormValue('alteredExpression.expressedInPatients')) {
                    formError = true;
                    this.setFormErrors('alteredExpression.expressedInPatients', "Please see note below.");
                }
                // check uberonIDs
                uberonIDs = curator.capture.uberonids(this.getFormValue('organOfTissue'));
                formError = this.validateFormTerms(formError, 'uberonIDs', uberonIDs, 'organOfTissue', 1);
            }
            else if (this.state.experimentalType == 'Functional Alteration') {
                // Check form for Functional Alterations panel
                // check clIDs/efoIDs depending on form selection
                if (this.getFormValue('cellMutationOrEngineeredEquivalent') === 'Patient cells') {
                    clIDs = curator.capture.clids(this.getFormValue('funcalt.patientCellType'));
                    formError = this.validateFormTerms(formError, 'clIDs', clIDs, 'funcalt.patientCellType', 1);
                } else if (this.getFormValue('cellMutationOrEngineeredEquivalent') === 'Engineered equivalent') {
                    efoIDs = curator.capture.efoids(this.getFormValue('funcalt.engineeredEquivalentCellType'));
                    formError = this.validateFormTerms(formError, 'efoIDs', efoIDs, 'funcalt.engineeredEquivalentCellType', 1);
                }
                // Make sure neither 'normalFunctionOfGene' nor 'normalFunctionOfGeneTerms' fields are empty
                if (!formError && !this.getFormValue('normalFunctionOfGene') && !this.getFormValue('normalFunctionOfGeneTerms')) {
                    formError = true;
                    this.setFormErrors('normalFunctionOfGene', 'Enter GO ID and/or free text.');
                    this.setFormErrors('normalFunctionOfGeneTerms', 'Enter GO ID and/or free text.');
                }
                // check goSlimIDs
                if (this.getFormValue('normalFunctionOfGene')) {
                    goSlimIDs = curator.capture.goslims(this.getFormValue('normalFunctionOfGene'));
                    formError = this.validateFormTerms(formError, 'goSlimIds', goSlimIDs, 'normalFunctionOfGene', 1);
                }
            }
            else if (this.state.experimentalType == 'Model Systems') {
                // Check form for Model Systems panel
                // check efoIDs depending on form selection
                if (this.getFormValue('animalOrCellCulture') === 'Engineered equivalent') {
                    efoIDs = curator.capture.efoids(this.getFormValue('cellCulture'));
                    formError = this.validateFormTerms(formError, 'efoIDs', efoIDs, 'funcalt.cellCulture', 1);
                }
                // check hpoIDs
                if (this.getFormValue('model.phenotypeHPO') !== '') {
                    hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPO'));
                    formError = this.validateFormTerms(formError, 'hpoIDs', hpoIDs, 'model.phenotypeHPO');
                }
                // check hpoIDs part 2
                if (this.getFormValue('model.phenotypeHPOObserved') !== '') {
                    hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPOObserved'));
                    formError = this.validateFormTerms(formError, 'hpoIDs', hpoIDs, 'model.phenotypeHPOObserved');
                }
            }
            else if (this.state.experimentalType == 'Rescue') {
                // Check form for Rescue panel
                // check clIDs/efoIDs depending on form selection
                if (!this.getFormValue('wildTypeRescuePhenotype')) {
                    formError = true;
                    this.setFormErrors('wildTypeRescuePhenotype', "Please see note below.");
                }
                if (this.getFormValue('patientCellOrEngineeredEquivalent') === 'Patient cells') {
                    clIDs = curator.capture.clids(this.getFormValue('rescue.patientCellType'));
                    formError = this.validateFormTerms(formError, 'clIDs', clIDs, 'rescue.patientCellType', 1);
                } else if (this.getFormValue('patientCellOrEngineeredEquivalent') === 'Engineered equivalent') {
                    efoIDs = curator.capture.efoids(this.getFormValue('rescue.engineeredEquivalentCellType'));
                    formError = this.validateFormTerms(formError, 'efoIDs', efoIDs, 'rescue.engineeredEquivalentCellType', 1);
                }
                // check hpoIDs
                if (this.getFormValue('rescue.phenotypeHPO') !== '') {
                    hpoIDs = curator.capture.hpoids(this.getFormValue('rescue.phenotypeHPO'));
                    formError = this.validateFormTerms(formError, 'hpoIDs', hpoIDs, 'rescue.phenotypeHPO');
                }
            }

            if (!formError) {
                // form passed error checking
                var newExperimental = {};
                var experimentalDataVariants = [];
                var savedExperimental;
                newExperimental.label = this.getFormValue('experimentalName');
                newExperimental.evidenceType = this.getFormValue('experimentalType');
                // prepare experimental object for post/putting to db
                // copy assessments over
                if (this.state.experimental) {
                    if (this.state.experimental.assessments && this.state.experimental.assessments.length) {
                        newExperimental.assessments = [];
                        for (var i = 0; i < this.state.experimental.assessments.length; i++) {
                            newExperimental.assessments.push(this.state.experimental.assessments[i]['@id']);
                        }
                    }
                }
                if (newExperimental.evidenceType == 'Biochemical Function') {
                    // newExperimental object for type Biochemical Function
                    newExperimental.biochemicalFunction = {};
                    var BFidentifiedFunction = this.getFormValue('identifiedFunction');
                    if (BFidentifiedFunction) {
                        newExperimental.biochemicalFunction.identifiedFunction = BFidentifiedFunction;
                    }
                    var BFidentifiedFunctionTerms = this.getFormValue('identifiedFunctionTerms');
                    if (BFidentifiedFunctionTerms) {
                        newExperimental.biochemicalFunction.identifiedFunctionTerms = BFidentifiedFunctionTerms;
                    }
                    var BFevidenceForFunction = this.getFormValue('evidenceForFunction');
                    if (BFevidenceForFunction) {
                        newExperimental.biochemicalFunction.evidenceForFunction = BFevidenceForFunction;
                    }
                    var BFevidenceForFunctionInPaper = this.getFormValue('evidenceForFunctionInPaper');
                    if (BFevidenceForFunctionInPaper) {
                        newExperimental.biochemicalFunction.evidenceForFunctionInPaper = BFevidenceForFunctionInPaper;
                    }
                    if (this.state.experimentalSubtype.charAt(0) == 'A') {
                        newExperimental.biochemicalFunction['geneWithSameFunctionSameDisease'] = {};
                        var BFgenes = geneSymbols;
                        if (BFgenes) {
                            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes = BFgenes;
                        }
                        var BFevidenceForOtherGenesWithSameFunction = this.getFormValue('geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction');
                        if (BFevidenceForOtherGenesWithSameFunction) {
                            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction = BFevidenceForOtherGenesWithSameFunction;
                        }
                        var BFgeneImplicatedWithDisease = this.getFormValue('geneWithSameFunctionSameDisease.geneImplicatedWithDisease');
                        newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease = BFgeneImplicatedWithDisease;
                        var BFexplanationOfOtherGenes = this.getFormValue('geneWithSameFunctionSameDisease.explanationOfOtherGenes');
                        if (BFexplanationOfOtherGenes) {
                            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes = BFexplanationOfOtherGenes;
                        }
                        var BFGWSFSDevidenceInPaper = this.getFormValue('geneWithSameFunctionSameDisease.evidenceInPaper');
                        if (BFGWSFSDevidenceInPaper) {
                            newExperimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper = BFGWSFSDevidenceInPaper;
                        }
                    } else if (this.state.experimentalSubtype.charAt(0) == 'B') {
                        newExperimental.biochemicalFunction['geneFunctionConsistentWithPhenotype'] = {};
                        var BFphenotypeHPO = hpoIDs;
                        if (BFphenotypeHPO) {
                            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO = BFphenotypeHPO;
                        }
                        var BFphenotypeFreeText = this.getFormValue('geneFunctionConsistentWithPhenotype.phenotypeFreeText');
                        if (BFphenotypeFreeText) {
                            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText = BFphenotypeFreeText;
                        }
                        var BFexplanation = this.getFormValue('geneFunctionConsistentWithPhenotype.explanation');
                        if (BFexplanation) {
                            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation = BFexplanation;
                        }
                        var BFGFCWPevidenceInPaper = this.getFormValue('geneFunctionConsistentWithPhenotype.evidenceInPaper');
                        if (BFGFCWPevidenceInPaper) {
                            newExperimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper = BFGFCWPevidenceInPaper;
                        }
                    }
                } else if (newExperimental.evidenceType == 'Protein Interactions') {
                    // newExperimental object for type Protein Interactions
                    newExperimental.proteinInteractions = {};
                    var PIinteractingGenes = geneSymbols;
                    if (PIinteractingGenes) {
                        newExperimental.proteinInteractions.interactingGenes = PIinteractingGenes;
                    }
                    var PIinteractionType = this.getFormValue('interactionType');
                    if (PIinteractionType) {
                        newExperimental.proteinInteractions.interactionType = PIinteractionType;
                    }
                    var PIexperimentalInteractionDetection = this.getFormValue('experimentalInteractionDetection');
                    if (PIexperimentalInteractionDetection) {
                        newExperimental.proteinInteractions.experimentalInteractionDetection = PIexperimentalInteractionDetection;
                    }
                    var PIgeneImplicatedInDisease = this.getFormValue('geneImplicatedInDisease');
                    newExperimental.proteinInteractions.geneImplicatedInDisease = PIgeneImplicatedInDisease;
                    var PIrelationshipOfOtherGenesToDisese = this.getFormValue('relationshipOfOtherGenesToDisese');
                    if (PIrelationshipOfOtherGenesToDisese) {
                        newExperimental.proteinInteractions.relationshipOfOtherGenesToDisese = PIrelationshipOfOtherGenesToDisese;
                    }
                    var PIevidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (PIevidenceInPaper) {
                        newExperimental.proteinInteractions.evidenceInPaper = PIevidenceInPaper;
                    }
                } else if (newExperimental.evidenceType == 'Expression') {
                    // newExperimental object for type Expression
                    newExperimental.expression = {};
                    var EorganOfTissue = this.getFormValue('organOfTissue');
                    if (EorganOfTissue) {
                        newExperimental.expression.organOfTissue = EorganOfTissue;
                    }
                    if (this.state.experimentalSubtype.charAt(0) == 'A') {
                        newExperimental.expression['normalExpression'] = {};
                        var EexpressedInTissue = this.getFormValue('normalExpression.expressedInTissue');
                        newExperimental.expression.normalExpression.expressedInTissue = EexpressedInTissue;
                        var ENEevidence = this.getFormValue('normalExpression.evidence');
                        if (ENEevidence) {
                            newExperimental.expression.normalExpression.evidence = ENEevidence;
                        }
                        var ENEevidenceInPaper = this.getFormValue('normalExpression.evidenceInPaper');
                        if (ENEevidenceInPaper) {
                            newExperimental.expression.normalExpression.evidenceInPaper = ENEevidenceInPaper;
                        }
                    } else if (this.state.experimentalSubtype.charAt(0) == 'B') {
                        newExperimental.expression['alteredExpression'] = {};
                        var EexpressedInPatients = this.getFormValue('alteredExpression.expressedInPatients');
                        newExperimental.expression.alteredExpression.expressedInPatients = EexpressedInPatients;
                        var EAEevidence = this.getFormValue('alteredExpression.evidence');
                        if (EAEevidence) {
                            newExperimental.expression.alteredExpression.evidence = EAEevidence;
                        }
                        var EAEevidenceInPaper = this.getFormValue('alteredExpression.evidenceInPaper');
                        if (EAEevidenceInPaper) {
                            newExperimental.expression.alteredExpression.evidenceInPaper = EAEevidenceInPaper;
                        }
                    }
                } else if (newExperimental.evidenceType == 'Functional Alteration') {
                    // newExperimental object for type Functional Alteration
                    newExperimental.functionalAlteration = {};
                    var FAcellMutationOrEngineeredEquivalent = this.getFormValue('cellMutationOrEngineeredEquivalent');
                    if (FAcellMutationOrEngineeredEquivalent) {
                        newExperimental.functionalAlteration.cellMutationOrEngineeredEquivalent = FAcellMutationOrEngineeredEquivalent;
                    }
                    var FApatientCellType = this.getFormValue('funcalt.patientCellType');
                    if (FApatientCellType) {
                        newExperimental.functionalAlteration.patientCellType = FApatientCellType;
                    }
                    var FAengineeredEquivalentCellType = this.getFormValue('funcalt.engineeredEquivalentCellType');
                    if (FAengineeredEquivalentCellType) {
                        newExperimental.functionalAlteration.engineeredEquivalentCellType = FAengineeredEquivalentCellType;
                    }
                    var FAdescriptionOfGeneAlteration = this.getFormValue('descriptionOfGeneAlteration');
                    if (FAdescriptionOfGeneAlteration) {
                        newExperimental.functionalAlteration.descriptionOfGeneAlteration = FAdescriptionOfGeneAlteration;
                    }
                    var FAnormalFunctionOfGene = this.getFormValue('normalFunctionOfGene');
                    if (FAnormalFunctionOfGene) {
                        newExperimental.functionalAlteration.normalFunctionOfGene = FAnormalFunctionOfGene;
                    }
                    var FAnormalFunctionOfGeneTerms = this.getFormValue('normalFunctionOfGeneTerms');
                    if (FAnormalFunctionOfGeneTerms) {
                        newExperimental.functionalAlteration.normalFunctionOfGeneTerms = FAnormalFunctionOfGeneTerms;
                    }
                    var FAevidenceForNormalFunction = this.getFormValue('evidenceForNormalFunction');
                    if (FAevidenceForNormalFunction) {
                        newExperimental.functionalAlteration.evidenceForNormalFunction = FAevidenceForNormalFunction;
                    }
                    var FAevidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (FAevidenceInPaper) {
                        newExperimental.functionalAlteration.evidenceInPaper = FAevidenceInPaper;
                    }
                } else if (newExperimental.evidenceType == 'Model Systems') {
                    // newExperimental object for type Model Systems
                    newExperimental.modelSystems = {};
                    var MSanimalOrCellCulture = this.getFormValue('animalOrCellCulture');
                    if (MSanimalOrCellCulture) {
                        newExperimental.modelSystems.animalOrCellCulture = MSanimalOrCellCulture;
                    }
                    if (MSanimalOrCellCulture == 'Animal model') {
                        var MSanimalModel = this.getFormValue('animalModel');
                        if (MSanimalModel) {
                            newExperimental.modelSystems.animalModel = MSanimalModel;
                        }
                    } else if (MSanimalOrCellCulture == 'Engineered equivalent') {
                        var MScellCulture = this.getFormValue('cellCulture');
                        if (MScellCulture) {
                            newExperimental.modelSystems.cellCulture = MScellCulture;
                        }
                    }
                    var MSdescriptionOfGeneAlteration = this.getFormValue('descriptionOfGeneAlteration');
                    if (MSdescriptionOfGeneAlteration) {
                        newExperimental.modelSystems.descriptionOfGeneAlteration = MSdescriptionOfGeneAlteration;
                    }
                    var MSphenotypeHPO = this.getFormValue('model.phenotypeHPO');
                    if (MSphenotypeHPO) {
                        newExperimental.modelSystems.phenotypeHPO = MSphenotypeHPO;
                    }
                    var MSphenotypeFreeText = this.getFormValue('model.phenotypeFreeText');
                    if (MSphenotypeFreeText) {
                        newExperimental.modelSystems.phenotypeFreeText = MSphenotypeFreeText;
                    }
                    var MSphenotypeHPOObserved = this.getFormValue('model.phenotypeHPOObserved');
                    if (MSphenotypeHPOObserved) {
                        newExperimental.modelSystems.phenotypeHPOObserved = MSphenotypeHPOObserved;
                    }
                    var MSphenotypeFreetextObserved = this.getFormValue('phenotypeFreetextObserved');
                    if (MSphenotypeFreetextObserved) {
                        newExperimental.modelSystems.phenotypeFreetextObserved = MSphenotypeFreetextObserved;
                    }
                    var MSexplanation = this.getFormValue('explanation');
                    if (MSexplanation) {
                        newExperimental.modelSystems.explanation = MSexplanation;
                    }
                    var MSevidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (MSevidenceInPaper) {
                        newExperimental.modelSystems.evidenceInPaper = MSevidenceInPaper;
                    }
                } else if (newExperimental.evidenceType == 'Rescue') {
                    // newExperimental object for type Rescue
                    newExperimental.rescue = {};
                    var RpatientCellOrEngineeredEquivalent = this.getFormValue('patientCellOrEngineeredEquivalent');
                    if (RpatientCellOrEngineeredEquivalent) {
                        newExperimental.rescue.patientCellOrEngineeredEquivalent = RpatientCellOrEngineeredEquivalent;
                    }
                    var RpatientCellType = this.getFormValue('rescue.patientCellType');
                    if (RpatientCellType) {
                        newExperimental.rescue.patientCellType = RpatientCellType;
                    }
                    var RengineeredEquivalentCellType = this.getFormValue('rescue.engineeredEquivalentCellType');
                    if (RengineeredEquivalentCellType) {
                        newExperimental.rescue.engineeredEquivalentCellType = RengineeredEquivalentCellType;
                    }
                    var RdescriptionOfGeneAlteration = this.getFormValue('descriptionOfGeneAlteration');
                    if (RdescriptionOfGeneAlteration) {
                        newExperimental.rescue.descriptionOfGeneAlteration = RdescriptionOfGeneAlteration;
                    }
                    var RphenotypeHPO = this.getFormValue('rescue.phenotypeHPO');
                    if (RphenotypeHPO) {
                        newExperimental.rescue.phenotypeHPO = RphenotypeHPO;
                    }
                    var RphenotypeFreeText = this.getFormValue('rescue.phenotypeFreeText');
                    if (RphenotypeFreeText) {
                        newExperimental.rescue.phenotypeFreeText = RphenotypeFreeText;
                    }
                    var RrescueMethod = this.getFormValue('rescueMethod');
                    if (RrescueMethod) {
                        newExperimental.rescue.rescueMethod = RrescueMethod;
                    }
                    var RwildTypeRescuePhenotype = this.getFormValue('wildTypeRescuePhenotype');
                    newExperimental.rescue.wildTypeRescuePhenotype = RwildTypeRescuePhenotype;
                    var RpatientVariantRescue = this.getFormValue('patientVariantRescue');
                    newExperimental.rescue.patientVariantRescue = RpatientVariantRescue;
                    var Rexplanation = this.getFormValue('explanation');
                    if (Rexplanation) {
                        newExperimental.rescue.explanation = Rexplanation;
                    }
                    var RevidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (RevidenceInPaper) {
                        newExperimental.rescue.evidenceInPaper = RevidenceInPaper;
                    }
                }

                // Get variant uuid's if they were added via the modals
                for (var j = 0; j < this.state.variantCount; j++) {
                    // Grab the values from the variant form panel
                    var variantId = this.getFormValue('variantUuid' + j);

                    // Build the search string depending on what the user entered
                    if (variantId) {
                        // Make a search string for these terms
                        experimentalDataVariants.push('/variants/' + variantId);
                    }
                }

                var searchStr = '';
                this.setState({submitBusy: true});
                // Begin with empty promise
                new Promise(function(resolve, reject) {
                    resolve(1);
                }).then(diseases => {
                    if (geneSymbols && geneSymbols.length) {
                        // At least one gene symbol entered; search the DB for them.
                        searchStr = '/search/?type=gene&' + geneSymbols.map(function(symbol) { return 'symbol=' + symbol; }).join('&');
                        return this.getRestData(searchStr).then(genes => {
                            if (genes['@graph'].length === geneSymbols.length) {
                                // Successfully retrieved all genes
                                return Promise.resolve(genes);
                            } else {
                                var missingGenes = _.difference(geneSymbols, genes['@graph'].map(function(gene) { return gene.symbol; }));
                                if (newExperimental.evidenceType == 'Biochemical Function') {
                                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                                    this.setFormErrors('geneWithSameFunctionSameDisease.genes', missingGenes.join(', ') + ' not found');
                                } else if (newExperimental.evidenceType == 'Protein Interactions') {
                                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                                    this.setFormErrors('interactingGenes', missingGenes.join(', ') + ' not found');
                                }

                                throw genes;
                            }
                        });
                    } else {
                        // No genes entered; just pass null to the next then
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    let currExperimental = this.state.experimental;
                    let currExperimentalUuid = currExperimental && currExperimental.uuid;
                    let evidenceScores = []; // Holds new array of scores
                    let experimentalScores = currExperimental && currExperimental.scores && currExperimental.scores.length ? currExperimental.scores : [];
                    // Find any pre-existing score(s) and put their '@id' values into an array
                    if (experimentalScores.length) {
                        experimentalScores.forEach(score => {
                            evidenceScores.push(score['@id']);
                        });
                    }
                    /*************************************************************/
                    /* Either update or create the score status object in the DB */
                    /*************************************************************/
                    if (Object.keys(newUserScoreObj).length) {
                        if (this.state.userScoreObj.uuid) {
                            return this.putRestData('/evidencescore/' + this.state.userScoreObj.uuid, newUserScoreObj).then(modifiedScoreObj => {
                                // Only need to update the evidence score object
                                return Promise.resolve(evidenceScores);
                            });
                        } else {
                            return this.postRestData('/evidencescore/', newUserScoreObj).then(newScoreObject => {
                                if (newScoreObject) {
                                    // Add the new score to array
                                    evidenceScores.push(newScoreObject['@graph'][0]['@id']);
                                }
                                return Promise.resolve(evidenceScores);
                            });
                        }
                    } else {
                        return Promise.resolve(null);
                    }
                }).then(scoreArray => {
                    var promise;

                    // Add variants if they've been found
                    if (experimentalDataVariants.length > 0) {
                        newExperimental.variants = experimentalDataVariants;
                    }

                    // If we add a new score, add it to the experimental object
                    if (scoreArray && scoreArray.length) {
                        newExperimental.scores = scoreArray;
                    }

                    if (this.state.experimental) {
                        // We're editing a experimental. PUT the new group object to the DB to update the existing one.
                        promise = this.putRestData('/experimental/' + this.state.experimental.uuid, newExperimental).then(data => {
                            return Promise.resolve({data: data['@graph'][0], experimentalAdded: false});
                        });
                    } else {
                        // We created an experimental data item; post it to the DB
                        promise = this.postRestData('/experimental/', newExperimental).then(data => {
                            return Promise.resolve({data: data['@graph'][0], experimentalAdded: true});
                        }).then(newExperimental => {
                            savedExperimental = newExperimental.data;
                            if (!this.state.experimental) {
                                return this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                                    // Get a flattened copy of the fresh annotation object and put our new experimental data into it,
                                    // ready for writing.
                                    var annotation = curator.flatten(freshAnnotation);
                                    if (!annotation.experimentalData) {
                                        annotation.experimentalData = [];
                                    }
                                    annotation.experimentalData.push(newExperimental.data['@id']);

                                    // Post the modified annotation to the DB
                                    return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(data => {
                                        return Promise.resolve({data: newExperimental.data, experimentalAdded: newExperimental.experimentalAdded});
                                    });
                                });
                            } else {
                                return Promise.resolve({data: newExperimental.data, experimentalAdded: newExperimental.experimentalAdded});
                            }
                        });
                    }

                    return promise;
                }).then(data => {
                    // Record history of the group creation
                    var meta, historyPromise;
                    if (data.experimentalAdded) {
                        // Record the creation of new experimental data
                        meta = {
                            experimental: {
                                gdm: this.state.gdm['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        historyPromise = this.recordHistory('add', data.data, meta);
                    } else {
                        // Record the modification of an existing group
                        historyPromise = this.recordHistory('modify', data.data);
                    }

                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        var tempExperimentalUuid = savedExperimental ? savedExperimental.uuid : this.state.experimental.uuid;
                        this.context.navigate('/experimental-submit/?gdm=' + this.state.gdm.uuid + '&experimental=' + tempExperimentalUuid + '&evidence=' + this.state.annotation.uuid);
                    }
                }).catch(function(e) {
                    console.log('EXPERIMENTAL DATA ERROR=: %o', e);
                });
            }
        }
    },

    // Add another variant section to the FamilyVariant panel
    handleAddVariant: function() {
        this.setState({variantCount: this.state.variantCount + 1, addVariantDisabled: true});
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateVariantId: function(data, fieldNum) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        var addVariantDisabled;
        if (data) {
            // Enable/Disable Add Variant button as needed
            if (fieldNum < MAX_VARIANTS - 1) {
                addVariantDisabled = false;
            } else {
                addVariantDisabled = true;
            }
            // Update the form and display values with new data
            this.refs['variantUuid' + fieldNum].setValue(data['uuid']);
            newVariantInfo[fieldNum] = {
                'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
                'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
                'carId': data.carId ? data.carId : null,
                'grch38': data.hgvsNames && data.hgvsNames.GRCh38 ? data.hgvsNames.GRCh38 : null,
                'uuid': data.uuid
            };
        } else {
            // Reset the form and display values
            this.refs['variantUuid' + fieldNum].setValue('');
            delete newVariantInfo[fieldNum];
        }
        // Set state
        this.setState({variantInfo: newVariantInfo, addVariantDisabled: addVariantDisabled});
    },

    // Method to fetch uniprot data from mygene.info
    getUniprotId(gdm) {
        if (gdm && gdm.gene && gdm.gene.entrezId) {
            let geneId = gdm.gene.entrezId;
            let fields = 'fields=uniprot.Swiss-Prot';
            this.getRestData(this.props.href_url.protocol + external_url_map['MyGeneInfo'] + geneId + '&species=human&' + fields).then(result => {
                let myGeneObj = result.hits[0];
                if (myGeneObj.uniprot && myGeneObj.uniprot['Swiss-Prot']) {
                    this.setState({uniprotId: myGeneObj.uniprot['Swiss-Prot']});
                }
            }).catch(err => {
                console.log('Fetch Error for Uniprot ID from MyGeneInfo =: %o', err);
            });
        }
    },

    render: function() {
        var gdm = this.state.gdm;
        var annotation = this.state.annotation;
        var pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        var experimental = this.state.experimental;
        /****************************************/
        /* Retain pre-existing assessments data */
        /****************************************/
        var assessments = experimental && experimental.assessments && experimental.assessments.length ? experimental.assessments : [];
        var validAssessments = [];
        _.map(assessments, assessment => {
            if (assessment.value !== 'Not Assessed') {
                validAssessments.push(assessment);
            }
        });
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the 'evidence', 'gdm', and 'experimental' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.experimentalUuid = queryKeyValue('experimental', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.experimentalUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/experimental-submit/?gdm=' + gdm.uuid + (experimental ? '&experimental=' + experimental.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        let uniprotId = this.state.uniprotId;

        // Find any pre-existing scores associated with the evidence
        let evidenceScores = experimental && experimental.scores && experimental.scores.length ? experimental.scores : [];
        let experimentalEvidenceType;
        if (this.state.experimentalType === 'Biochemical Function' || this.state.experimentalType === 'Protein Interactions' || this.state.experimentalType === 'Expression') {
            experimentalEvidenceType = null;
        } else if (this.state.experimentalType === 'Functional Alteration') {
            experimentalEvidenceType = this.state.functionalAlterationPCEE;
        } else if (this.state.experimentalType === 'Model Systems') {
            experimentalEvidenceType = this.state.modelSystemsNHACCM;
        } else if (this.state.experimentalType === 'Rescue') {
            experimentalEvidenceType = this.state.rescuePCEE;
        }

        return (
            <div>
                {(!this.queryValues.experimentalUuid || this.state.experimental) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(experimental ? 'Edit' : 'Curate') + ' Experimental Data Information'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    <span> &#x2F;&#x2F; {this.state.experimentalName ? <span> Experiment {this.state.experimentalName}</span> : <span className="no-entry">No entry</span>} {this.state.experimentalType && this.state.experimentalType != 'none' ? <span>({this.state.experimentalType})</span> : null}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {ExperimentalNameType.call(this)}
                                        </Panel>
                                        {this.state.experimentalType == 'Biochemical Function' && this.state.experimentalNameVisible ?
                                            <PanelGroup accordion><Panel title={this.state.experimentalSubtype.charAt(0) + ". Biochemical Function"} open>
                                                {TypeBiochemicalFunction.call(this, uniprotId)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Protein Interactions' ?
                                            <PanelGroup accordion><Panel title="Protein Interactions" open>
                                                {TypeProteinInteractions.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Expression' && this.state.experimentalNameVisible ?
                                            <PanelGroup accordion><Panel title={this.state.experimentalSubtype.charAt(0) + ". Expression"} open>
                                                {TypeExpression.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Functional Alteration' ?
                                            <PanelGroup accordion><Panel title="Functional Alteration" open>
                                                {TypeFunctionalAlteration.call(this, uniprotId)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Model Systems' ?
                                            <PanelGroup accordion><Panel title="Model Systems" open>
                                                {TypeModelSystems.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Rescue' ?
                                            <PanelGroup accordion><Panel title="Rescue" open>
                                                {TypeRescue.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {((this.state.experimentalType == 'Expression' && this.state.experimentalSubtype.charAt(0) != 'A') || this.state.experimentalType == 'Functional Alteration' || this.state.experimentalType == 'Model Systems' || this.state.experimentalType == 'Rescue') && this.state.experimentalNameVisible ?
                                            <PanelGroup accordion><Panel title="Experimental Data - Associated Variant(s)" open>
                                                {ExperimentalDataVariant.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalNameVisible ?
                                            <div>
                                                {validAssessments.length ?
                                                    <Panel panelClassName="panel-data">
                                                        <dl className="dl-horizontal">
                                                            <div>
                                                                <dt>Assessments</dt>
                                                                <dd>
                                                                    <div>
                                                                        {validAssessments.map(function(assessment, i) {
                                                                            return (
                                                                                <span key={assessment.uuid}>
                                                                                    {i > 0 ? <br /> : null}
                                                                                    {assessment.value+' ('+assessment.submitted_by.title+')'}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </dd>
                                                            </div>
                                                        </dl>
                                                    </Panel>
                                                : null}
                                                <PanelGroup accordion>
                                                    <Panel title="Experimental Data Score" panelClassName="experimental-evidence-score" open>
                                                        <ScoreExperimental evidence={experimental} experimentalType={this.state.experimentalType} experimentalEvidenceType={experimentalEvidenceType}
                                                            evidenceType="Experimental" session={session} handleUserScoreObj={this.handleUserScoreObj} formError={this.state.formError} />
                                                    </Panel>
                                                </PanelGroup>
                                            </div>
                                        : null}
                                        <div className="curation-submit clearfix">
                                            {this.state.experimentalType != '' && this.state.experimentalType != 'none' && this.state.experimentalNameVisible ?
                                                <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />

                                            : null}
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {experimental ?
                                                <DeleteButton gdm={gdm} parent={annotation} item={experimental} pmid={pmid} disabled={this.cv.othersAssessed} />
                                            : null}
                                            <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                        </div>
                                    </Form>
                                </div>
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});

globals.curator_page.register(ExperimentalCuration, 'curator_page', 'experimental-curation');


// Experimental Data Name and Type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var ExperimentalNameType = function() {
    var experimental = this.state.experimental;

    return (
        <div className="row form-row-helper">
            {!this.state.experimentalType || this.state.experimentalType == 'none' ?
                <div className="col-sm-7 col-sm-offset-5">
                    <p>Select which experiment type you would like to curate:</p>
                </div>
            : null}
            <Input type="select" ref="experimentalType" label="Experiment type:"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleChange}
                defaultValue="none" value={experimental && experimental.evidenceType ? experimental.evidenceType : 'none'}
                inputDisabled={this.state.experimental!=null || this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Biochemical Function">Biochemical Function</option>
                <option value="Protein Interactions">Protein Interactions</option>
                <option value="Expression">Expression</option>
                <option value="Functional Alteration">Functional Alteration</option>
                <option value="Model Systems">Model Systems</option>
                <option value="Rescue">Rescue</option>
            </Input>
            {!this.state.experimentalType || this.state.experimentalType == 'none' ?
                <div className="col-sm-7 col-sm-offset-5">
                    <p className="alert alert-info">
                        <strong>Biochemical Function</strong>: The gene product performs a biochemical function shared with other known genes in the disease of interest, OR the gene product is consistent with the observed phenotype(s)<br /><br />
                        <strong>Protein Interactions</strong>: The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest<br /><br />
                        <strong>Expression</strong>: The gene is expressed in tissues relevant to the disease of interest, OR the gene is altered in expression in patients who have the disease<br /><br />
                        <strong>Functional Alteration of gene/gene product</strong>: The gene and/or gene product function is demonstrably altered in patients carrying candidate mutations or engineered equivalents<br /><br />
                        <strong>Model Systems</strong>: Non-human animal OR cell-culture models with a similarly disrupted copy of the affected gene show a phenotype consistent with human disease state<br /><br />
                        <strong>Rescue</strong>: The cellular phenotype in patient-derived cells OR engineered equivalents can be rescued by addition of the wild-type gene product
                    </p>
                </div>
            : null}
            {this.state.experimentalTypeDescription.map(function(description, i) {
                return (
                    <div key={i} className="col-sm-7 col-sm-offset-5">
                        <p className="alert alert-info">{description}</p>
                    </div>
                );
            })}
            {this.state.experimentalType && this.state.experimentalType == 'Biochemical Function' ?
                <Input type="select" ref="experimentalSubtype" label="Please select which one (A or B) you would like to curate"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                    defaultValue="none" value={this.state.experimentalSubtype} handleChange={this.handleChange}
                    inputDisabled={this.state.experimental!=null || this.cv.othersAssessed} required>
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="A. Gene(s) with same function implicated in same disease">A. Gene(s) with same function implicated in same disease</option>
                    <option value="B. Gene function consistent with phenotype(s)">B. Gene function consistent with phenotype(s)</option>
                </Input>
            : null}
            {this.state.experimentalType && this.state.experimentalType == 'Expression' ?
                <Input type="select" ref="experimentalSubtype" label="Please select which one (A or B) you would like to curate"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                    defaultValue="none" value={this.state.experimentalSubtype} handleChange={this.handleChange}
                    inputDisabled={this.state.experimental!=null || this.cv.othersAssessed} required>
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="A. Gene normally expressed in tissue relevant to the disease">A. Gene normally expressed in tissue relevant to the disease</option>
                    <option value="B. Altered expression in Patients">B. Altered expression in Patients</option>
                </Input>
            : null}
            {this.state.experimentalNameVisible ?
                <Input type="text" ref="experimentalName" label="Experiment name:"
                    error={this.getFormError('experimentalName')} clearError={this.clrFormErrors.bind(null, 'experimentalName')} maxLength="60"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                    value={experimental && experimental.label ? experimental.label : ''}
                    handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} required />
            : null}
        </div>
    );
};

// Biochemical Function type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeBiochemicalFunction = function(uniprotId) {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    let BF_identifiedFunction, BF_identifiedFunctionTerms, BF_evidenceForFunction, BF_evidenceForFunctionInPaper;
    if (biochemicalFunction) {
        BF_identifiedFunction = biochemicalFunction.identifiedFunction ? biochemicalFunction.identifiedFunction : '';
        BF_identifiedFunctionTerms = biochemicalFunction.identifiedFunctionTerms ? biochemicalFunction.identifiedFunctionTerms : '';
        BF_evidenceForFunction = biochemicalFunction.evidenceForFunction ? biochemicalFunction.evidenceForFunction : '';
        BF_evidenceForFunctionInPaper = biochemicalFunction.evidenceForFunctionInPaper ? biochemicalFunction.evidenceForFunctionInPaper : '';
    }
    return (
        <div className="row form-row-helper">
            <p className="col-sm-7 col-sm-offset-5">
                Select a GO term for this gene (view <a href={dbxref_prefix_map['UniProtKB'] + uniprotId} target="_blank">existing GO annotations for this gene</a> in
                UniProt or search for a new term using <a href="https://www.ebi.ac.uk/QuickGO/" target="_blank">QuickGO</a>). The GO term must be from the GO aspect
                "Molecular Function" or "Biological Process." Search <a href="http://www.ebi.ac.uk/ols/ontologies/go" target="_blank">GO</a> using
                the <a href="http://www.ebi.ac.uk/ols/index" target="_blank">OLS</a>.
            </p>
            <Input type="text" ref="identifiedFunction" label={<span>Identified function of gene in this record <span className="normal">(GO ID)</span>:</span>}
                error={this.getFormError('identifiedFunction')} clearError={this.clrMultiFormErrors.bind(null, ['identifiedFunction', 'identifiedFunctionTerms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={BF_identifiedFunction} placeholder="e.g. GO:0008150" inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5">
                If no GO term is available then describe the function of the gene below.
            </p>
            <Input type="text" ref="identifiedFunctionTerms" label={<span>Identified function of gene in this record <span className="normal">(free text)</span>:</span>}
                error={this.getFormError('identifiedFunctionTerms')} clearError={this.clrMultiFormErrors.bind(null, ['identifiedFunction', 'identifiedFunctionTerms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={BF_identifiedFunctionTerms} inputDisabled={this.cv.othersAssessed} />
            <Input type="textarea" ref="evidenceForFunction" label="Evidence for above function:"
                error={this.getFormError('evidenceForFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={BF_evidenceForFunction} inputDisabled={this.cv.othersAssessed} required />
            <Input type="textarea" ref="evidenceForFunctionInPaper" label="Notes on where evidence found in paper:"
                error={this.getFormError('evidenceForFunctionInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunctionInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={BF_evidenceForFunctionInPaper} inputDisabled={this.cv.othersAssessed} />
            {this.state.experimentalSubtype == 'A. Gene(s) with same function implicated in same disease' ?
                TypeBiochemicalFunctionA.call(this)
            : null}
            {this.state.experimentalSubtype == 'B. Gene function consistent with phenotype(s)' ?
                TypeBiochemicalFunctionB.call(this)
            : null}
        </div>
    );
};

var TypeBiochemicalFunctionA = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    let BF_genes, BF_evidenceForOtherGenesWithSameFunction, BF_explanationOfOtherGenes, BF_evidenceInPaper;
    if (biochemicalFunction) {
        biochemicalFunction.geneWithSameFunctionSameDisease = biochemicalFunction.geneWithSameFunctionSameDisease ? biochemicalFunction.geneWithSameFunctionSameDisease : {};
        if (biochemicalFunction.geneWithSameFunctionSameDisease) {
            BF_genes = biochemicalFunction.geneWithSameFunctionSameDisease.genes ? biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(gene => { return gene.symbol; }).join(', ') : '';
            BF_evidenceForOtherGenesWithSameFunction = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction : '';
            BF_explanationOfOtherGenes = biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes ? biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes : '';
            BF_evidenceInPaper = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper : '';
        }
    }
    return (
        <div>
            <Input type="text" ref="geneWithSameFunctionSameDisease.genes" label={<LabelGenesWithSameFunction />}
                error={this.getFormError('geneWithSameFunctionSameDisease.genes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.genes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="e.g. DICER1"
                value={BF_genes} handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} required />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction" label="Evidence that above gene(s) share same function with gene in record:"
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="5"
                value={BF_evidenceForOtherGenesWithSameFunction} inputDisabled={this.cv.othersAssessed} required />
            <Input type="text" ref="geneWithSameFunctionSameDisease.sharedDisease" label={<LabelSharedDisease />}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                value={"ORPHA" + this.state.gdm.disease.orphaNumber} inputDisabled={true} />
            <Input type="checkbox" ref="geneWithSameFunctionSameDisease.geneImplicatedWithDisease" label="Has this gene(s) been implicated in the above disease?:"
                error={this.getFormError('geneWithSameFunctionSameDisease.geneImplicatedWithDisease')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.geneImplicatedWithDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.geneImplicatedWithDisease} defaultChecked="false" handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the gene(s) entered above in this section have not been implicated in the disease, the criteria for counting this experimental evidence has not been met and cannot be submitted. Curate <a href={"/experimental-curation/?gdm=" + this.state.gdm.uuid + "&evidence=" + this.state.annotation.uuid}>new Experimental Data</a> or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Record Curation page</a>.</p>
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.explanationOfOtherGenes" label="How has this other gene(s) been implicated in the above disease?:"
                error={this.getFormError('geneWithSameFunctionSameDisease.explanationOfOtherGenes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.explanationOfOtherGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="5" value={BF_explanationOfOtherGenes}
                inputDisabled={!this.state.geneImplicatedWithDisease || this.cv.othersAssessed} required={this.state.geneImplicatedWithDisease} />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceInPaper" label="Additional comments:"
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="5"
                value={BF_evidenceInPaper} inputDisabled={!this.state.geneImplicatedWithDisease || this.cv.othersAssessed} />
        </div>
    );
};

// HTML labels for Biochemical Functions panel A
var LabelGenesWithSameFunction = React.createClass({
    render: function() {
        return <span>Other gene(s) with same function as gene in record <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HGNCHome']} target="_blank" title="HGNC homepage in a new tab">HGNC</a> symbol)</span>:</span>;
    }
});
var LabelSharedDisease = React.createClass({
    render: function() {
        return <span>Shared disease <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet in a new tab">Orphanet</a> ID)</span>:</span>;
    }
});

var TypeBiochemicalFunctionB = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    let BF_phenotypeHPO, BF_phenotypeFreeText, BF_explanation, BF_evidenceInPaper;
    if (biochemicalFunction) {
        biochemicalFunction.geneFunctionConsistentWithPhenotype = biochemicalFunction.geneFunctionConsistentWithPhenotype ? biochemicalFunction.geneFunctionConsistentWithPhenotype : {};
        if (biochemicalFunction.geneFunctionConsistentWithPhenotype) {
            BF_phenotypeHPO = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ') : '';
            BF_phenotypeFreeText = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText : '';
            BF_explanation = biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation ? biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation : '';
            BF_evidenceInPaper = biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper ? biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper : '';
        }
    }
    return (
        <div>
            {curator.renderPhenotype(null, 'Experimental')}
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.phenotypeHPO" label={<LabelHPOIDs />} rows="1"
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" placeholder="e.g. HP:0010704"
                value={BF_phenotypeHPO} handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} required={!this.state.biochemicalFunctionFT} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.phenotypeFreeText" label={<LabelPhenotypesFT />}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="2"
                value={BF_phenotypeFreeText} handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} required={!this.state.biochemicalFunctionHPO} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.explanation" label="Explanation of how phenotype is consistent with disease:"
                error={this.getFormError('geneFunctionConsistentWithPhenotype.explanation')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="5" value={BF_explanation}
                inputDisabled={!(this.state.biochemicalFunctionHPO || this.state.biochemicalFunctionFT) || this.cv.othersAssessed} required={this.state.biochemicalFunctionHPO || this.state.biochemicalFunctionFT} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.evidenceInPaper" label="Notes on where evidence found in paper:"
                error={this.getFormError('geneFunctionConsistentWithPhenotype.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" rows="5" value={BF_evidenceInPaper}
                inputDisabled={!(this.state.biochemicalFunctionHPO || this.state.biochemicalFunctionFT) || this.cv.othersAssessed} />
        </div>
    );
};

// HTML labels for Biochemical Functions panel B
var LabelHPOIDs = React.createClass({
    render: function() {
        return <span>Phenotype(s) consistent with function <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID)</span>:</span>;
    }
});
var LabelPhenotypesFT = React.createClass({
    render: function() {
        return <span>Phenotype(s) consistent with function <span style={{fontWeight: 'normal'}}>(free text)</span>:</span>;
    }
});

// Protein Interaction type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeProteinInteractions = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let proteinInteractions = experimental.proteinInteractions ? experimental.proteinInteractions : {};
    let PI_interactingGenes, PI_interactionType, PI_experimentalInteractionDetection, PI_relationshipOfOtherGenesToDisese, PI_evidenceInPaper;
    if (proteinInteractions) {
        PI_interactingGenes = proteinInteractions.interactingGenes ? proteinInteractions.interactingGenes.map(gene => { return gene.symbol; }).join(', ') : '';
        PI_interactionType = proteinInteractions.interactionType ? proteinInteractions.interactionType : 'none';
        PI_experimentalInteractionDetection = proteinInteractions.experimentalInteractionDetection ? proteinInteractions.experimentalInteractionDetection : 'none';
        PI_relationshipOfOtherGenesToDisese = proteinInteractions.relationshipOfOtherGenesToDisese ? proteinInteractions.relationshipOfOtherGenesToDisese : '';
        PI_evidenceInPaper = proteinInteractions.evidenceInPaper ? proteinInteractions.evidenceInPaper : '';
    }
    return (
        <div className="row form-row-helper">
            <Input type="text" ref="interactingGenes" label={<LabelInteractingGenes />}
                error={this.getFormError('interactingGenes')} clearError={this.clrFormErrors.bind(null, 'interactingGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={PI_interactingGenes} placeholder="e.g. DICER1" inputDisabled={this.cv.othersAssessed} required />
            <Input type="select" ref="interactionType" label="Interaction Type:" defaultValue="none"
                error={this.getFormError('interactionType')} clearError={this.clrFormErrors.bind(null, 'interactionType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                value={PI_interactionType} handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="physical association (MI:0915)">physical association (MI:0915)</option>
                <option value="genetic interaction (MI:0208)">genetic interaction (MI:0208)</option>
                <option value="negative genetic interaction (MI:0933)">negative genetic interaction (MI:0933)</option>
                <option value="positive genetic interaction (MI:0935)">positive genetic interaction (MI:0935)</option>
            </Input>
            <Input type="select" ref="experimentalInteractionDetection" label="Method by which interaction detected:"
                error={this.getFormError('experimentalInteractionDetection')} clearError={this.clrFormErrors.bind(null, 'experimentalInteractionDetection')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                defaultValue="none" value={PI_experimentalInteractionDetection} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="affinity chromatography technology (MI:0004)">affinity chromatography technology (MI:0004)</option>
                <option value="coimmunoprecipitation (MI:0019)">coimmunoprecipitation (MI:0019)</option>
                <option value="comigration in gel electrophoresis (MI:0807)">comigration in gel electrophoresis (MI:0807)</option>
                <option value="electron microscopy (MI:0040)">electron microscopy (MI:0040)</option>
                <option value="protein cross-linking with a bifunctional reagent (MI:0031)">protein cross-linking with a bifunctional reagent (MI:0031)</option>
                <option value="pull down (MI:0096)">pull down (MI:0096)</option>
                <option value="synthetic genetic analysis (MI:0441)">synthetic genetic analysis (MI:0441)</option>
                <option value="two hybrid (MI:0018)">two hybrid (MI:0018)</option>
                <option value="x-ray crystallography (MI:0114)">x-ray crystallography (MI:0114)</option>
            </Input>
            <Input type="checkbox" ref="geneImplicatedInDisease" label="Has this gene or genes been implicated in the above disease?:"
                error={this.getFormError('geneImplicatedInDisease')} clearError={this.clrFormErrors.bind(null, 'geneImplicatedInDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.geneImplicatedInDisease} defaultChecked="false" inputDisabled={this.cv.othersAssessed} handleChange={this.handleChange} />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the interacting gene(s) have not been associated with the disease, the criteria for counting this experimental evidence has not been met and cannot be submitted. Curate <a href={"/experimental-curation/?gdm=" + this.state.gdm.uuid + "&evidence=" + this.state.annotation.uuid}>new Experimental Data</a> or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Record Curation page</a>.</p>
            <Input type="textarea" ref="relationshipOfOtherGenesToDisese" label="Explanation of relationship of interacting gene(s):"
                error={this.getFormError('relationshipOfOtherGenesToDisese')} clearError={this.clrFormErrors.bind(null, 'relationshipOfOtherGenesToDisese')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={PI_relationshipOfOtherGenesToDisese}
                inputDisabled={!this.state.geneImplicatedInDisease || this.cv.othersAssessed} required={this.state.geneImplicatedInDisease} />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper"
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={PI_evidenceInPaper}inputDisabled={!this.state.geneImplicatedInDisease || this.cv.othersAssessed} />
        </div>
    );
};

// HTML labels for Protein Interactions panel
var LabelInteractingGenes = React.createClass({
    render: function() {
        return <span>Interacting gene(s) <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HGNCHome']} target="_blank" title="HGNC homepage in a new tab">HGNC</a> symbol)</span>:</span>;
    }
});

// Expression type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeExpression = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let expression = experimental.expression ? experimental.expression : {};
    let EXP_organOfTissue;
    if (expression) {
        EXP_organOfTissue = expression.organOfTissue ? expression.organOfTissue : '';
    }
    return (
        <div className="row form-row-helper">
            <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['Uberon']} target="_blank" title="Open Uberon in a new tab">Uberon</a> for an organ type (e.g. heart = UBERON_0015228)</p>
            <Input type="text" ref="organOfTissue" label={<LabelUberonId />}
                error={this.getFormError('organOfTissue')} clearError={this.clrFormErrors.bind(null, 'organOfTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={EXP_organOfTissue} placeholder="e.g. UBERON_0015228" inputDisabled={this.cv.othersAssessed} required />
            {this.state.experimentalSubtype == 'A. Gene normally expressed in tissue relevant to the disease' ?
                TypeExpressionA.call(this)
            : null}
            {this.state.experimentalSubtype == 'B. Altered expression in Patients' ?
                TypeExpressionB.call(this)
            : null}
        </div>
    );
};

// HTML labels for Expression panel.
var LabelUberonId = React.createClass({
    render: function() {
        return <span>Organ of tissue relevant to disease, in which gene expression is examined in patient <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['Uberon']} target="_blank" title="Open Uberon in a new tab">Uberon</a> ID)</span>:</span>;
    }
});

var TypeExpressionA = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let expression = experimental.expression ? experimental.expression : {};
    let EXP_normalExpression_evidence, EXP_normalExpression_evidenceInPaper;
    if (expression) {
        expression.normalExpression = expression.normalExpression ? expression.normalExpression : {};
        if (expression.normalExpression) {
            EXP_normalExpression_evidence = expression.normalExpression.evidence ? expression.normalExpression.evidence : '';
            EXP_normalExpression_evidenceInPaper = expression.normalExpression.evidenceInPaper ? expression.normalExpression.evidenceInPaper : '';
        }
    }
    return (
        <div>
            <Input type="checkbox" ref="normalExpression.expressedInTissue" label="Is the gene normally expressed in the above tissue?:"
                error={this.getFormError('normalExpression.expressedInTissue')} clearError={this.clrFormErrors.bind(null, 'normalExpression.expressedInTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.expressedInTissue} defaultChecked="false" handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the gene is not normally expressed in the above tissue, the criteria for counting this experimental evidence has not been met and cannot be submitted. Proceed to section B below or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Curation Central</a>.</p>
            <Input type="textarea" ref="normalExpression.evidence" label="Evidence for normal expression in disease tissue:"
                error={this.getFormError('normalExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={EXP_normalExpression_evidence} inputDisabled={!this.state.expressedInTissue || this.cv.othersAssessed} required={this.state.expressedInTissue} />
            <Input type="textarea" ref="normalExpression.evidenceInPaper" label="Notes on where evidence found:"
                error={this.getFormError('normalExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={EXP_normalExpression_evidenceInPaper} inputDisabled={!this.state.expressedInTissue || this.cv.othersAssessed} />
        </div>
    );
};

var TypeExpressionB = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let expression = experimental.expression ? experimental.expression : {};
    let EXP_alteredExpression_evidence, EXP_alteredExpression_evidenceInPaper;
    if (expression) {
        expression.alteredExpression = expression.alteredExpression ? expression.alteredExpression : {};
        if (expression.alteredExpression) {
            EXP_alteredExpression_evidence = expression.alteredExpression.evidence ? expression.alteredExpression.evidence : '';
            EXP_alteredExpression_evidenceInPaper = expression.alteredExpression.evidenceInPaper ? expression.alteredExpression.evidenceInPaper : '';
        }
    }
    return (
        <div>
            <Input type="checkbox" ref="alteredExpression.expressedInPatients" label="Is expression altered in patients who have the disease?:"
                error={this.getFormError('alteredExpression.expressedInPatients')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.expressedInPatients')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.expressedInPatients} defaultChecked="false" handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the expression is not altered in patients who have the disease, the criteria for counting this experimental evidence has not been met and cannot be submitted. Curate <a href={"/experimental-curation/?gdm=" + this.state.gdm.uuid + "&evidence=" + this.state.annotation.uuid}>new Experimental Data</a> or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Record Curation page</a>.</p>
            <Input type="textarea" ref="alteredExpression.evidence" label="Evidence for altered expression in patients:"
                error={this.getFormError('alteredExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={EXP_alteredExpression_evidence} inputDisabled={!this.state.expressedInPatients || this.cv.othersAssessed} required={this.state.expressedInPatients} />
            <Input type="textarea" ref="alteredExpression.evidenceInPaper" label="Notes on where evidence found in paper:"
                error={this.getFormError('alteredExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={EXP_alteredExpression_evidenceInPaper} inputDisabled={!this.state.expressedInPatients || this.cv.othersAssessed} />
        </div>
    );
};

// Functional Alteration type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeFunctionalAlteration = function(uniprotId) {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let functionalAlteration = experimental.functionalAlteration ? experimental.functionalAlteration : {};
    let FA_cellMutationOrEngineeredEquivalent, FA_patientCellType, FA_engineeredEquivalentCellType, FA_descriptionOfGeneAlteration,
        FA_normalFunctionOfGene, FA_normalFunctionOfGeneTerms, FA_evidenceForNormalFunction, FA_evidenceInPaper;
    if (functionalAlteration) {
        FA_cellMutationOrEngineeredEquivalent = functionalAlteration.cellMutationOrEngineeredEquivalent ? functionalAlteration.cellMutationOrEngineeredEquivalent : 'none';
        FA_patientCellType = functionalAlteration.patientCellType ? functionalAlteration.patientCellType : '';
        FA_engineeredEquivalentCellType = functionalAlteration.engineeredEquivalentCellType ? functionalAlteration.engineeredEquivalentCellType : '';
        FA_descriptionOfGeneAlteration = functionalAlteration.descriptionOfGeneAlteration ? functionalAlteration.descriptionOfGeneAlteration : '';
        FA_normalFunctionOfGene = functionalAlteration.normalFunctionOfGene ? functionalAlteration.normalFunctionOfGene : '';
        FA_normalFunctionOfGeneTerms = functionalAlteration.normalFunctionOfGeneTerms ? functionalAlteration.normalFunctionOfGeneTerms : '';
        FA_evidenceForNormalFunction = functionalAlteration.evidenceForNormalFunction ? functionalAlteration.evidenceForNormalFunction : '';
        FA_evidenceInPaper = functionalAlteration.evidenceInPaper ? functionalAlteration.evidenceInPaper : '';
    }
    return (
        <div className="row form-row-helper">
            <Input type="select" ref="cellMutationOrEngineeredEquivalent" label="Patient cells with candidate mutation or engineered equivalent?:"
                error={this.getFormError('cellMutationOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'cellMutationOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                defaultValue="none" value={FA_cellMutationOrEngineeredEquivalent} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Patient cells">Patient cells</option>
                <option value="Engineered equivalent">Engineered equivalent</option>
            </Input>
            {this.state.functionalAlterationPCEE == 'Patient cells' ?
                <div>
                    <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['CL']} target="_blank" title="Open CL Ontology Browser in a new tab">CL Ontology</a> for a cell type (e.g. fibroblast = CL_0000057)</p>
                    <Input type="textarea" ref="funcalt.patientCellType" label={<LabelFAPatientCellType />}
                        error={this.getFormError('funcalt.patientCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.patientCellType')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize"
                        rows="1" value={FA_patientCellType} placeholder="e.g. CL_0000057"
                        inputDisabled={this.cv.othersAssessed} required />
                </div>
            : null}
            {this.state.functionalAlterationPCEE == 'Engineered equivalent' ?
                <div>
                     <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> for a cell line (e.g. HepG2 = EFO_0001187)</p>
                    <Input type="textarea" ref="funcalt.engineeredEquivalentCellType" label={<LabelFAEngineeredEquivalent />}
                        error={this.getFormError('funcalt.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.engineeredEquivalentCellType')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize"
                        rows="1" value={FA_engineeredEquivalentCellType} placeholder="e.g. EFO_0001187"
                        inputDisabled={this.cv.othersAssessed} required />
                </div>
            : null}
            <p className="col-sm-7 col-sm-offset-5">
                Select a GO term for this gene (view <a href={dbxref_prefix_map['UniProtKB'] + uniprotId} target="_blank">existing GO annotations for this gene</a> in
                UniProt or search for a new term using <a href="https://www.ebi.ac.uk/QuickGO/" target="_blank">QuickGO</a>). The GO term must be from the GO aspect
                "Molecular Function" or "Biological Process." Search <a href="http://www.ebi.ac.uk/ols/ontologies/go" target="_blank">GO</a> using
                the <a href="http://www.ebi.ac.uk/ols/index" target="_blank">OLS</a>.
            </p>
            <Input type="text" ref="normalFunctionOfGene" label={<span>Normal function of gene/gene product <span className="normal">(GO ID)</span>:</span>}
                error={this.getFormError('normalFunctionOfGene')} clearError={this.clrMultiFormErrors.bind(null, ['normalFunctionOfGene', 'normalFunctionOfGeneTerms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={FA_normalFunctionOfGene} placeholder="e.g. GO:0006259" inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5">
                If no GO term is available then describe the normal function of the gene/gene product below.
            </p>
            <Input type="text" ref="normalFunctionOfGeneTerms" label={<span>Normal function of gene/gene product <span className="normal">(free text)</span>:</span>}
                error={this.getFormError('normalFunctionOfGeneTerms')} clearError={this.clrMultiFormErrors.bind(null, ['normalFunctionOfGene', 'normalFunctionOfGeneTerms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={FA_normalFunctionOfGeneTerms} inputDisabled={this.cv.othersAssessed} />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:"
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={FA_descriptionOfGeneAlteration} inputDisabled={this.cv.othersAssessed} required />
            <Input type="textarea" ref="evidenceForNormalFunction" label="Evidence for altered function:"
                error={this.getFormError('evidenceForNormalFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForNormalFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={FA_evidenceForNormalFunction} inputDisabled={this.cv.othersAssessed} required />
            <Input type="textarea" ref="evidenceInPaper" label="Notes on where evidence found in paper:"
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={FA_evidenceInPaper} inputDisabled={this.cv.othersAssessed} />
        </div>
    );
};

// HTML labels for Functional Alterations panel.
var LabelFAPatientCellType = React.createClass({
    render: function() {
        return <span>Patient cell type <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['CL']} target="_blank" title="Open CL Ontology Browser in a new tab">CL Ontology</a> ID)</span>:</span>;
    }
});
var LabelFAEngineeredEquivalent = React.createClass({
    render: function() {
        return <span>Engineered equivalent cell type/line <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> ID)</span>:</span>;
    }
});

// Model Systems type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeModelSystems = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let modelSystems = experimental.modelSystems ? experimental.modelSystems : {};
    let MS_animalOrCellCulture, MS_animalModel, MS_cellCulture, MS_descriptionOfGeneAlteration,
        MS_phenotypeHPO, MS_phenotypeFreeText, MS_phenotypeHPOObserved, MS_phenotypeFreetextObserved,
        MS_explanation, MS_evidenceInPaper;
    if (modelSystems) {
        MS_animalOrCellCulture = modelSystems.animalOrCellCulture ? modelSystems.animalOrCellCulture : 'none';
        MS_animalModel = modelSystems.animalModel ? modelSystems.animalModel : 'none';
        MS_cellCulture = modelSystems.cellCulture ? modelSystems.cellCulture : '';
        MS_descriptionOfGeneAlteration = modelSystems.descriptionOfGeneAlteration ? modelSystems.descriptionOfGeneAlteration : '';
        MS_phenotypeHPO = modelSystems.phenotypeHPO ? modelSystems.phenotypeHPO : '';
        MS_phenotypeFreeText = modelSystems.phenotypeFreeText ? modelSystems.phenotypeFreeText : '';
        MS_phenotypeHPOObserved = modelSystems.phenotypeHPOObserved ? modelSystems.phenotypeHPOObserved : '';
        MS_phenotypeFreetextObserved = modelSystems.phenotypeFreetextObserved ? modelSystems.phenotypeFreetextObserved : '';
        MS_explanation = modelSystems.explanation ? modelSystems.explanation : '';
        MS_evidenceInPaper = modelSystems.evidenceInPaper ? modelSystems.evidenceInPaper : '';
    }
    return (
        <div className="row form-row-helper">
            <Input type="select" ref="animalOrCellCulture" label="Non-human animal or cell-culture model?:"
                error={this.getFormError('animalOrCellCulture')} clearError={this.clrFormErrors.bind(null, 'animalOrCellCulture')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                defaultValue="none" value={MS_animalOrCellCulture} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Animal model">Animal model</option>
                <option value="Engineered equivalent">Engineered equivalent</option>
            </Input>
            {this.state.modelSystemsNHACCM == 'Animal model' ?
                <div>
                    <Input type="select" ref="animalModel" label="Animal model:"
                        error={this.getFormError('animalModel')} clearError={this.clrFormErrors.bind(null, 'animalModel')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                        defaultValue="none" value={MS_animalModel} handleChange={this.handleChange}
                        inputDisabled={this.cv.othersAssessed} required>
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Cat (Felis catus) 9685">Cat (Felis catus) 9685</option>
                        <option value="Chicken (Gallus gallus) 9031">Chicken (Gallus gallus) 9031</option>
                        <option value="Chimpanzee (Pan troglodytes) 9598">Chimpanzee (Pan troglodytes) 9598</option>
                        <option value="Cow (Bos taurus) 9913">Cow (Bos taurus) 9913</option>
                        <option value="Dog (Canis lupus familaris) 9615">Dog (Canis lupus familaris) 9615</option>
                        <option value="Frog (Xenopus) 262014">Frog (Xenopus) 262014</option>
                        <option value="Fruit fly (Drosophila) 7215">Fruit fly (Drosophila) 7215</option>
                        <option value="Gerbil (Gerbilinae) 10045">Gerbil (Gerbilinae) 10045</option>
                        <option value="Guinea pig (Cavia porcellus) 10141">Guinea pig (Cavia porcellus) 10141</option>
                        <option value="Hamster (Cricetinae) 10026">Hamster (Cricetinae) 10026</option>
                        <option value="Macaque (Macaca) 9539">Macaque (Macaca) 9539</option>
                        <option value="Mouse (Mus musculus) 10090">Mouse (Mus musculus) 10090</option>
                        <option value="Pig (Sus scrofa) 9823">Pig (Sus scrofa) 9823</option>
                        <option value="Rabbit (Oryctolagus crunicu) 9986">Rabbit (Oryctolagus crunicu) 9986</option>
                        <option value="Rat (Rattus norvegicus) 10116">Rat (Rattus norvegicus) 10116</option>
                        <option value="Round worm (Carnorhabditis elegans) 6239">Round worm (Carnorhabditis elegans) 6239</option>
                        <option value="Sheep (Ovis aries) 9940">Sheep (Ovis aries) 9940</option>
                        <option value="Zebrafish (Daanio rerio) 7955">Zebrafish (Daanio rerio) 7955</option>
                    </Input>
                </div>
            : null}
            {this.state.modelSystemsNHACCM == 'Engineered equivalent' ?
                <div>
                    <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> for a cell line (e.g. HepG2 = EFO_0001187)</p>
                    <Input type="textarea" ref="cellCulture" label={<LabelCellCulture />}
                        error={this.getFormError('cellCulture')} clearError={this.clrFormErrors.bind(null, 'cellCulture')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize"
                        rows="1" value={MS_cellCulture} placeholder="e.g. EFO_0001187" inputDisabled={this.cv.othersAssessed} required />
                </div>
            : null}
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:"
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={MS_descriptionOfGeneAlteration} inputDisabled={this.cv.othersAssessed} required />
            {curator.renderPhenotype(null, 'Experimental')}
            <Input type="textarea" ref="model.phenotypeHPOObserved" label={<LabelPhenotypeObserved />} rows="1"
                error={this.getFormError('model.phenotypeHPOObserved')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPOObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={MS_phenotypeHPOObserved} placeholder="e.g. HP:0010704" handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.modelSystemsPOMSFT} />
            <Input type="textarea" ref="phenotypeFreetextObserved" label={<LabelPhenotypeObservedFT />}
                error={this.getFormError('phenotypeFreetextObserved')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreetextObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="2" value={MS_phenotypeFreetextObserved} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.modelSystemsPOMSHPO} />
            <Input type="textarea" ref="model.phenotypeHPO" label={<LabelPatientPhenotype />} rows="1"
                error={this.getFormError('model.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={MS_phenotypeHPO} placeholder="e.g. HP:0010704" handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.modelSystemsPPFT} />
            <Input type="textarea" ref="model.phenotypeFreeText" label={<LabelPatientPhenotypeFT />}
                error={this.getFormError('model.phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="2" value={MS_phenotypeFreeText} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.modelSystemsPPHPO} />
            <Input type="textarea" ref="explanation" label="Explanation of how model system phenotype is similar to phenotype observed in humans:"
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={MS_explanation} inputDisabled={this.cv.othersAssessed} required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper"
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={MS_evidenceInPaper} inputDisabled={this.cv.othersAssessed} />
        </div>
    );
};

// HTML labels for Model Systems panel.
var LabelCellCulture = React.createClass({
    render: function() {
        return <span>Cell-culture type/line <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> ID)</span>:</span>;
    }
});
var LabelPhenotypeObserved = React.createClass({
    render: function() {
        return <span>Phenotype(s) observed in model system <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID)</span>:</span>;
    }
});
var LabelPhenotypeObservedFT = React.createClass({
    render: function() {
        return <span>Phenotype(s) observed in model system <span style={{fontWeight: 'normal'}}>(free text)</span>:</span>;
    }
});
var LabelPatientPhenotype = React.createClass({
    render: function() {
        return <span>Human phenotype(s) <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID)</span>:</span>;
    }
});
var LabelPatientPhenotypeFT = React.createClass({
    render: function() {
        return <span>Human phenotype(s) <span style={{fontWeight: 'normal'}}>(free text)</span>:</span>;
    }
});

// Rescue type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeRescue = function() {
    let experimental = this.state.experimental ? this.state.experimental : {};
    let rescue = experimental.rescue ? experimental.rescue : {};
    let RES_patientCellOrEngineeredEquivalent, RES_patientCellType, RES_engineeredEquivalentCellType,
        RES_descriptionOfGeneAlteration, RES_phenotypeHPO, RES_phenotypeFreeText,
        RES_rescueMethod, RES_explanation, RES_evidenceInPaper;
    if (rescue) {
        RES_patientCellOrEngineeredEquivalent = rescue.patientCellOrEngineeredEquivalent ? rescue.patientCellOrEngineeredEquivalent : 'none';
        RES_patientCellType = rescue.patientCellType ? rescue.patientCellType : '';
        RES_engineeredEquivalentCellType = rescue.engineeredEquivalentCellType ? rescue.engineeredEquivalentCellType : '';
        RES_descriptionOfGeneAlteration = rescue.descriptionOfGeneAlteration ? rescue.descriptionOfGeneAlteration : '';
        RES_phenotypeHPO = rescue.phenotypeHPO ? rescue.phenotypeHPO : '';
        RES_phenotypeFreeText = rescue.phenotypeFreeText ? rescue.phenotypeFreeText : '';
        RES_rescueMethod = rescue.rescueMethod ? rescue.rescueMethod : '';
        RES_explanation = rescue.explanation ? rescue.explanation : '';
        RES_evidenceInPaper = rescue.evidenceInPaper ? rescue.evidenceInPaper : '';
    }
    return (
        <div className="row form-row-helper">
            <Input type="select" ref="patientCellOrEngineeredEquivalent" label="Patient cells with or engineered equivalent?:"
                error={this.getFormError('patientCellOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'patientCellOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                defaultValue="none" value={RES_patientCellOrEngineeredEquivalent} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Patient cells">Patient cells</option>
                <option value="Engineered equivalent">Engineered equivalent</option>
            </Input>
            {this.state.rescuePCEE == 'Patient cells' ?
                <div>
                    <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['CL']} target="_blank" title="Open CL Ontology Browser in a new tab">CL Ontology</a> for a cell type (e.g. fibroblast = CL_0000057)</p>
                    <Input type="textarea" ref="rescue.patientCellType" label={<LabelRPatientCellType />}
                        error={this.getFormError('rescue.patientCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.patientCellType')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize"
                        rows="1" value={RES_patientCellType} placeholder="e.g. CL_0000057" inputDisabled={this.cv.othersAssessed} required />
                </div>
            : null}
            {this.state.rescuePCEE == 'Engineered equivalent' ?
                <div>
                    <p className="col-sm-7 col-sm-offset-5">Search <a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> for a cell line (e.g. HepG2 = EFO_0001187)</p>
                    <Input type="textarea" ref="rescue.engineeredEquivalentCellType" label={<LabelREngineeredEquivalent />}
                        error={this.getFormError('rescue.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.engineeredEquivalentCellType')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize"
                        rows="1" value={RES_engineeredEquivalentCellType} placeholder="e.g. EFO_0001187" inputDisabled={this.cv.othersAssessed} required />
                </div>
            : null}
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:"
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={RES_descriptionOfGeneAlteration} inputDisabled={this.cv.othersAssessed} required />
            {curator.renderPhenotype(null, 'Experimental')}
            <Input type="textarea" ref="rescue.phenotypearea" label={<LabelPhenotypeRescue />} rows="1"
                error={this.getFormError('rescue.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input"
                value={RES_phenotypeHPO} placeholder="e.g. HP:0010704" handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.rescuePRFT} />
            <Input type="textarea" ref="rescue.phenotypeFreeText" label={<LabelPhenotypeRescueFT />}
                error={this.getFormError('rescue.phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="2" value={RES_phenotypeFreeText} handleChange={this.handleChange}
                inputDisabled={this.cv.othersAssessed} required={!this.state.rescuePRHPO} />
            <Input type="textarea" ref="rescueMethod" label="Description of method used to rescue:"
                error={this.getFormError('rescueMethod')} clearError={this.clrFormErrors.bind(null, 'rescueMethod')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={RES_rescueMethod} inputDisabled={this.cv.othersAssessed} required />
            <Input type="checkbox" ref="wildTypeRescuePhenotype" label="Does the wild-type rescue the above phenotype?:"
                error={this.getFormError('wildTypeRescuePhenotype')} clearError={this.clrFormErrors.bind(null, 'wildTypeRescuePhenotype')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.wildTypeRescuePhenotype} defaultChecked="false" handleChange={this.handleChange} inputDisabled={this.cv.othersAssessed} />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the wild-type version of the gene does not rescue the phenotype, the criteria of counting this experimental evidence has not been met and cannot be submitted. Curate <a href={"/experimental-curation/?gdm=" + this.state.gdm.uuid + "&evidence=" + this.state.annotation.uuid}>new Experimental Data</a> or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Record Curation page</a>.</p>
            <Input type="checkbox" ref="patientVariantRescue" label="Does patient variant rescue?:"
                error={this.getFormError('patientVariantRescue')} clearError={this.clrFormErrors.bind(null, 'patientVariantRescue')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                checked={this.state.patientVariantRescue} defaultChecked="false" inputDisabled={this.cv.othersAssessed} />
            <Input type="textarea" ref="explanation" label="Explanation of rescue of phenotype:"
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" value={RES_explanation} inputDisabled={!this.state.wildTypeRescuePhenotype || this.cv.othersAssessed} required={this.state.wildTypeRescuePhenotype} />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper"
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                rows="5" inputDisabled={!this.state.wildTypeRescuePhenotype || this.cv.othersAssessed} value={RES_evidenceInPaper} />
        </div>
    );
};

// HTML labels for Rescue panel
var LabelRPatientCellType = React.createClass({
    render: function() {
        return <span>Patient cell type <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['CL']} target="_blank" title="Open CL Ontology Browser in a new tab">CL Ontology</a> ID)</span>:</span>;
    }
});
var LabelREngineeredEquivalent = React.createClass({
    render: function() {
        return <span>Engineered equivalent cell type/line <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['EFO']} target="_blank" title="Open EFO Browser in a new tab">EFO</a> ID)</span>:</span>;
    }
});
var LabelPhenotypeRescue = React.createClass({
    render: function() {
        return <span>Phenotype to rescue <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID)</span>:</span>;
    }
});
var LabelPhenotypeRescueFT = React.createClass({
    render: function() {
        return <span>Phenotype to rescue <span style={{fontWeight: 'normal'}}>(free text)</span>:</span>;
    }
});

// Display the Experimental Data variant panel. The number of copies depends on the variantCount state variable.
var ExperimentalDataVariant = function() {
    var experimental = this.state.experimental;
    var variants = experimental && experimental.variants;

    return (
        <div className="row">
        {this.cv.othersAssessed ?
            <div>
                {variants.map(function(variant, i) {
                    return (
                        <div key={i} className="variant-view-panel variant-view-panel-edit">
                            <h5>Variant {i + 1}</h5>
                            <dl className="dl-horizontal">
                                {variant.clinvarVariantId ?
                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>ClinVar VariationID</dt>
                                            <dd><a href={external_url_map['ClinVarSearch'] + variant.clinvarVariantId} title={"ClinVar entry for variant " + variant.clinvarVariantId + " in new tab"} target="_blank">{variant.clinvarVariantId}</a></dd>
                                        </dl>
                                    </div>
                                : null }
                                {variant.clinvarVariantTitle ?
                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>ClinVar Preferred Title</dt>
                                            <dd>{variant.clinvarVariantTitle}</dd>
                                        </dl>
                                    </div>
                                : null }
                                {variant.otherDescription ?
                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>Other description</dt>
                                            <dd>{variant.otherDescription}</dd>
                                        </dl>
                                    </div>
                                : null }
                            </dl>
                        </div>
                    );
                })}
            </div>
        :
            <div>
                {!experimental || !variants || variants.length === 0 ?
                    <div className="row">
                        <p className="col-sm-7 col-sm-offset-5">If your Experimental data is about one or more variants, please add these variant(s) below</p>
                    </div>
                : null}
                {_.range(this.state.variantCount).map(i => {
                    var variant;

                    if (variants && variants.length) {
                        variant = variants[i];
                    }

                    return (
                        <div key={'variant' + i} className="variant-panel">
                            <div className="row">
                                <div className="col-sm-7 col-sm-offset-5">
                                    <p className="alert alert-warning">
                                        ClinVar VariationID should be provided in all instances it exists. This is the only way to associate probands from different studies with
                                        the same variant, and ensures the accurate counting of probands.
                                    </p>
                                </div>
                            </div>
                            {this.state.variantInfo[i] ?
                                <div>
                                    {this.state.variantInfo[i].clinvarVariantId ?
                                        <div className="row">
                                            <span className="col-sm-5 control-label"><label>{<LabelClinVarVariant />}</label></span>
                                            <span className="col-sm-7 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.variantInfo[i].clinvarVariantId} target="_blank">{this.state.variantInfo[i].clinvarVariantId}</a></span>
                                        </div>
                                    : null}
                                    {this.state.variantInfo[i].clinvarVariantTitle ?
                                        <div className="row">
                                            <span className="col-sm-5 control-label"><label>{<LabelClinVarVariantTitle />}</label></span>
                                            <span className="col-sm-7 text-no-input clinvar-preferred-title">{this.state.variantInfo[i].clinvarVariantTitle}</span>
                                        </div>
                                    : null}
                                    {this.state.variantInfo[i].carId ?
                                        <div className="row">
                                            <span className="col-sm-5 control-label"><label>{<LabelCARVariant />}</label></span>
                                            <span className="col-sm-7 text-no-input"><a href={`https:${external_url_map['CARallele']}${this.state.variantInfo[i].carId}.html`} target="_blank">{this.state.variantInfo[i].carId}</a></span>
                                        </div>
                                    : null}
                                    {!this.state.variantInfo[i].clinvarVariantTitle && this.state.variantInfo[i].grch38 ?
                                        <div className="row">
                                            <span className="col-sm-5 control-label"><label>{<LabelCARVariantTitle />}</label></span>
                                            <span className="col-sm-7 text-no-input">{this.state.variantInfo[i].grch38} (GRCh38)</span>
                                        </div>
                                    : null}
                                </div>
                            : null}
                            <Input type="text" ref={'variantUuid' + i} value={variant && variant.uuid ? variant.uuid : ''} handleChange={this.handleChange}
                                error={this.getFormError('variantUuid' + i)} clearError={this.clrFormErrors.bind(null, 'variantUuid' + i)}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" />
                            <div className="row">
                                <div className="form-group">
                                    <span className="col-sm-5 control-label">{!this.state.variantInfo[i] ? <label>Add Variant:{this.state.variantRequired ? ' *' : null}</label> : <label>Clear Variant Selection:</label>}</span>
                                    <span className="col-sm-7">
                                        {!this.state.variantInfo[i] || (this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId) ?
                                            <AddResourceId resourceType="clinvar" parentObj={{'@type': ['variantList', 'Individual'], 'variantList': this.state.variantInfo}}
                                                buttonText="Add ClinVar ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                                initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId} fieldNum={String(i)}
                                                updateParentForm={this.updateVariantId} buttonOnly={true} />
                                        : null}
                                        {!this.state.variantInfo[i] ? <span> - or - </span> : null}
                                        {!this.state.variantInfo[i] || (this.state.variantInfo[i] && !this.state.variantInfo[i].clinvarVariantId) ?
                                            <AddResourceId resourceType="car" parentObj={{'@type': ['variantList', 'Individual'], 'variantList': this.state.variantInfo}}
                                                buttonText="Add CA ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                                initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].carId} fieldNum={String(i)}
                                                updateParentForm={this.updateVariantId} buttonOnly={true} />
                                        : null}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {this.state.variantCount < MAX_VARIANTS ?
                    <div>
                        <Input type="button" ref="addvariant" inputClassName="btn-default btn-last pull-right" title={this.state.variantCount ? "Add another variant associated with Experimental data" : "Add variant associated with Experimental data"}
                            clickHandler={this.handleAddVariant} inputDisabled={this.state.addVariantDisabled || this.cv.othersAssessed} />
                    </div>
                : null}
            </div>
        }
        </div>
    );
};

var LabelClinVarVariant = React.createClass({
    render: function() {
        return <span><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Variation ID:</span>;
    }
});

var LabelClinVarVariantTitle = React.createClass({
    render: function() {
        return <span><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Preferred Title:</span>;
    }
});

var LabelCARVariant = React.createClass({
    render: function() {
        return <span><strong><a href={external_url_map['CAR']} target="_blank" title="ClinGen Allele Registry in a new tab">ClinGen Allele Registry</a> ID:{this.props.variantRequired ? ' *' : null}</strong></span>;
    }
});

var LabelCARVariantTitle = React.createClass({
    render: function() {
        return <span><strong>Genomic HGVS Title:</strong></span>;
    }
});

var LabelOtherVariant = React.createClass({
    render: function() {
        return <span>Other description <span style={{fontWeight: 'normal'}}>(only when ClinVar VariationID is not available)</span>:</span>;
    }
});

var NoteAssessment = React.createClass({
    render: function() {
        return (
            <div className="alert alert-warning">Note: The next release will provide a calculated score for this experimental evidence based on the information provided as well as the ability to adjust this score within the allowed range specified by the Clinical Validity Classification.</div>
        );
    }
});


var ExperimentalViewer = React.createClass({
    mixins: [FormMixin, RestMixin, AssessmentMixin, CuratorHistory],

    cv: {
        assessmentTracker: null, // Tracking object for a single assessment
        gdmUuid: '' // UUID of the GDM; passed in the query string
    },

    getInitialState: function() {
        return {
            assessments: null, // Array of assessments for the experimental data
            updatedAssessment: '', // Updated assessment value
            userScoreObj: {}, // Logged-in user's score object
            submitBusy: false, // True while form is submitting
            experimentalEvidenceType: null,
            formError: false
        };
    },

    // Called by child function props to update user score obj
    handleUserScoreObj: function(newUserScoreObj) {
        this.setState({userScoreObj: newUserScoreObj});
    },

    // Redirect to Curation-Central page
    handlePageRedirect: function() {
        let tempGdmPmid = curator.findGdmPmidFromObj(this.props.context);
        let tempGdm = tempGdmPmid[0];
        let tempPmid = tempGdmPmid[1];
        window.location.href = '/curation-central/?gdm=' + tempGdm.uuid + '&pmid=' + tempPmid;
    },

    // Handle the score submit button
    scoreSubmit: function(e) {
        let experimental = this.props.context;
        /*****************************************************/
        /* Experimental score status data object             */
        /*****************************************************/
        let newUserScoreObj = Object.keys(this.state.userScoreObj).length ? this.state.userScoreObj : {};

        if (Object.keys(newUserScoreObj).length) {
            if(newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && !newUserScoreObj.scoreExplanation) {
                this.setState({formError: true});
                return false;
            }
            this.setState({submitBusy: true});
            /***********************************************************/
            /* Either update or create the user score object in the DB */
            /***********************************************************/
            if (this.state.userScoreObj.uuid) {
                return this.putRestData('/evidencescore/' + this.state.userScoreObj.uuid, newUserScoreObj).then(modifiedScoreObj => {
                    this.setState({submitBusy: false});
                    return Promise.resolve(modifiedScoreObj['@graph'][0]['@id']);
                }).then(data => {
                    this.handlePageRedirect();
                });
            } else {
                return this.postRestData('/evidencescore/', newUserScoreObj).then(newScoreObject => {
                    let newScoreObjectUuid = null;
                    if (newScoreObject) {
                        newScoreObjectUuid = newScoreObject['@graph'][0]['@id'];
                    }
                    return Promise.resolve(newScoreObjectUuid);
                }).then(newScoreObjectUuid => {
                    return this.getRestData('/experimental/' + experimental.uuid, null, true).then(freshExperimental => {
                        // flatten both context and fresh experimental
                        let newExperimental = curator.flatten(experimental);
                        let freshFlatExperimental = curator.flatten(freshExperimental);
                        // take only the scores from the fresh experimental to not overwrite changes
                        // in newExperimental
                        newExperimental.scores = freshFlatExperimental.scores ? freshFlatExperimental.scores : [];
                        // push new score uuid to newExperimental's scores list
                        newExperimental.scores.push(newScoreObjectUuid);

                        return this.putRestData('/experimental/' + experimental.uuid, newExperimental).then(updatedExperimentalObj => {
                            this.setState({submitBusy: false});
                            return Promise.resolve(updatedExperimentalObj['@graph'][0]);
                        });
                    });
                }).then(data => {
                    this.handlePageRedirect();
                });
            }
        }
    },

    componentWillMount: function() {
        var experimental = this.props.context;

        // Get the GDM and Family UUIDs from the query string
        this.cv.gdmUuid = queryKeyValue('gdm', this.props.href);
        if (experimental && experimental.assessments && experimental.assessments.length) {
            this.setState({assessments: experimental.assessments});
        }

        if (typeof this.props.session.user_properties !== undefined) {
            var user = this.props.session && this.props.session.user_properties;
            this.loadAssessmentTracker(user);
        }

        if (experimental.evidenceType === 'Biochemical Function' || experimental.evidenceType === 'Protein Interactions' || experimental.evidenceType === 'Expression') {
            this.setState({experimentalEvidenceType: null});
        } else if (experimental.evidenceType === 'Functional Alteration') {
            this.setState({experimentalEvidenceType: experimental.functionalAlteration.cellMutationOrEngineeredEquivalent});
        } else if (experimental.evidenceType === 'Model Systems') {
            this.setState({experimentalEvidenceType: experimental.modelSystems.animalOrCellCulture});
        } else if (experimental.evidenceType === 'Rescue') {
            this.setState({experimentalEvidenceType: experimental.rescue.patientCellOrEngineeredEquivalent});
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (typeof nextProps.session.user_properties !== undefined && nextProps.session.user_properties != this.props.session.user_properties) {
            var user = nextProps.session && nextProps.session.user_properties;
            this.loadAssessmentTracker(user);
        }
    },

    loadAssessmentTracker: function(user) {
        var experimental = this.props.context;
        var assessments = this.state.assessments ? this.state.assessments : (experimental.assessments ? experimental.assessments : null);

        // Make an assessment tracker object once we get the logged in user info
        if (!this.cv.assessmentTracker && user) {
            var userAssessment;

            // Find if any assessments for the segregation are owned by the currently logged-in user
            if (assessments && assessments.length) {
                // Find the assessment belonging to the logged-in curator, if any.
                userAssessment = Assessments.userAssessment(assessments, user && user.uuid);
            }
            this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, experimental.evidenceType);
        }
    },

    render: function() {
        var experimental = this.props.context;
        /****************************************/
        /* Retain pre-existing assessments data */
        /****************************************/
        var assessments = this.state.assessments ? this.state.assessments : (experimental.assessments ? experimental.assessments : null);
        var validAssessments = [];
        _.map(assessments, assessment => {
            if (assessment.value !== 'Not Assessed') {
                validAssessments.push(assessment);
            }
        });
        var user = this.props.session && this.props.session.user_properties;
        var userExperimental = user && experimental && experimental.submitted_by ? user.uuid === experimental.submitted_by.uuid : false;
        var experimentalUserAssessed = false; // TRUE if logged-in user doesn't own the experimental data, but the experimental data's owner assessed it
        var othersAssessed = false; // TRUE if we own this experimental data, and others have assessed it
        var updateMsg = this.state.updatedAssessment ? 'Assessment updated to ' + this.state.updatedAssessment : '';

        // See if others have assessed
        if (userExperimental) {
            othersAssessed = Assessments.othersAssessed(assessments, user.uuid);
        }

        // Note if we don't own the experimental data, but the owner has assessed it
        if (user && experimental && experimental.submitted_by) {
            var experimentalUserAssessment = Assessments.userAssessment(assessments, experimental.submitted_by.uuid);
            if (experimentalUserAssessment && experimentalUserAssessment.value !== Assessments.DEFAULT_VALUE) {
                experimentalUserAssessed = true;
            }
        }

        var tempGdmPmid = curator.findGdmPmidFromObj(experimental);
        var tempGdm = tempGdmPmid[0];
        var tempPmid = tempGdmPmid[1];

        let evidenceScores = experimental && experimental.scores && experimental.scores.length ? experimental.scores : [];
        let experimentalEvidenceType = this.state.experimentalEvidenceType;

        return (
            <div>
                <ViewRecordHeader gdm={tempGdm} pmid={tempPmid} />
                <div className="container">
                    <div className="row curation-content-viewer">
                        <div className="viewer-titles">
                            <h1>View Experimental Data {experimental.label}</h1>
                            <h2>
                                {tempGdm ? <a href={'/curation-central/?gdm=' + tempGdm.uuid + (tempGdm ? '&pmid=' + tempPmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                <span> &#x2F;&#x2F; Experimental Data {experimental.label} ({experimental.evidenceType})</span>
                            </h2>
                        </div>

                        {experimental.evidenceType == 'Biochemical Function' ?
                        <Panel title="Biochemical Function" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Identified function of gene in this record</dt>
                                    <dd>{experimental.biochemicalFunction.identifiedFunction ? <a href={external_url_map['QuickGoSearch'] + experimental.biochemicalFunction.identifiedFunction} title={"GO entry for " + experimental.biochemicalFunction.identifiedFunction + " in new tab"} target="_blank">{experimental.biochemicalFunction.identifiedFunction}</a> : null}</dd>
                                </div>

                                <div>
                                    <dt>Evidence for above function</dt>
                                    <dd>{experimental.biochemicalFunction.evidenceForFunction}</dd>
                                </div>

                                <div>
                                    <dt>Notes on where evidence found in paper</dt>
                                    <dd>{experimental.biochemicalFunction.evidenceForFunctionInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Biochemical Function' && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction !== '' ?
                        <Panel title="A. Gene(s) with same function implicated in same disease" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Other gene(s) with same function as gene in record</dt>
                                    <dd>{experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(function(gene, i) {
                                        return <span key={gene.symbol}>{i > 0 ? ', ' : ''}<a href={external_url_map['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"} target="_blank">{gene.symbol}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Evidence that above gene(s) share same function with gene in record</dt>
                                    <dd>{experimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}</dd>
                                </div>

                                <div>
                                    <dt>This gene or genes have been implicated in the above disease</dt>
                                    <dd>{experimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>How has this other gene(s) been implicated in the above disease?</dt>
                                    <dd>{experimental.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}</dd>
                                </div>

                                <div>
                                    <dt>Additional comments</dt>
                                    <dd>{experimental.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Biochemical Function' && ((experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO && experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ') !== '') || (experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText && experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText !== '')) ?
                        <Panel title="B. Gene function consistent with phenotype" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>HPO ID(s)</dt>
                                    <dd>{experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO && experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype</dt>
                                    <dd>{experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}</dd>
                                </div>

                                <div>
                                    <dt>Explanation of how phenotype is consistent with disease</dt>
                                    <dd>{experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}</dd>
                                </div>

                                <div>
                                    <dt>Notes on where evidence found in paper</dt>
                                    <dd>{experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Protein Interactions' ?
                        <Panel title="Protein Interactions" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Interacting Gene(s)</dt>
                                    <dd>{experimental.proteinInteractions.interactingGenes && experimental.proteinInteractions.interactingGenes.map(function(gene, i) {
                                        return <span key={gene.symbol + '-' + i}>{i > 0 ? ', ' : ''}<a href={external_url_map['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"} target="_blank">{gene.symbol}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Interaction Type</dt>
                                    <dd>{experimental.proteinInteractions.interactionType}</dd>
                                </div>

                                <div>
                                    <dt>Method by which interaction detected</dt>
                                    <dd>{experimental.proteinInteractions.experimentalInteractionDetection}</dd>
                                </div>

                                <div>
                                    <dt>This gene or genes have been implicated in the above disease</dt>
                                    <dd>{experimental.proteinInteractions.geneImplicatedInDisease ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>Explanation of relationship of other gene(s) to the disease</dt>
                                    <dd>{experimental.proteinInteractions.relationshipOfOtherGenesToDisese}</dd>
                                </div>

                                <div>
                                    <dt>Information about where evidence can be found on paper</dt>
                                    <dd>{experimental.proteinInteractions.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Expression' ?
                        <Panel title="Expression" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Organ of tissue relevant to disease, in which gene expression is examined in patient</dt>
                                    <dd>{experimental.expression.organOfTissue ? <a href={external_url_map['UberonSearch'] + experimental.expression.organOfTissue} title={"Uberon entry for " + experimental.expression.organOfTissue + " in new tab"} target="_blank">{experimental.expression.organOfTissue}</a> : null}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Expression' && experimental.expression.normalExpression.expressedInTissue && experimental.expression.normalExpression.expressedInTissue == true ?
                        <Panel title="A. Gene normally expressed in tissue relevant to the disease" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>The gene is normally expressed in the above tissue</dt>
                                    <dd>{experimental.expression.normalExpression.expressedInTissue ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>Evidence for normal expression in disease tissue</dt>
                                    <dd>{experimental.expression.normalExpression.evidence}</dd>
                                </div>

                                <div>
                                    <dt>Notes on where evidence found in paper</dt>
                                    <dd>{experimental.expression.normalExpression.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Expression' && experimental.expression.alteredExpression.expressedInPatients && experimental.expression.alteredExpression.expressedInPatients == true ?
                        <Panel title="B. Altered expression in patients" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Expression is altered in patients who have the disease</dt>
                                    <dd>{experimental.expression.alteredExpression.expressedInPatients ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>Evidence for altered expression in patients</dt>
                                    <dd>{experimental.expression.alteredExpression.evidence}</dd>
                                </div>

                                <div>
                                    <dt>Notes on where evidence found in paper</dt>
                                    <dd>{experimental.expression.alteredExpression.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Functional Alteration' ?
                        <Panel title="Functional Alteration" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Patient cells with candidate mutation or engineered equivalent</dt>
                                    <dd>{experimental.functionalAlteration.cellMutationOrEngineeredEquivalent}</dd>
                                </div>

                                {experimental.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Patient cells' ?
                                    <div>
                                        <dt>Patient cell type</dt>
                                        <dd>{experimental.functionalAlteration.patientCellType ? <a href={external_url_map['CLSearch'] + experimental.functionalAlteration.patientCellType} title={"CL entry for " + experimental.functionalAlteration.patientCellType + " in new tab"} target="_blank">{experimental.functionalAlteration.patientCellType}</a> : null}</dd>
                                    </div>
                                :
                                    <div>
                                        <dt>Engineered cell type</dt>
                                        <dd>{experimental.functionalAlteration.engineeredEquivalentCellType ? <a href={external_url_map['EFO'] + experimental.functionalAlteration.engineeredEquivalentCellType} title={"EFO entry for " + experimental.functionalAlteration.engineeredEquivalentCellType + " in new tab"} target="_blank">{experimental.functionalAlteration.engineeredEquivalentCellType}</a> : null}</dd>
                                    </div>
                                }

                                <div>
                                    <dt>Description of gene alteration</dt>
                                    <dd>{experimental.functionalAlteration.descriptionOfGeneAlteration}</dd>
                                </div>

                                <div>
                                    <dt>Normal function of gene</dt>
                                    <dd>{experimental.functionalAlteration.normalFunctionOfGene ? <a href={external_url_map['QuickGoSearch'] + experimental.functionalAlteration.normalFunctionOfGene} title={"GO entry for " + experimental.functionalAlteration.normalFunctionOfGene + " in new tab"} target="_blank">{experimental.functionalAlteration.normalFunctionOfGene}</a> : null}</dd>
                                </div>

                                <div>
                                    <dt>Evidence for altered function</dt>
                                    <dd>{experimental.functionalAlteration.evidenceForNormalFunction}</dd>
                                </div>

                                <div>
                                    <dt>Notes on where evidence found in paper</dt>
                                    <dd>{experimental.functionalAlteration.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Model Systems' ?
                        <Panel title="Model Systems" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Non-human animal or cell-culture model?</dt>
                                    <dd>{experimental.modelSystems.animalOrCellCulture}</dd>
                                </div>

                                {experimental.modelSystems.animalOrCellCulture === 'Animal model' ?
                                    <div>
                                        <dt>Animal model</dt>
                                        <dd>{experimental.modelSystems.animalModel}</dd>
                                    </div>
                                :
                                    <div>
                                        <dt>Cell-culture type/line</dt>
                                        <dd>{experimental.modelSystems.cellCulture ? <a href={external_url_map['EFO'] + experimental.modelSystems.cellCulture} title={"EFO entry for " + experimental.modelSystems.cellCulture + " in new tab"} target="_blank">{experimental.modelSystems.cellCulture}</a> : null}</dd>
                                    </div>
                                }

                                <div>
                                    <dt>Description of gene alteration</dt>
                                    <dd>{experimental.modelSystems.descriptionOfGeneAlteration}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype(s) observed in model system (HPO)</dt>
                                    <dd>{experimental.modelSystems.phenotypeHPOObserved ? <a href={external_url_map['HPO'] + experimental.modelSystems.phenotypeHPOObserved} title={"HPO Browser entry for " + experimental.modelSystems.phenotypeHPOObserved + " in new tab"} target="_blank">{experimental.modelSystems.phenotypeHPOObserved}</a> : null}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype(s) observed in model system (free text)</dt>
                                    <dd>{experimental.modelSystems.phenotypeFreetextObserved}</dd>
                                </div>

                                <div>
                                    <dt>Human phenotype(s) (HPO)</dt>
                                    <dd>{experimental.modelSystems.phenotypeHPO ? <a href={external_url_map['HPO'] + experimental.modelSystems.phenotypeHPO} title={"HPO Browser entry for " + experimental.modelSystems.phenotypeHPO + " in new tab"} target="_blank">{experimental.modelSystems.phenotypeHPO}</a> : null}</dd>
                                </div>

                                <div>
                                    <dt>Human phenotype(s) (free text)</dt>
                                    <dd>{experimental.modelSystems.phenotypeFreeText}</dd>
                                </div>

                                <div>
                                    <dt>Explanation of how model system phenotype is similar to phenotype observed in humans</dt>
                                    <dd>{experimental.modelSystems.explanation}</dd>
                                </div>

                                <div>
                                    <dt>Information about where evidence can be found on paper</dt>
                                    <dd>{experimental.modelSystems.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.evidenceType == 'Rescue' ?
                        <Panel title="Rescue" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Patient cells with or engineered equivalent?</dt>
                                    <dd>{experimental.rescue.patientCellOrEngineeredEquivalent}</dd>
                                </div>

                                {experimental.rescue.patientCellOrEngineeredEquivalent === 'Patient cells' ?
                                    <div>
                                        <dt>Patient cell type</dt>
                                        <dd>{experimental.rescue.patientCellType ? <a href={external_url_map['CLSearch'] + experimental.rescue.patientCellType} title={"CL entry for " + experimental.rescue.patientCellType + " in new tab"} target="_blank">{experimental.rescue.patientCellType}</a> : null}</dd>
                                    </div>
                                :
                                    <div>
                                        <dt>Engineered equivalent cell type</dt>
                                        <dd>{experimental.rescue.engineeredEquivalentCellType ? <a href={external_url_map['EFO'] + experimental.rescue.engineeredEquivalentCellType} title={"EFO entry for " + experimental.rescue.engineeredEquivalentCellType + " in new tab"} target="_blank">{experimental.rescue.engineeredEquivalentCellType}</a> : null}</dd>
                                    </div>
                                }

                                <div>
                                    <dt>Description of gene alteration</dt>
                                    <dd>{experimental.rescue.descriptionOfGeneAlteration}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype to rescue</dt>
                                    <dd>{experimental.rescue.phenotypeHPO ? <a href={external_url_map['HPO'] + experimental.rescue.phenotypeHPO} title={"HPO Browser entry for " + experimental.rescue.phenotypeHPO + " in new tab"} target="_blank">{experimental.rescue.phenotypeHPO}</a> : null}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype to rescue</dt>
                                    <dd>{experimental.rescue.phenotypeFreeText}</dd>
                                </div>

                                <div>
                                    <dt>Method used to rescue</dt>
                                    <dd>{experimental.rescue.rescueMethod}</dd>
                                </div>

                                <div>
                                    <dt>The wild-type rescues the above phenotype</dt>
                                    <dd>{experimental.rescue.wildTypeRescuePhenotype ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>The patient variant rescues</dt>
                                    <dd>{experimental.rescue.patientVariantRescue ? 'Yes' : 'No'}</dd>
                                </div>

                                <div>
                                    <dt>Explanation of rescue of phenotype</dt>
                                    <dd>{experimental.rescue.explanation}</dd>
                                </div>

                                <div>
                                    <dt>Information about where evidence can be found on paper</dt>
                                    <dd>{experimental.rescue.evidenceInPaper}</dd>
                                </div>
                            </dl>
                        </Panel>
                        : null}
                        {experimental.variants && experimental.variants.length > 0 ?
                        <Panel title="Associated Variants" panelClassName="panel-data">
                            {experimental.variants.map(function(variant, i) {
                                return (
                                    <div key={'variant' + i} className="variant-view-panel">
                                        <h5>Variant {i + 1}</h5>
                                        {variant.clinvarVariantId ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinVar VariationID</dt>
                                                    <dd><a href={`${external_url_map['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`} target="_blank">{variant.clinvarVariantId}</a></dd>
                                                </dl>
                                            </div>
                                        : null }
                                        {variant.clinvarVariantTitle ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinVar Preferred Title</dt>
                                                    <dd>{variant.clinvarVariantTitle}</dd>
                                                </dl>
                                            </div>
                                        : null }
                                        {variant.carId ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinGen Allele Registry ID</dt>
                                                    <dd><a href={`http:${external_url_map['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`} target="_blank">{variant.carId}</a></dd>
                                                </dl>
                                            </div>
                                        : null }
                                        {!variant.clinvarVariantTitle && (variant.hgvsNames && variant.hgvsNames.GRCh38) ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>Genomic HGVS Title</dt>
                                                    <dd>{variant.hgvsNames.GRCh38} (GRCh38)</dd>
                                                </dl>
                                            </div>
                                        : null }
                                        {variant.otherDescription ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>Other description</dt>
                                                    <dd>{variant.otherDescription}</dd>
                                                </dl>
                                              </div>
                                        : null }
                                    </div>
                                );
                            })}
                        </Panel>
                        : null}
                        {/* Retain pre-existing assessments data in display */}
                        {validAssessments.length ?
                            <Panel panelClassName="panel-data">
                                <dl className="dl-horizontal">
                                    <div>
                                        <dt>Assessments</dt>
                                        <dd>
                                            <div>
                                                {validAssessments.map(function(assessment, i) {
                                                    return (
                                                        <span key={assessment.uuid}>
                                                            {i > 0 ? <br /> : null}
                                                            {assessment.value + ' (' + assessment.submitted_by.title + ')'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </dd>
                                    </div>
                                </dl>
                            </Panel>
                        : null}
                        {evidenceScores.length > 1 || (evidenceScores.length === 1 && !userExperimental)?
                            <Panel title="Experimental Data - Other Curator Scores" panelClassName="panel-data">
                                <ScoreViewer evidence={experimental} otherScores={true} session={this.props.session} />
                            </Panel>
                        : null}
                        {this.cv.gdmUuid && (evidenceScores.length > 0 || (evidenceScores.length < 1 && userExperimental)) ?
                            <Panel title="Experimental Data Score" panelClassName="experimental-evidence-score-viewer" open>
                                <ScoreExperimental evidence={experimental} experimentalType={experimental.evidenceType} experimentalEvidenceType={experimentalEvidenceType}
                                    evidenceType="Experimental" session={this.props.session} handleUserScoreObj={this.handleUserScoreObj} scoreSubmit={this.scoreSubmit} formError={this.state.formError} />
                            </Panel>
                        : null}
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(ExperimentalViewer, 'experimental');


// Display a history item for adding experimental data
var ExperimentalAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var experimental = history.primary;
        var gdm = history.meta.experimental.gdm;
        var article = history.meta.experimental.article;

        return (
            <div>
                Experimental data <a href={experimental['@id']}>{experimental.label}</a>
                <span> ({experimental.evidenceType}) added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a></span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ExperimentalAddHistory, 'experimental', 'add');


// Display a history item for modifying experimental data
var ExperimentModifyHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var experimental = history.primary;

        return (
            <div>
                Experimental data <a href={experimental['@id']}>{experimental.label}</a>
                <span> ({experimental.evidenceType}) modified</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ExperimentModifyHistory, 'experimental', 'modify');


// Display a history item for deleting experimental data
var ExperimentDeleteHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var experimental = history.primary;

        return (
            <div>
                <span>Experimental data {experimental.label} deleted</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ExperimentDeleteHistory, 'experimental', 'delete');
