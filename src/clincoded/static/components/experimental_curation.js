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

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
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

// Will be great to convert to 'const' when available
var MAX_VARIANTS = 5;

// Settings for this.state.varOption
var VAR_NONE = 0; // No variants entered in a panel
var VAR_SPEC = 1; // A specific variant (dbSNP, ClinVar, HGVS) entered in a panel
var VAR_OTHER = 2; // Other description entered in a panel

var ExperimentalCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            experimental: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            experimentalName: '', // Currently entered name of the group
            experimentalType: '',
            experimentalTypeDescription: '',
            geneImplicatedWithDisease: false, // checkbox state values
            geneImplicatedInDisease: false,
            expressedInTissue: false,
            expressedInPatients: false,
            patientVariantRescue: false,
            biochemicalFunctionsAOn: false, // form enabled/disabled checks
            biochemicalFunctionsBOn: false,
            functionalAlterationPCEE: '',
            modelSystemsNHACCM: '',
            rescuePCEE: '',
            variantCount: 0, // Number of variants to display
            variantOption: [], // One variant panel, and nothing entered
            addVariantDisabled: false, // True if Add Another Variant button enabled
        };
    },

    getExperimentalTypeDescription: function(item) {
        var experimentalTypeDescriptionList = {
            'Biochemical function': 'The gene product performs a biochemical function shared with other known genes in the disease of interest, or consistent with the phenotype',
            'Protein interactions': 'The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest',
            'Expression': 'The gene is expressed in tissues relevant to the disease of interest and/or is altered in expression in patients who have the disease',
            'Functional alteration of gene/gene product': 'The gene and/or gene product function is demonstrably altered in patients carrying candidate mutations of engineered equivalents',
            'Model systems': 'Non-human animal or cell-culture models with a similarly disrupted copy of the affected gene show a phenotype consistent with human disease state',
            'Rescue': 'The cellular phenotype in patient-derived cells or engineered equivalents can be rescued by addition of the wild-type gene product'
        };
        return experimentalTypeDescriptionList[item];
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        var clinvarid, othervariant;

        if (ref === 'experimentalName' && this.refs[ref].getValue()) {
            this.setState({experimentalName: this.refs[ref].getValue()});
        } else if (ref === 'experimentalType') {
            var tempExperimentalType = this.refs[ref].getValue();
            this.setState({
                experimentalType: tempExperimentalType,
                experimentalTypeDescription: this.getExperimentalTypeDescription(tempExperimentalType)
            });
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
        } else if (ref === 'patientVariantRescue') {
            this.setState({patientVariantRescue: this.refs[ref].toggleValue()});
        } else if (ref === 'geneWithSameFunctionSameDisease.genes') {
            if (this.refs[ref].getValue() !== '' ) {
                this.setState({biochemicalFunctionsAOn: true});
            }
            else {
                this.setState({biochemicalFunctionsAOn: false});
            }
        } else if (ref === 'geneFunctionConsistentWithPhenotype.phenotypeHPO') {
            if (this.refs[ref].getValue() !== '' || this.refs['geneFunctionConsistentWithPhenotype.phenotypeFreeText'].getValue()) {
                this.setState({biochemicalFunctionsBOn: true});
            }
            else {
                this.setState({biochemicalFunctionsBOn: false});
                this.refs['geneFunctionConsistentWithPhenotype.explanation'].resetValue();
                this.refs['geneFunctionConsistentWithPhenotype.evidenceInPaper'].resetValue();
            }
        } else if (ref === 'geneFunctionConsistentWithPhenotype.phenotypeFreeText') {
            if (this.refs[ref].getValue() !== '' || this.refs['geneFunctionConsistentWithPhenotype.phenotypeHPO'].getValue()) {
                this.setState({biochemicalFunctionsBOn: true});
            }
            else {
                this.setState({biochemicalFunctionsBOn: false});
                this.refs['geneFunctionConsistentWithPhenotype.explanation'].resetValue();
                this.refs['geneFunctionConsistentWithPhenotype.evidenceInPaper'].resetValue();
            }
        } else if (ref === 'cellMutationOrEngineeredEquivalent') {
            this.setState({functionalAlterationPCEE: this.refs['cellMutationOrEngineeredEquivalent'].getValue()});
            if (this.refs['cellMutationOrEngineeredEquivalent'].getValue() == 'Patient cells') {
                this.refs['funcalt.engineeredEquivalentCellType'].resetValue();
            } else if (this.refs['cellMutationOrEngineeredEquivalent'].getValue() == 'Engineered equivalent') {
                this.refs['funcalt.patientCellType'].resetValue();
            }
        } else if (ref === 'animalOrCellCulture') {
            this.setState({modelSystemsNHACCM: this.refs['animalOrCellCulture'].getValue()});
            if (this.refs['animalOrCellCulture'].getValue() === 'Animal model') {
                this.refs['cellCulture'].resetValue();
            } else if (this.refs['animalOrCellCulture'].getValue() === 'Engineered equivalent') {
                this.refs['animalModel'].resetValue();
            }
        } else if (ref === 'patientCellOrEngineeredEquivalent') {
            this.setState({rescuePCEE: this.refs['patientCellOrEngineeredEquivalent'].getValue()});
            if (this.refs['patientCellOrEngineeredEquivalent'].getValue() === 'Patient cells') {
                this.refs['rescue.engineeredEquivalentCellType'].resetValue();
            } else if (this.refs['patientCellOrEngineeredEquivalent'].getValue() === 'Engineered equivalent') {
                this.refs['rescue.patientCellType'].resetValue();
            }
        } else if (ref.substring(0, 3) === 'VAR') {
            // Disable Add Another Variant if no variant fields have a value (variant fields all start with 'VAR')
            // First figure out the last variant panel’s ref suffix, then see if any values in that panel have changed
            var lastVariantSuffix = (this.state.variantCount - 1) + '';
            var refSuffix = ref.match(/\d+$/);
            refSuffix = refSuffix && refSuffix[0];
            if (refSuffix && (lastVariantSuffix === refSuffix)) {
                // The changed item is in the last variant panel. If any fields in the last field have a value, disable
                // the Add Another Variant button.
                clinvarid = this.refs['VARclinvarid' + lastVariantSuffix].getValue();
                othervariant = this.refs['VARothervariant' + lastVariantSuffix].getValue();
                this.setState({addVariantDisabled: !(clinvarid || othervariant)});
            }

            // Disable fields depending on what fields have values in them.
            clinvarid = this.refs['VARclinvarid' + refSuffix].getValue();
            othervariant = this.refs['VARothervariant' + refSuffix].getValue();
            var currVariantOption = this.state.variantOption;
            if (othervariant) {
                // Something entered in Other; clear the ClinVar ID and set the variantOption state to disable it.
                this.refs['VARclinvarid' + refSuffix].resetValue();
                currVariantOption[refSuffix] = VAR_OTHER;
            } else if (clinvarid) {
                // Something entered in ClinCar ID; clear the Other field and set the variantOption state to disable it.
                this.refs['VARothervariant' + refSuffix].resetValue();
                currVariantOption[refSuffix] = VAR_SPEC;
            } else {
                // Nothing entered anywhere; enable everything.
                currVariantOption[refSuffix] = VAR_NONE;
            }
            this.setState({variantOption: currVariantOption});
        }
    },

    joinItems: function(input) {
        var outputArray = [];
        for (var i = 0; i < input.length; i++) {
            outputArray.push(input[i].symbol);
        }
        return outputArray.join(', ');
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
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            if (stateObj.experimental) {
                this.setState({
                    experimentalName: stateObj.experimental.label,
                    experimentalType: stateObj.experimental.evidenceType
                });
                if (stateObj.experimental.evidenceType === 'Biochemical function') {
                    if (stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease) {
                        this.setState({geneImplicatedWithDisease: stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease});
                    }
                    if (stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes && stateObj.experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.length > 0) {
                        this.setState({'biochemicalFunctionsAOn': true});
                    }
                    if (stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO && stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.length > 0) {
                        this.setState({'biochemicalFunctionsBOn': true});
                    }
                    if (stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText && stateObj.experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText !== '') {
                        this.setState({'biochemicalFunctionsBOn': true});
                    }
                } else if (stateObj.experimental.evidenceType === 'Protein interactions') {
                    if (stateObj.experimental.proteinInteractions.geneImplicatedInDisease) {
                        this.setState({geneImplicatedInDisease: stateObj.experimental.proteinInteractions.geneImplicatedInDisease});
                    }
                } else if (stateObj.experimental.evidenceType === 'Expression') {
                    if (stateObj.experimental.expression.normalExpression.expressedInTissue) {
                        this.setState({expressedInTissue: stateObj.experimental.expression.normalExpression.expressedInTissue});
                    }
                    if (stateObj.experimental.expression.alteredExpression.expressedInPatients) {
                        this.setState({expressedInPatients: stateObj.experimental.expression.alteredExpression.expressedInPatients});
                    }
                } else if (stateObj.experimental.evidenceType === 'Functional alteration of gene/gene product') {
                    this.setState({functionalAlterationPCEE: stateObj.experimental.functionalAlteration.cellMutationOrEngineeredEquivalent});
                } else if (stateObj.experimental.evidenceType === 'Model systems') {
                    this.setState({modelSystemsNHACCM: stateObj.experimental.modelSystems.animalOrCellCulture});
                } else if (stateObj.experimental.evidenceType === 'Rescue') {
                    this.setState({rescuePCEE: stateObj.experimental.rescue.patientCellOrEngineeredEquivalent});
                    if (stateObj.experimental.rescue.patientVariantRescue) {
                        this.setState({patientVariantRescue: stateObj.experimental.rescue.patientVariantRescue});
                    }
                }
                // See if we need to disable the Add Variant button based on the number of variants configured
                if (stateObj.experimental.variants) {
                    var variants = stateObj.experimental.variants;
                    if (variants && variants.length > 0) {
                        // We have variants
                        stateObj.variantCount = variants.length;
                        stateObj.addVariantDisabled = false;

                        var currVariantOption = [];
                        for (var i = 0; i < variants.length; i++) {
                            if (variants[i].clinvarVariantId) {
                                currVariantOption[i] = VAR_SPEC;
                            } else if (variants[i].otherDescription) {
                                currVariantOption[i] = VAR_OTHER;
                            } else {
                                currVariantOption[i] = VAR_NONE;
                            }
                        }
                        stateObj.variantOption = currVariantOption;
                    }
                }
            }

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

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault() && this.validateVariants()) {
            var groupGenes;
            var goSlimIDs, geneSymbols, hpoIDs, uberonIDs, efoIDs;
            var formError = false;

            if (this.state.experimentalType == 'Biochemical function') {
                // Check form for Biochemical Function panel
                goSlimIDs = curator.capture.goslims(this.getFormValue('identifiedFunction'));
                geneSymbols = curator.capture.genes(this.getFormValue('geneWithSameFunctionSameDisease.genes'));
                hpoIDs = curator.capture.hpoids(this.getFormValue('geneFunctionConsistentWithPhenotype.phenotypeHPO'));
                if (this.state.biochemicalFunctionsAOn === false && this.state.biochemicalFunctionsBOn === false){
                    formError = true;
                    this.setFormErrors('geneWithSameFunctionSameDisease.genes', 'One of these fields must be filled in');
                    this.setFormErrors('geneFunctionConsistentWithPhenotype.phenotypeHPO', 'One of these fields must be filled in');
                    this.setFormErrors('geneFunctionConsistentWithPhenotype.phenotypeFreeText', 'One of these fields must be filled in');
                }
                if (goSlimIDs && goSlimIDs.length && _(goSlimIDs).any(function(id) { return id === null; })) {
                    // GO_Slim ID is bad
                    formError = true;
                    this.setFormErrors('identifiedFunction', 'Use GO_Slim ID (e.g. GO:0012345)');
                }
                if (goSlimIDs.length > 1) {
                    // More than one GO_Slim ID specified
                    this.setFormErrors('identifiedFunction', 'Enter only one GO_Slim ID');
                }
                if (geneSymbols && geneSymbols.length && _(geneSymbols).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('geneWithSameFunctionSameDisease.genes', 'Use gene symbols (e.g. SMAD3) separated by commas');
                }
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('geneFunctionConsistentWithPhenotype.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
            }
            else if (this.state.experimentalType == 'Protein interactions') {
                // Check form for Protein Interactions panel
                geneSymbols = curator.capture.genes(this.getFormValue('interactingGenes'));
                if (geneSymbols && geneSymbols.length && _(geneSymbols).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('interactingGenes', 'Use gene symbols (e.g. SMAD3) separated by commas');
                }
            }
            else if (this.state.experimentalType == 'Expression') {
                // Check form for Expression panel
                uberonIDs = curator.capture.uberonids(this.getFormValue('organOfTissue'));
                if (this.state.expressedInTissue === false && this.state.expressedInPatients === false) {
                    formError = true;
                    this.setFormErrors('normalExpression.expressedInTissue', 'One of these evidences must be submitted');
                    this.setFormErrors('alteredExpression.expressedInPatients', 'One of these evidences must be submitted');
                }
                if (uberonIDs && uberonIDs.length && _(uberonIDs).any(function(id) { return id === null; })) {
                    // Uberon ID is bad
                    formError = true;
                    this.setFormErrors('organOfTissue', 'Use Uberon ID (e.g. UBERON_0000948)');
                }
                if (uberonIDs.length > 1) {
                    // More than one Uberon ID specified
                    this.setFormErrors('organOfTissue', 'Enter only one Uberon ID');
                }
            }
            else if (this.state.experimentalType == 'Functional alteration of gene/gene product') {
                // Check form for Functional Alterations panel
                goSlimIDs = curator.capture.goslims(this.getFormValue('normalFunctionOfGene'));
                if (this.getFormValue('cellMutationOrEngineeredEquivalent') === 'Patient cells') {
                    efoIDs = curator.capture.efoids(this.getFormValue('funcalt.patientCellType'));
                    if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                        // EFO ID is bad
                        formError = true;
                        this.setFormErrors('funcalt.patientCellType', 'Use EFO ID (e.g. 0000001)');
                    }
                    if (efoIDs.length > 1) {
                        // More than one EFO ID specified
                        this.setFormErrors('funcalt.patientCellType', 'Enter only one EFO ID');
                    }
                } else if (this.getFormValue('cellMutationOrEngineeredEquivalent') === 'Engineered equivalent') {
                    efoIDs = curator.capture.efoids(this.getFormValue('funcalt.engineeredEquivalentCellType'));
                    if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                        // EFO ID is bad
                        formError = true;
                        this.setFormErrors('funcalt.engineeredEquivalentCellType', 'Use EFO ID (e.g. 0000001)');
                    }
                    if (efoIDs.length > 1) {
                        // More than one EFO ID specified
                        this.setFormErrors('funcalt.engineeredEquivalentCellType', 'Enter only one EFO ID');
                    }
                }
                if (goSlimIDs && goSlimIDs.length && _(goSlimIDs).any(function(id) { return id === null; })) {
                    // GO_Slim ID is bad
                    formError = true;
                    this.setFormErrors('normalFunctionOfGene', 'Use GO_Slim ID (e.g. GO:0012345)');
                }
                if (goSlimIDs.length > 1) {
                    // More than one GO_Slim ID specified
                    this.setFormErrors('normalFunctionOfGene', 'Enter only one GO_Slim ID');
                }
            }
            else if (this.state.experimentalType == 'Model systems') {
                // Check form for Model Systems panel
                hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPO'));
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('model.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('model.phenotypeHPO', 'Enter only one HPO ID');
                }
                hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPOObserved'));
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('model.phenotypeHPOObserved', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('model.phenotypeHPOObserved', 'Enter only one HPO ID');
                }
            }
            else if (this.state.experimentalType == 'Rescue') {
                // Check form for Rescue panel
                hpoIDs = curator.capture.hpoids(this.getFormValue('rescue.phenotypeHPO'));
                if (this.getFormValue('patientCellOrEngineeredEquivalent') === 'Patient cells') {
                    efoIDs = curator.capture.efoids(this.getFormValue('rescue.patientCellType'));
                    if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                        // EFO ID is bad
                        formError = true;
                        this.setFormErrors('rescue.patientCellType', 'Use EFO ID (e.g. 0000001)');
                    }
                    if (efoIDs.length > 1) {
                        // More than one EFO ID specified
                        this.setFormErrors('rescue.patientCellType', 'Enter only one EFO ID');
                    }
                } else if (this.getFormValue('patientCellOrEngineeredEquivalent') === 'Engineered equivalent') {
                efoIDs = curator.capture.efoids(this.getFormValue('rescue.engineeredEquivalentCellType'));
                    if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                        // EFO ID is bad
                        formError = true;
                        this.setFormErrors('rescue.engineeredEquivalentCellType', 'Use EFO ID (e.g. 0000001)');
                    }
                    if (efoIDs.length > 1) {
                        // More than one EFO ID specified
                        this.setFormErrors('rescue.engineeredEquivalentCellType', 'Enter only one EFO ID');
                    }
                }
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('rescue.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('rescue.phenotypeHPO', 'Enter only one HPO ID');
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
                if (newExperimental.evidenceType == 'Biochemical function') {
                    // newExperimental object for type Rescue
                    newExperimental.biochemicalFunction = {geneWithSameFunctionSameDisease: {}, geneFunctionConsistentWithPhenotype: {}};
                    var BFidentifiedFunction = this.getFormValue('identifiedFunction');
                    if (BFidentifiedFunction) {
                        newExperimental.biochemicalFunction.identifiedFunction = BFidentifiedFunction;
                    }
                    var BFevidenceForFunction = this.getFormValue('evidenceForFunction');
                    if (BFevidenceForFunction) {
                        newExperimental.biochemicalFunction.evidenceForFunction = BFevidenceForFunction;
                    }
                    var BFevidenceForFunctionInPaper = this.getFormValue('evidenceForFunctionInPaper');
                    if (BFevidenceForFunctionInPaper) {
                        newExperimental.biochemicalFunction.evidenceForFunctionInPaper = BFevidenceForFunctionInPaper;
                    }
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
                } else if (newExperimental.evidenceType == 'Protein interactions') {
                    // newExperimental object for type Rescue
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
                    // newExperimental object for type Rescue
                    newExperimental.expression = {normalExpression: {}, alteredExpression: {}};
                    var EorganOfTissue = this.getFormValue('organOfTissue');
                    if (EorganOfTissue) {
                        newExperimental.expression.organOfTissue = EorganOfTissue;
                    }
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
                } else if (newExperimental.evidenceType == 'Functional alteration of gene/gene product') {
                    // newExperimental object for type Rescue
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
                    var FAevidenceForNormalFunction = this.getFormValue('evidenceForNormalFunction');
                    if (FAevidenceForNormalFunction) {
                        newExperimental.functionalAlteration.evidenceForNormalFunction = FAevidenceForNormalFunction;
                    }
                    var FAevidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (FAevidenceInPaper) {
                        newExperimental.functionalAlteration.evidenceInPaper = FAevidenceInPaper;
                    }
                } else if (newExperimental.evidenceType == 'Model systems') {
                    // newExperimental object for type Rescue
                    newExperimental.modelSystems = {};
                    var MSanimalOrCellCulture = this.getFormValue('animalOrCellCulture');
                    if (MSanimalOrCellCulture) {
                        newExperimental.modelSystems.animalOrCellCulture = MSanimalOrCellCulture;
                    }
                    var MSanimalModel = this.getFormValue('animalModel');
                    if (MSanimalModel) {
                        newExperimental.modelSystems.animalModel = MSanimalModel;
                    }
                    var MScellCulture = this.getFormValue('cellCulture');
                    if (MScellCulture) {
                        newExperimental.modelSystems.cellCulture = MScellCulture;
                    }
                    var MSdescriptionOfGeneAlteration = this.getFormValue('descriptionOfGeneAlteration');
                    if (MSdescriptionOfGeneAlteration) {
                        newExperimental.modelSystems.descriptionOfGeneAlteration = MSdescriptionOfGeneAlteration;
                    }
                    var MSphenotypeHPO = this.getFormValue('model.phenotypeHPO');
                    if (MSphenotypeHPO) {
                        newExperimental.modelSystems.phenotypeHPO = MSphenotypeHPO;
                    }
                    var MSphenotypeFreeText = this.getFormValue('phenotypeFreeText');
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
                    var RphenotypeFreeText = this.getFormValue('phenotypeFreeText');
                    if (RphenotypeFreeText) {
                        newExperimental.rescue.phenotypeFreeText = RphenotypeFreeText;
                    }
                    var RrescueMethod = this.getFormValue('rescueMethod');
                    if (RrescueMethod) {
                        newExperimental.rescue.rescueMethod = RrescueMethod;
                    }
                    var RwildTypeRescuePhenotype = this.getFormValue('wildTypeRescuePhenotype');
                    if (RwildTypeRescuePhenotype) {
                        newExperimental.rescue.wildTypeRescuePhenotype = RwildTypeRescuePhenotype;
                    }
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

                var searchStr = '';
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
                                if (newExperimental.evidenceType == 'Biochemical function') {
                                    this.setFormErrors('geneWithSameFunctionSameDisease.genes', missingGenes.join(', ') + ' not found');
                                } else if (newExperimental.evidenceType == 'Protein interactions') {
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
                    // See what variants from the form already exist in the DB (we don't search for "Other description"; each one
                    // of those kinds of variants generates a new variant object). For any that already exist, push them onto
                    // the array of the family's variants. For any that don't, pass them to the next THEN to write them to the DB.
                    var newVariants = [];

                    // Build an array of search strings for each of the ClinVar IDs entered in the form.
                    var searchStrs = [];
                    for (var i = 0; i < this.state.variantCount; i++) {
                        // Grab the values from the variant form panel
                        var clinvarId = this.getFormValue('VARclinvarid' + i);

                        // Build the search string depending on what the user entered
                        if (clinvarId) {
                            // Make a search string for these terms
                            searchStrs.push('/search/?type=variant&clinvarVariantId=' + clinvarId);
                        }
                    }

                    // If at least one variant search string built, perform the search
                    if (searchStrs.length) {
                        // Search DB for all matching terms for all variants entered
                        return this.getRestDatas(
                            searchStrs
                        ).then(results => {
                            // 'result' is an array of search results, one per search string. There should only be one result per array element --
                            // multiple results would show bad data, so just get the first if that happens. Should check that when the data is entered going forward.
                            results.forEach(function(result, i) {
                                if (result.total) {
                                    // Search got a result. Add a string for family.variants for this existing variant
                                    experimentalDataVariants.push('/variants/' + result['@graph'][0].uuid + '/');
                                } else {
                                    // Search got no result; make a new variant and save it in an array so we can write them.
                                    // Look for the term in the filters to see what term failed to find a match
                                    var termResult = _(result.filters).find(function(filter) { return filter.field === 'clinvarVariantId'; });
                                    if (termResult) {
                                        var newVariant = {};
                                        newVariant.clinvarVariantId = termResult.term;
                                        newVariants.push(newVariant);
                                    }
                                }
                            }, this);

                            // Pass new variant array to the next THEN to write them.
                            return Promise.resolve(newVariants);
                        });
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(newVariants);
                }).then(newVariants => {
                    // We're passed in a list of new clinVarRCV variant objects that need to be written to the DB.
                    // Now see if we need to add 'Other description' data. Search for any variants in the form with that field filled.
                    for (var i = 0; i < this.state.variantCount; i++) {
                        // Grab the values from the variant form panel
                        var otherVariantText = this.getFormValue('VARothervariant' + i).trim();

                        // Build the search string depending on what the user entered
                        if (otherVariantText) {
                            // Add this Other Description text to a new variant object
                            var newVariant = {};
                            newVariant.otherDescription = otherVariantText;
                            newVariants.push(newVariant);
                        }
                    }

                    // Now write the new variants to the DB, and push their @ids to the family variant
                    if (newVariants && newVariants.length) {
                        return this.postRestDatas(
                            '/variants/', newVariants
                        ).then(results => {
                            if (results && results.length) {
                                // Add the newly written variants to the family
                                results.forEach(result => {
                                    experimentalDataVariants.push('/variants/' + result['@graph'][0].uuid + '/');
                                });
                            }
                            return Promise.resolve(results);
                        });
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(null);
                }).then(data => {
                    var promise;

                    // Add variants if they've been found
                    if (experimentalDataVariants.length > 0) {
                        newExperimental.variants = experimentalDataVariants;
                    }

                    if (this.state.experimental) {
                        // We're editing a experimental. PUT the new group object to the DB to update the existing one.
                        promise = this.putRestData('/experimental/' + this.state.experimental.uuid, newExperimental).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        // We created an experimental data item; post it to the DB
                        promise = this.postRestData('/experimental/', newExperimental).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        }).then(newExperimental => {
                            savedExperimental = newExperimental;
                            if (!this.state.experimental) {
                                // Get a flattened copy of the annotation and put our new group into it,
                                // ready for writing.
                                var annotation = curator.flatten(this.state.annotation);
                                if (annotation.experimentalData) {
                                    annotation.experimentalData.push(newExperimental['@id']);
                                } else {
                                    annotation.experimentalData = [newExperimental['@id']];
                                }

                                // Post the modified annotation to the DB, then go back to Curation Central
                                return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation);
                            } else {
                                return Promise.resolve(null);
                            }
                        });
                    }

                    return promise;
                }).then(data => {
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

    // Validate that all the variant panels have properly-formatted input. Return true if they all do.
    validateVariants: function() {
        var valid;
        var anyInvalid = false;

        // Check Variant panel inputs for correct formats
        for (var i = 0; i < this.state.variantCount; i++) {
            var value = this.getFormValue('VARclinvarid' + i);
            if (value) {
                valid = value.match(/^\s*(\d{1,10})\s*$/i);
                if (!valid) {
                    this.setFormErrors('VARclinvarid' + i, 'Use ClinVar VariationIDs (e.g. 177676)');
                    anyInvalid = true;
                }
            }
        }

        return !anyInvalid;
    },

    render: function() {
        var gdm = this.state.gdm;
        var annotation = this.state.annotation;
        var experimental = this.state.experimental;
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get the 'evidence', 'gdm', and 'experimental' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.experimentalUuid = queryKeyValue('experimental', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        return (
            <div>
                {(!this.queryValues.experimentalUuid || this.state.experimental) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(experimental ? 'Edit' : 'Curate') + ' Experimental Data Information'}</h1>
                                <h2>Experiment Type: {this.state.experimentalType && this.state.experimentalType != 'none' ? <span><strong>{this.state.experimentalType}</strong></span> : <span className="no-entry">None specified</span>}</h2>
                                <h2>Experiment Name: {this.state.experimentalName ? <span>{this.state.experimentalName}</span> : <span className="no-entry">No entry</span>}</h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {ExperimentalNameType.call(this)}
                                        </Panel>
                                        {this.state.experimentalType == 'Biochemical function' ?
                                            <PanelGroup accordion>
                                                <Panel title="Biochemical function" open>
                                                    {TypeBiochemicalFunction.call(this)}
                                                </Panel>
                                                <Panel title="A. Gene(s) with same function implicated in same disease" open>
                                                    {TypeBiochemicalFunctionA.call(this)}
                                                </Panel>
                                                <Panel title="B. Gene function consistent with phenotype" open>
                                                    {TypeBiochemicalFunctionB.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Protein interactions' ?
                                            <PanelGroup accordion><Panel title="Protein interactions" open>
                                                {TypeProteinInteractions.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Expression' ?
                                            <PanelGroup accordion>
                                                <Panel title="Expression" open>
                                                    {TypeExpression.call(this)}
                                                </Panel>
                                                <Panel title="A. Gene normally expressed in tissue relevant to the disease" open>
                                                    {TypeExpressionA.call(this)}
                                                </Panel>
                                                <Panel title="B. Altered expression in Patients" open>
                                                    {TypeExpressionB.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Functional alteration of gene/gene product' ?
                                            <PanelGroup accordion><Panel title="Functional alteration of gene/gene product" open>
                                                {TypeFunctionalAlteration.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Model systems' ?
                                            <PanelGroup accordion><Panel title="Model systems" open>
                                                {TypeModelSystems.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType == 'Rescue' ?
                                            <PanelGroup accordion><Panel title="Rescue" open>
                                                {TypeRescue.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType != '' && this.state.experimentalType != 'none' ?
                                            <PanelGroup accordion><Panel title="Experimental Data - Associated Variant(s)" open>
                                                {ExperimentalDataVariant.call(this)}
                                            </Panel></PanelGroup>
                                        : null}
                                        {this.state.experimentalType != '' && this.state.experimentalType != 'none' ?
                                            <div className="curation-submit clearfix">
                                                <Input type="submit" inputClassName="btn-primary pull-right" id="submit" title="Save" />
                                                <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                            </div>
                                        : null}
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
        <div className="row experimental-data-form">
            <Input type="select" ref="experimentalType" label="Experiment type:" defaultValue="none" value={experimental && experimental.evidenceType} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Biochemical function</option>
                <option>Protein interactions</option>
                <option>Expression</option>
                <option>Functional alteration of gene/gene product</option>
                <option>Model systems</option>
                <option>Rescue</option>
            </Input>
            <Input type="text" ref="experimentalName" label="Experiment name:" value={experimental && experimental.label} handleChange={this.handleChange}
                error={this.getFormError('experimentalName')} clearError={this.clrFormErrors.bind(null, 'experimentalName')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            {this.state.experimentalType && this.state.experimentalType != 'none' ?
                <p className="col-sm-7 col-sm-offset-5">{this.state.experimentalTypeDescription}</p>
                : null}
        </div>
    );
};

// Biochemical Function type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeBiochemicalFunction = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    if (biochemicalFunction) {
        biochemicalFunction.identifiedFunction = biochemicalFunction.identifiedFunction ? biochemicalFunction.identifiedFunction : null;
        biochemicalFunction.evidenceForFunction = biochemicalFunction.evidenceForFunction ? biochemicalFunction.evidenceForFunction : null;
        biochemicalFunction.evidenceForFunctionInPaper = biochemicalFunction.evidenceForFunctionInPaper ? biochemicalFunction.evidenceForFunctionInPaper : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="text" ref="identifiedFunction" label={<LabelIdentifiedFunction />} value={biochemicalFunction.identifiedFunction} placeholder="e.g. GO:0008150"
                error={this.getFormError('identifiedFunction')} clearError={this.clrFormErrors.bind(null, 'identifiedFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="evidenceForFunction" label="Evidence for function:" rows="5" value={biochemicalFunction.evidenceForFunction}
                error={this.getFormError('evidenceForFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceForFunctionInPaper" label="Notes on where evidence found in paper:" rows="5" value={biochemicalFunction.evidenceForFunctionInPaper}
                error={this.getFormError('evidenceForFunctionInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunctionInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">There are 2 kinds of evidence that support Biochemical Function (see A. and B.). You can collect either or both - each kind counts as one piece of Biochemical Function evidence. Fill out the top section and then curate on A. and/or B.</p>
        </div>
    );
}

var TypeBiochemicalFunctionA = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    if (biochemicalFunction) {
        biochemicalFunction.geneWithSameFunctionSameDisease = biochemicalFunction.geneWithSameFunctionSameDisease ? biochemicalFunction.geneWithSameFunctionSameDisease : {};
        if (biochemicalFunction.geneWithSameFunctionSameDisease) {
            biochemicalFunction.geneWithSameFunctionSameDisease.genes = biochemicalFunction.geneWithSameFunctionSameDisease.genes ? this.joinItems(biochemicalFunction.geneWithSameFunctionSameDisease.genes) : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes = biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes ? biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.assessments = biochemicalFunction.geneWithSameFunctionSameDisease.assessments ? biochemicalFunction.geneWithSameFunctionSameDisease.assessments : null;
        }
    }
    return (
        <div className="row experimental-data-form">
            <Input type="text" ref="geneWithSameFunctionSameDisease.genes" label="Genes (HGNC):" value={biochemicalFunction.geneWithSameFunctionSameDisease.genes} placeholder="e.g. DICER1"
                error={this.getFormError('geneWithSameFunctionSameDisease.genes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.genes')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction" label="Evidence that above gene(s) share same function:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required={this.state.biochemicalFunctionsAOn} />
            <Input type="text" ref="geneWithSameFunctionSameDisease.sharedDisease" label="Shared disease (Orphanet):" value={this.state.gdm.gene.symbol}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={true} />
            <Input type="checkbox" ref="geneWithSameFunctionSameDisease.geneImplicatedWithDisease" label="Has this gene or genes been implicated in the above disease?:"
                checked={this.state.geneImplicatedWithDisease} defaultChecked="false" handleChange={this.handleChange}
                error={this.getFormError('geneWithSameFunctionSameDisease.geneImplicatedWithDisease')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.geneImplicatedWithDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the other gene(s) have not been implicated in the disease, the criteria for counting this experimental evidence has not been met and cannot be submitted. Proceed to section B below or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Curation Central</a>.</p>
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.explanationOfOtherGenes" label="How has this gene(s) been implicated in the above disease?:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}
                error={this.getFormError('geneWithSameFunctionSameDisease.explanationOfOtherGenes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.explanationOfOtherGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.geneImplicatedWithDisease} required={this.state.geneImplicatedWithDisease} />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceInPaper" label="Notes on where evidence found in paper:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.geneImplicatedWithDisease} />
        </div>
    );
}

var TypeBiochemicalFunctionB = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var biochemicalFunction = experimental.biochemicalFunction ? experimental.biochemicalFunction : {};
    if (biochemicalFunction) {
        biochemicalFunction.geneFunctionConsistentWithPhenotype = biochemicalFunction.geneFunctionConsistentWithPhenotype ? biochemicalFunction.geneFunctionConsistentWithPhenotype : {};
        if (biochemicalFunction.geneFunctionConsistentWithPhenotype) {
            biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation = biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation ? biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper = biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper ? biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments = biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments ? biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments : null;
        }
    }
    return (
        <div className="row experimental-data-form">
            <Input type="text" ref="geneFunctionConsistentWithPhenotype.phenotypeHPO" label={<LabelHPOIDs />} value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" handleChange={this.handleChange} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.phenotypeFreeText" label="Phenotypes (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleChange} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.explanation" label="Explanation of how phenotype is consistent with disease (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.explanation')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.biochemicalFunctionsBOn} required={this.state.biochemicalFunctionsBOn} />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.evidenceInPaper" label="Notes on where evidence found in paper:" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.biochemicalFunctionsBOn} />
        </div>
    );
}

// HTML labels for Biochemical Functions panel
var LabelIdentifiedFunction = React.createClass({
    render: function() {
        return <span>Identified Function (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});
var LabelHPOIDs = React.createClass({
    render: function() {
        return <span>Phenotype(s) <span style={{fontWeight: 'normal'}}>(HPO ID(s); <a href="http://bioportal.bioontology.org/ontologies/HP?p=classes&conceptid=root" target="_blank" title="Bioportal Human Phenotype Ontology in a new tab">HPO lookup at Bioportal</a>)</span>:</span>
    }
});

// Protein Interaction type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeProteinInteractions = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var proteinInteractions = experimental.proteinInteractions ? experimental.proteinInteractions : {};
    if (proteinInteractions) {
        proteinInteractions.interactingGenes = proteinInteractions.interactingGenes ? this.joinItems(proteinInteractions.interactingGenes) : null;
        proteinInteractions.interactionType = proteinInteractions.interactionType ? proteinInteractions.interactionType : null;
        proteinInteractions.experimentalInteractionDetection = proteinInteractions.experimentalInteractionDetection ? proteinInteractions.experimentalInteractionDetection : null;
        proteinInteractions.relationshipOfOtherGenesToDisese = proteinInteractions.relationshipOfOtherGenesToDisese ? proteinInteractions.relationshipOfOtherGenesToDisese : null;
        proteinInteractions.evidenceInPaper = proteinInteractions.evidenceInPaper ? proteinInteractions.evidenceInPaper : null;
        proteinInteractions.assessments = proteinInteractions.assessments ? proteinInteractions.assessments : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="text" ref="interactingGenes" label="Interacting gene(s) (HGNC):" value={proteinInteractions.interactingGenes} placeholder="e.g. DICER1"
                error={this.getFormError('interactingGenes')} clearError={this.clrFormErrors.bind(null, 'interactingGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="select" ref="interactionType" label="Interaction Type:" defaultValue="none" value={proteinInteractions.interactionType} handleChange={this.handleChange}
                error={this.getFormError('interactionType')} clearError={this.clrFormErrors.bind(null, 'interactionType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>physical association (MI:0915)</option>
                <option>genetic interaction (MI:0208)</option>
                <option>negative genetic interaction (MI:0933)</option>
                <option>positive genetic interaction (MI:0935)</option>
            </Input>
            <Input type="select" ref="experimentalInteractionDetection" label="Method by which interaction detected:" defaultValue="none" value={proteinInteractions.experimentalInteractionDetection} handleChange={this.handleChange}
                error={this.getFormError('experimentalInteractionDetection')} clearError={this.clrFormErrors.bind(null, 'experimentalInteractionDetection')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>coimmunoprecipitation (M:0019)</option>
                <option>pull down (M:0096)</option>
                <option>affinity chromatography technology (M:0004)</option>
                <option>protein cross-linking with a bifunctional reagent (M0031)</option>
                <option>comigration in gel electrophoresis (M:0807)</option>
                <option>x-ray crystallography (MI:0114)</option>
                <option>electron microscopy (MI:0040)</option>
            </Input>
            <Input type="checkbox" ref="geneImplicatedInDisease" label="Has this gene or genes been implicated in the above disease?:"
                checked={this.state.geneImplicatedInDisease} defaultChecked="false" handleChange={this.handleChange}
                error={this.getFormError('geneImplicatedInDisease')} clearError={this.clrFormErrors.bind(null, 'geneImplicatedInDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the interacting gene(s) have not been associated with the disease, the criteria for counting this experimental evidence has not been met and cannot be submitted. Return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Curation Central</a>.</p>
            <Input type="textarea" ref="relationshipOfOtherGenesToDisese" label="Explanation of relationship of other gene(s) to the disease:" rows="5" value={proteinInteractions.relationshipOfOtherGenesToDisese}
                error={this.getFormError('relationshipOfOtherGenesToDisese')} clearError={this.clrFormErrors.bind(null, 'relationshipOfOtherGenesToDisese')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.geneImplicatedInDisease} required={this.state.geneImplicatedInDisease} />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={proteinInteractions.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.geneImplicatedInDisease} />
        </div>
    );
}

// Expression type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeExpression = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var expression = experimental.expression ? experimental.expression : {};
    if (expression) {
        expression.organOfTissue = expression.organOfTissue ? expression.organOfTissue : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="text" ref="organOfTissue" label={<LabelUberonId />} value={expression.organOfTissue} placeholder="e.g. UBERON_0000948"
                error={this.getFormError('organOfTissue')} clearError={this.clrFormErrors.bind(null, 'organOfTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <p className="col-sm-7 col-sm-offset-5">There are 2 kinds of evidence that support Expression (see A. and B.). You can collect either or both - each kind counts as one piece of Expression evidence. Fill out the top section and then curate on A. and/or B.</p>
        </div>
    );
}

var TypeExpressionA = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var expression = experimental.expression ? experimental.expression : {};
    if (expression) {
        expression.normalExpression = expression.normalExpression ? expression.normalExpression : {};
        if (expression.normalExpression) {
            expression.normalExpression.evidence = expression.normalExpression.evidence ? expression.normalExpression.evidence : null;
            expression.normalExpression.evidenceInPaper = expression.normalExpression.evidenceInPaper ? expression.normalExpression.evidenceInPaper : null;
            expression.normalExpression.assessments = expression.normalExpression.assessments ? expression.normalExpression.assessments : null;
        }
    }
    return (
        <div className="row experimental-data-form">
            <Input type="checkbox" ref="normalExpression.expressedInTissue" label="Is the gene normally expressed in the above tissue?:"
                checked={this.state.expressedInTissue} defaultChecked="false" handleChange={this.handleChange}
                error={this.getFormError('normalExpression.expressedInTissue')} clearError={this.clrFormErrors.bind(null, 'normalExpression.expressedInTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the gene is not normally expressed in the above tissue, the criteria for counting this experimental evidence has not been met and cannot be submitted. Proceed to section B below or return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Curation Central</a>.</p>
            <Input type="textarea" ref="normalExpression.evidence" label="Evidence for normal expression in tissue:" rows="5" value={expression.normalExpression.evidence}
                error={this.getFormError('normalExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.expressedInTissue} required={this.state.expressedInTissue} />
            <Input type="textarea" ref="normalExpression.evidenceInPaper" label="Notes on where evidence found in paper:" rows="5" value={expression.normalExpression.evidenceInPaper}
                error={this.getFormError('normalExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.expressedInTissue} />
        </div>
    );
}

var TypeExpressionB = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var expression = experimental.expression ? experimental.expression : {};
    if (expression) {
        expression.alteredExpression = expression.alteredExpression ? expression.alteredExpression : {};
        if (expression.alteredExpression) {
            expression.alteredExpression.evidence = expression.alteredExpression.evidence ? expression.alteredExpression.evidence : null;
            expression.alteredExpression.evidenceInPaper = expression.alteredExpression.evidenceInPaper ? expression.alteredExpression.evidenceInPaper : null;
            expression.alteredExpression.assessments = expression.alteredExpression.assessments ? expression.alteredExpression.assessments : null;
        }
    }
    return (
        <div className="row experimental-data-form">
            <Input type="checkbox" ref="alteredExpression.expressedInPatients" label="Is expression altered in patients who have the disease?:"
                checked={this.state.expressedInPatients} defaultChecked="false" handleChange={this.handleChange}
                error={this.getFormError('alteredExpression.expressedInPatients')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.expressedInPatients')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="alteredExpression.evidence" label="Evidence for altered expression in patients:" rows="5" value={expression.alteredExpression.evidence}
                error={this.getFormError('alteredExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.expressedInPatients} required={this.state.expressedInPatients} />
            <Input type="textarea" ref="alteredExpression.evidenceInPaper" label="Notes on where evidence found in paper:" rows="5" value={expression.alteredExpression.evidenceInPaper}
                error={this.getFormError('alteredExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={!this.state.expressedInPatients} />
        </div>
    );
}

// HTML labels for Expression panel.
var LabelUberonId = React.createClass({
    render: function() {
        return <span>Organ of tissue relevant to disease, in which gene expression is examined (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/UBERON" target="_blank" title="Open Uberon in a new tab">Uberon</a> ID</span>):</span>;
    }
});

// Functional Alteration type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeFunctionalAlteration = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var functionalAlteration = experimental.functionalAlteration ? experimental.functionalAlteration : {};
    if (functionalAlteration) {
        functionalAlteration.cellMutationOrEngineeredEquivalent = functionalAlteration.cellMutationOrEngineeredEquivalent ? functionalAlteration.cellMutationOrEngineeredEquivalent : null;
        functionalAlteration.patientCellType = functionalAlteration.patientCellType ? functionalAlteration.patientCellType : null;
        functionalAlteration.engineeredEquivalentCellType = functionalAlteration.engineeredEquivalentCellType ? functionalAlteration.engineeredEquivalentCellType : null;
        functionalAlteration.descriptionOfGeneAlteration = functionalAlteration.descriptionOfGeneAlteration ? functionalAlteration.descriptionOfGeneAlteration : null;
        functionalAlteration.normalFunctionOfGene = functionalAlteration.normalFunctionOfGene ? functionalAlteration.normalFunctionOfGene : null;
        functionalAlteration.evidenceForNormalFunction = functionalAlteration.evidenceForNormalFunction ? functionalAlteration.evidenceForNormalFunction : null;
        functionalAlteration.evidenceInPaper = functionalAlteration.evidenceInPaper ? functionalAlteration.evidenceInPaper : null;
        functionalAlteration.assessments = functionalAlteration.assessments ? functionalAlteration.assessments : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="select" ref="cellMutationOrEngineeredEquivalent" label="Patient cells with candidate mutation or engineered equivalent?:" defaultValue="none" value={functionalAlteration.cellMutationOrEngineeredEquivalent} handleChange={this.handleChange}
                error={this.getFormError('cellMutationOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'cellMutationOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="textarea" ref="funcalt.patientCellType" label={<LabelPatientCellType />} value={functionalAlteration.patientCellType} placeholder="e.g. 0000001"
                error={this.getFormError('funcalt.patientCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.patientCellType')} rows="1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize" inputDisabled={this.state.functionalAlterationPCEE != 'Patient cells'} required={this.state.functionalAlterationPCEE == 'Patient cells'} />
            <Input type="textarea" ref="funcalt.engineeredEquivalentCellType" label={<LabelEngineeredEquivalent />} value={functionalAlteration.engineeredEquivalentCellType} placeholder="e.g. 0000001"
                error={this.getFormError('funcalt.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.engineeredEquivalentCellType')} rows="1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize" inputDisabled={this.state.functionalAlterationPCEE != 'Engineered equivalent'} required={this.state.functionalAlterationPCEE == 'Engineered equivalent'} />
            <Input type="text" ref="normalFunctionOfGene" label={<LabelNormalFunctionOfGene />} value={functionalAlteration.normalFunctionOfGene} placeholder=""
                error={this.getFormError('normalFunctionOfGene')} clearError={this.clrFormErrors.bind(null, 'normalFunctionOfGene')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:" rows="5" value={functionalAlteration.descriptionOfGeneAlteration}
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceForNormalFunction" label="Evidence for altered function:" rows="5" value={functionalAlteration.evidenceForNormalFunction}
                error={this.getFormError('evidenceForNormalFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForNormalFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Notes on where evidence found in paper:" rows="5" value={functionalAlteration.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Functional Alterations panel.
var LabelPatientCellType = React.createClass({
    render: function() {
        return <span>Patient cell type (<span style={{fontWeight: 'normal'}}><a href="http://uberon.github.io/" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});
var LabelEngineeredEquivalent = React.createClass({
    render: function() {
        return <span>Engineered equivalent cell type/line (<span style={{fontWeight: 'normal'}}><a href="http://uberon.github.io/" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});
var LabelNormalFunctionOfGene = React.createClass({
    render: function() {
        return <span>Normal function of gene/gene product (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});

// Model Systems type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeModelSystems = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var modelSystems = experimental.modelSystems ? experimental.modelSystems : {};
    if (modelSystems) {
        modelSystems.animalOrCellCulture = modelSystems.animalOrCellCulture ? modelSystems.animalOrCellCulture : null;
        modelSystems.animalModel = modelSystems.animalModel ? modelSystems.animalModel : null;
        modelSystems.cellCulture = modelSystems.cellCulture ? modelSystems.cellCulture : null;
        modelSystems.descriptionOfGeneAlteration = modelSystems.descriptionOfGeneAlteration ? modelSystems.descriptionOfGeneAlteration : null;
        modelSystems.phenotypeHPO = modelSystems.phenotypeHPO ? modelSystems.phenotypeHPO : null;
        modelSystems.phenotypeFreeText = modelSystems.phenotypeFreeText ? modelSystems.phenotypeFreeText : null;
        modelSystems.phenotypeHPOObserved = modelSystems.phenotypeHPOObserved ? modelSystems.phenotypeHPOObserved : null;
        modelSystems.phenotypeFreetextObserved = modelSystems.phenotypeFreetextObserved ? modelSystems.phenotypeFreetextObserved : null;
        modelSystems.explanation = modelSystems.explanation ? modelSystems.explanation : null;
        modelSystems.evidenceInPaper = modelSystems.evidenceInPaper ? modelSystems.evidenceInPaper : null;
        modelSystems.assessments = modelSystems.assessments ? modelSystems.assessments : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="select" ref="animalOrCellCulture" label="Non-human animal or cell-culture model?:" defaultValue="none" value={modelSystems.animalOrCellCulture} handleChange={this.handleChange}
                error={this.getFormError('animalOrCellCulture')} clearError={this.clrFormErrors.bind(null, 'animalOrCellCulture')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Animal model</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="select" ref="animalModel" label="Animal model:" defaultValue="none" value={modelSystems.animalModel} handleChange={this.handleChange}
                error={this.getFormError('animalModel')} clearError={this.clrFormErrors.bind(null, 'animalModel')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={this.state.modelSystemsNHACCM != 'Animal model'} required={this.state.modelSystemsNHACCM == 'Animal model'}>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Cat (Felis catus) 9685</option>
                <option>Chicken (Gallus gallus) 9031</option>
                <option>Chimpanzee (Pan troglodytes) 9598</option>
                <option>Cow (Bos taurus) 9913</option>
                <option>Dog (Canis lupus familaris) 9615</option>
                <option>Frog (Xenopus) 262014</option>
                <option>Fruit fly (Drosophila) 7215</option>
                <option>Gerbil (Gerbilinae) 10045</option>
                <option>Guinea pig (Cavia porcellus) 10141</option>
                <option>Hamster (Cricetinae) 10026</option>
                <option>Macaque (Macaca) 9539</option>
                <option>Mouse (Mus musculus) 10090</option>
                <option>Pig (Sus scrofa) 9823</option>
                <option>Rabbit (Oryctolagus crunicu) 9986</option>
                <option>Rat (Rattus norvegicus) 10116</option>
                <option>Round worm (Carnorhabditis elegans) 6239</option>
                <option>Sheep (Ovis aries) 9940</option>
                <option>Zebrafish (Daanio rerio) 7955</option>
            </Input>
            <Input type="textarea" ref="cellCulture" label="Cell-culture type/line:" value={modelSystems.cellCulture} placeholder=""
                error={this.getFormError('cellCulture')} clearError={this.clrFormErrors.bind(null, 'cellCulture')} rows="1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize" inputDisabled={this.state.modelSystemsNHACCM != 'Engineered equivalent'} required={this.state.modelSystemsNHACCM == 'Engineered equivalent'} />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:" rows="5" value={modelSystems.descriptionOfGeneAlteration}
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="model.phenotypeHPOObserved" label={<LabelPhenotypeObserved />} value={modelSystems.phenotypeHPOObserved} placeholder="e.g. HP:0010704"
                error={this.getFormError('model.phenotypeHPOObserved')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPOObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreetextObserved" label="Phenotype observed in model system:" rows="5" value={modelSystems.phenotypeFreetextObserved}
                error={this.getFormError('phenotypeFreetextObserved')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreetextObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="model.phenotypeHPO" label={<LabelPatientPhenotype />} value={modelSystems.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('model.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreeText" label="Patient phenotype:" rows="5" value={modelSystems.phenotypeFreeText}
                error={this.getFormError('phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="explanation" label="Explanation of how model system phenotype is similar to phenotype observed in patient:" rows="5" value={modelSystems.explanation}
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={modelSystems.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Model Systems panel.
var LabelPatientPhenotype = React.createClass({
    render: function() {
        return <span>Patient phenotype (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});
var LabelPhenotypeObserved = React.createClass({
    render: function() {
        return <span>Phenotype observed in model system (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});

// Rescue type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeRescue = function() {
    var experimental = this.state.experimental ? this.state.experimental : {};
    var rescue = experimental.rescue ? experimental.rescue : {};
    if (rescue) {
        rescue.patientCellOrEngineeredEquivalent = rescue.patientCellOrEngineeredEquivalent ? rescue.patientCellOrEngineeredEquivalent : null;
        rescue.patientCellType = rescue.patientCellType ? rescue.patientCellType : null;
        rescue.engineeredEquivalentCellType = rescue.engineeredEquivalentCellType ? rescue.engineeredEquivalentCellType : null;
        rescue.descriptionOfGeneAlteration = rescue.descriptionOfGeneAlteration ? rescue.descriptionOfGeneAlteration : null;
        rescue.phenotypeHPO = rescue.phenotypeHPO ? rescue.phenotypeHPO : null;
        rescue.phenotypeFreeText = rescue.phenotypeFreeText ? rescue.phenotypeFreeText : null;
        rescue.rescueMethod = rescue.rescueMethod ? rescue.rescueMethod : null;
        rescue.wildTypeRescuePhenotype = rescue.wildTypeRescuePhenotype ? rescue.wildTypeRescuePhenotype : null;
        rescue.explanation = rescue.explanation ? rescue.explanation : null;
        rescue.evidenceInPaper = rescue.evidenceInPaper ? rescue.evidenceInPaper : null;
        rescue.assessments = rescue.assessments ? rescue.assessments : null;
    }
    return (
        <div className="row experimental-data-form">
            <Input type="select" ref="patientCellOrEngineeredEquivalent" label="Patient cells with or engineered equivalent?:" defaultValue="none" value={rescue.patientCellOrEngineeredEquivalent} handleChange={this.handleChange}
                error={this.getFormError('patientCellOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'patientCellOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required >
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="textarea" ref="rescue.patientCellType" label={<LabelPatientCellType />} value={rescue.patientCellType} placeholder=""
                error={this.getFormError('rescue.patientCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.patientCellType')} rows="1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize" inputDisabled={this.state.rescuePCEE != 'Patient cells'} required={this.state.rescuePCEE == 'Patient cells'} />
            <Input type="textarea" ref="rescue.engineeredEquivalentCellType" label={<LabelEngineeredEquivalent />} value={rescue.engineeredEquivalentCellType} placeholder=""
                error={this.getFormError('rescue.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.engineeredEquivalentCellType')} rows="1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input no-resize" inputDisabled={this.state.rescuePCEE != 'Engineered equivalent'} required={this.state.rescuePCEE == 'Engineered equivalent'} />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:" rows="5" value={rescue.descriptionOfGeneAlteration}
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="rescue.phenotypeHPO" label="Phenotype to rescue (HPO)" value={rescue.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('rescue.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreeText" label="Phenotype to rescue:" rows="5" value={rescue.phenotypeFreeText}
                error={this.getFormError('phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="rescueMethod" label="Method used to rescue:" rows="5" value={rescue.rescueMethod}
                error={this.getFormError('rescueMethod')} clearError={this.clrFormErrors.bind(null, 'rescueMethod')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="select" ref="wildTypeRescuePhenotype" label="Does the wild-type rescue the above phenotype?:" defaultValue="none" value={rescue.wildTypeRescuePhenotype} handleChange={this.handleChange}
                error={this.getFormError('wildTypeRescuePhenotype')} clearError={this.clrFormErrors.bind(null, 'wildTypeRescuePhenotype')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required >
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <p className="col-sm-7 col-sm-offset-5 hug-top"><strong>Note:</strong> If the wild-type version of the gene does not rescue the phenotype, the criteria of counting this experimental evidence has not been met and cannot be submitted. Return to <a href={"/curation-central/?gdm=" + this.state.gdm.uuid + "&pmid=" + this.state.annotation.article.pmid}>Curation Central</a>.</p>
            <Input type="checkbox" ref="patientVariantRescue" label="Does patient variant rescue?:"
                checked={this.state.patientVariantRescue} defaultChecked="false"
                error={this.getFormError('patientVariantRescue')} clearError={this.clrFormErrors.bind(null, 'patientVariantRescue')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="explanation" label="Explanation of rescue of phenotype:" rows="5" value={rescue.explanation}
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={rescue.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// Display the Family variant panel. The number of copies depends on the variantCount state variable.
var ExperimentalDataVariant = function() {
    var experimental = this.state.experimental;
    var variants = experimental && experimental.variants;

    return (
        <div className="row">
            {!experimental || !experimental.variants || experimental.variants.length === 0 ?
                <div className="row">
                    <p className="col-sm-7 col-sm-offset-5">
                        If your functional data was about one or more particular variants, please associate it with those variant(s) (optional, and only when functional data is about this specific variant – Expression, Functional alteration of gene/gene product, Model systems, or Rescue)
                    </p>
                </div>
            : null}
            {_.range(this.state.variantCount).map(i => {
                var variant;

                if (variants && variants.length) {
                    variant = variants[i];
                }

                return (
                    <div key={i} className="variant-panel">
                        <div className="row">
                            <div className="col-sm-7 col-sm-offset-5">
                                <p className="alert alert-warning">
                                    ClinVar VariationID should be provided in all instances it exists. This is the only way to associate probands from different studies with
                                    the same variant, and ensures the accurate counting of probands.
                                </p>
                            </div>
                        </div>
                        <Input type="text" ref={'VARclinvarid' + i} label={<LabelClinVarVariant />} value={variant && variant.clinvarVariantId} placeholder="e.g. 177676" handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_OTHER}
                            error={this.getFormError('VARclinvarid' + i)} clearError={this.clrFormErrors.bind(null, 'VARclinvarid' + i)}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
                        <p className="col-sm-7 col-sm-offset-5 input-note-below">
                            The VariationID is the number found after <strong>/variation/</strong> in the URL for a variant in ClinVar (<a href="http://www.ncbi.nlm.nih.gov/clinvar/variation/139214/" target="_blank">example</a>: 139214).
                        </p>
                        <Input type="textarea" ref={'VARothervariant' + i} label={<LabelOtherVariant />} rows="5" value={variant && variant.otherDescription} handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_SPEC}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                    </div>
                );
            })}
            {this.state.variantCount < MAX_VARIANTS ?
                <div>
                    <Input type="button" ref="addvariant" inputClassName="btn-default btn-last pull-right" title={this.state.variantCount ? "Add another variant associated with experimental data" : "Add variant associated with experimental data"}
                        clickHandler={this.handleAddVariant} inputDisabled={this.state.addVariantDisabled} />
                </div>
            : null}
        </div>
    );
};

var LabelClinVarVariant = React.createClass({
    render: function() {
        return <span><a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> VariationID:</span>;
    }
});

var LabelOtherVariant = React.createClass({
    render: function() {
        return <span>Other description <span style={{fontWeight: 'normal'}}>(only when no ID available)</span>:</span>;
    }
});


var ExperimentalViewer = React.createClass({
    render: function() {
        var context = this.props.context;
        var method = context.method;

        return (
            <div className="container">
                <div className="row curation-content-viewer">
                    <h1>View Experimental Data: {context.label} ({context.evidenceType})</h1>

                    {context.evidenceType == 'Biochemical function' ?
                    <Panel title="Biochemical function" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Identified Function</dt>
                                <dd>{context.biochemicalFunction.identifiedFunction}</dd>
                            </div>

                            <div>
                                <dt>Evidence for function</dt>
                                <dd>{context.biochemicalFunction.evidenceForFunction}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.biochemicalFunction.evidenceForFunctionInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Biochemical function' && context.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction && context.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction !== '' ?
                    <Panel title="Gene(s) with same function implicated in same disease" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Genes</dt>
                                <dd>{context.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(function(gene, i) {
                                        return (<span>{gene.symbol} </span>);
                                    })}</dd>
                            </div>

                            <div>
                                <dt>Evidence that above gene(s) share same function</dt>
                                <dd>{context.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}</dd>
                            </div>

                            <div>
                                <dt>Has this gene or genes been implicated in the above disease?</dt>
                                <dd>{context.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease ?
                                    context.biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease.toString()
                                : null}</dd>
                            </div>

                            <div>
                                <dt>How has this gene(s) been implicated in the above disease?</dt>
                                <dd>{context.biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Biochemical function' && ((context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO && context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ') !== '') || (context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText && context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText !== '')) ?
                    <Panel title="Gene function consistent with phenotype" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>HPO ID(s)</dt>
                                <dd>{context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join(', ')}</dd>
                            </div>

                            <div>
                                <dt>Phenotype</dt>
                                <dd>{context.biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}</dd>
                            </div>

                            <div>
                                <dt>Explanation of how phenotype is consistent with disease</dt>
                                <dd>{context.biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Protein interactions' ?
                    <Panel title="Protein interactions" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Interacting Gene(s)</dt>
                                <dd>{context.proteinInteractions.interactingGenes.map(function(gene, i) {
                                        return (<span>{gene.symbol} </span>);
                                    })}</dd>
                            </div>

                            <div>
                                <dt>Interaction Type</dt>
                                <dd>{context.proteinInteractions.interactionType}</dd>
                            </div>

                            <div>
                                <dt>Method by which interaction detected</dt>
                                <dd>{context.proteinInteractions.experimentalInteractionDetection}</dd>
                            </div>

                            <div>
                                <dt>Has this gene or genes been implicated in the above disease</dt>
                                <dd>{context.proteinInteractions.geneImplicatedInDisease ?
                                    context.proteinInteractions.geneImplicatedInDisease.toString()
                                : null}</dd>
                            </div>

                            <div>
                                <dt>Explanation of relationship of other gene(s) to the disease</dt>
                                <dd>{context.proteinInteractions.relationshipOfOtherGenesToDisese}</dd>
                            </div>

                            <div>
                                <dt>Information about where evidence can be found on paper</dt>
                                <dd>{context.proteinInteractions.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Expression' ?
                    <Panel title="Expression" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Uberon ID of Tissue Organ</dt>
                                <dd>{context.expression.organOfTissue}</dd>
                            </div>

                            <div>
                                <dt>Is the gene normally expressed in the above tissue?</dt>
                                <dd>{context.expression.normalExpression.expressedInTissue ?
                                    context.expression.normalExpression.expressedInTissue.toString()
                                : null}</dd>
                            </div>

                            <div>
                                <dt>Evidence for normal expression in tissue</dt>
                                <dd>{context.expression.normalExpression.evidence}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.expression.normalExpression.evidenceInPaper}</dd>
                            </div>

                            <div>
                                <dt>Altered expression in Patients</dt>
                                <dd>{context.expression.alteredExpression.expressedInPatients ?
                                    context.expression.alteredExpression.expressedInPatients.toString()
                                : null}</dd>
                            </div>

                            <div>
                                <dt>Evidence for normal expression in tissue</dt>
                                <dd>{context.expression.alteredExpression.evidence}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.expression.alteredExpression.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Functional alteration of gene/gene product' ?
                    <Panel title="Functional alteration of gene/gene product" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Patient cells with candidate mutation or engineered equivalent</dt>
                                <dd>{context.functionalAlteration.cellMutationOrEngineeredEquivalent}</dd>
                            </div>

                            <div>
                                <dt>Patient cell type</dt>
                                <dd>{context.functionalAlteration.patientCellType}</dd>
                            </div>

                            <div>
                                <dt>Engineered cell type</dt>
                                <dd>{context.functionalAlteration.engineeredEquivalentCellType}</dd>
                            </div>

                            <div>
                                <dt>Description of gene alteration</dt>
                                <dd>{context.functionalAlteration.descriptionOfGeneAlteration}</dd>
                            </div>

                            <div>
                                <dt>Normal function of gene</dt>
                                <dd>{context.functionalAlteration.normalFunctionOfGene}</dd>
                            </div>

                            <div>
                                <dt>Evidence for altered function</dt>
                                <dd>{context.functionalAlteration.evidenceForNormalFunction}</dd>
                            </div>

                            <div>
                                <dt>Notes on where evidence found in paper</dt>
                                <dd>{context.functionalAlteration.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Model systems' ?
                    <Panel title="Model systems" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Non-human animal or cell-culture model?</dt>
                                <dd>{context.modelSystems.animalOrCellCulture}</dd>
                            </div>

                            <div>
                                <dt>Animal model</dt>
                                <dd>{context.modelSystems.animalModel}</dd>
                            </div>

                            <div>
                                <dt>Cell-culture type/line</dt>
                                <dd>{context.modelSystems.cellCulture}</dd>
                            </div>

                            <div>
                                <dt>Description of gene alteration</dt>
                                <dd>{context.modelSystems.descriptionOfGeneAlteration}</dd>
                            </div>

                            <div>
                                <dt>Patient phenotype HPO</dt>
                                <dd>{context.modelSystems.phenotypeHPO}</dd>
                            </div>

                            <div>
                                <dt>Patient phenotype</dt>
                                <dd>{context.modelSystems.phenotypeFreeText}</dd>
                            </div>

                            <div>
                                <dt>Phenotype HPO observed</dt>
                                <dd>{context.modelSystems.phenotypeHPOObserved}</dd>
                            </div>

                            <div>
                                <dt>Phenotype observed in model system</dt>
                                <dd>{context.modelSystems.phenotypeFreetextObserved}</dd>
                            </div>

                            <div>
                                <dt>Explanation of how model system phenotype is similar to phenotype observed in patient</dt>
                                <dd>{context.modelSystems.explanation}</dd>
                            </div>

                            <div>
                                <dt>Information about where evidence can be found on paper</dt>
                                <dd>{context.modelSystems.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.evidenceType == 'Rescue' ?
                    <Panel title="Rescue" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Patient cells with or engineered equivalent?</dt>
                                <dd>{context.rescue.patientCellOrEngineeredEquivalent}</dd>
                            </div>

                            <div>
                                <dt>Patient cell type</dt>
                                <dd>{context.rescue.patientCellType}</dd>
                            </div>

                            <div>
                                <dt>Engineered equivalent cell type</dt>
                                <dd>{context.rescue.engineeredEquivalentCellType}</dd>
                            </div>

                            <div>
                                <dt>Description of gene alteration</dt>
                                <dd>{context.rescue.descriptionOfGeneAlteration}</dd>
                            </div>

                            <div>
                                <dt>Phenotype to rescue</dt>
                                <dd>{context.rescue.phenotypeHPO}</dd>
                            </div>

                            <div>
                                <dt>Phenotype to rescue</dt>
                                <dd>{context.rescue.phenotypeFreeText}</dd>
                            </div>

                            <div>
                                <dt>Method used to rescue</dt>
                                <dd>{context.rescue.rescueMethod}</dd>
                            </div>

                            <div>
                                <dt>Does the wild-type rescue the above phenotype?</dt>
                                <dd>{context.rescue.wildTypeRescuePhenotype}</dd>
                            </div>

                            <div>
                                <dt>Does patient variant rescue?</dt>
                                <dd>{context.rescue.patientVariantRescue ?
                                    context.rescue.patientVariantRescue.toString()
                                : null}</dd>
                            </div>

                            <div>
                                <dt>Explanation of rescue of phenotype</dt>
                                <dd>{context.rescue.explanation}</dd>
                            </div>

                            <div>
                                <dt>Information about where evidence can be found on paper</dt>
                                <dd>{context.rescue.evidenceInPaper}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
                    {context.variants && context.variants.length > 0 ?
                    <Panel title="Associated Variants" panelClassName="panel-data">
                        {context.variants.map(function(variant, i) {
                            return (
                                <div className="variant-view-panel">
                                    <h5>Variant {i + 1}</h5>
                                    <dl className="dl-horizontal">
                                        <div>
                                            <dt>ClinVar VariationID</dt>
                                            <dd>{variant.clinvarVariantId}</dd>
                                        </div>

                                        <div>
                                            <dt>Other description</dt>
                                            <dd>{variant.otherDescription}</dd>
                                        </div>
                                    </dl>
                                </div>
                            );
                        })}
                    </Panel>
                    : null}
                </div>
            </div>
        );
    }
});

globals.content_views.register(ExperimentalViewer, 'experimental');
