'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var modal = require('../libs/bootstrap/modal');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var methods = require('./methods');
var individual_curation = require('./individual_curation');
var Assessments = require('./assessment');
var parsePubmed = require('../libs/parse-pubmed').parsePubmed;
var add_external_resource = require('./add_external_resource');
var CuratorHistory = require('./curator_history');

var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var ViewRecordHeader = curator.ViewRecordHeader;
var CurationPalette = curator.CurationPalette;
var PmidSummary = curator.PmidSummary;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var AssessmentTracker = Assessments.AssessmentTracker;
var AssessmentPanel = Assessments.AssessmentPanel;
var AssessmentMixin = Assessments.AssessmentMixin;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var PmidDoiButtons = curator.PmidDoiButtons;
var queryKeyValue = globals.queryKeyValue;
var country_codes = globals.country_codes;
var makeStarterIndividual = individual_curation.makeStarterIndividual;
var updateProbandVariants = individual_curation.updateProbandVariants;
var recordIndividualHistory = individual_curation.recordIndividualHistory;
var external_url_map = globals.external_url_map;
var DeleteButton = curator.DeleteButton;
var AddResourceId = add_external_resource.AddResourceId;

// Will be great to convert to 'const' when available
var MAX_VARIANTS = 2;

// Settings for this.state.varOption
var VAR_NONE = 0; // No variants entered in a panel
var VAR_SPEC = 1; // A specific variant (dbSNP, ClinVar, HGVS) entered in a panel
var VAR_OTHER = 2; // Other description entered in a panel


// Maps segregation field refs to schema properties
var formMapSegregation = {
    'SEGpedigreedesc': 'pedigreeDescription',
    'SEGpedigreesize': 'pedigreeSize',
    'SEGnogenerationsinpedigree': 'numberOfGenerationInPedigree',
    'SEGconsanguineous': 'consanguineousFamily',
    'SEGnocases': 'numberOfCases',
    'SEGdenovo': 'deNovoType',
    'SEGunaffectedcarriers': 'numberOfParentsUnaffectedCarriers',
    'SEGnoaffected': 'numberOfAffectedAlleles',
    'SEGnoaffected1': 'numberOfAffectedWithOneVariant',
    'SEGnoaffected2': 'numberOfAffectedWithTwoVariants',
    'SEGnounaffectedcarriers': 'numberOfUnaffectedCarriers',
    'SEGnounaffectedindividuals': 'numberOfUnaffectedIndividuals',
    'SEGbothvariants': 'probandAssociatedWithBoth',
    'SEGaddedsegregationinfo': 'additionalInformation'
};

var initialCv = {
    assessmentTracker: null, // Tracking object for a single assessment
    filledSegregations: {}, // Tracks segregation fields with values filled in
    segregationAssessed: false, // TRUE if segregation has been assessed by self or others
    othersAssessed: false // TRUE if other curators have assessed the family's segregation
};


var FamilyCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, AssessmentMixin, ModalMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    cv: initialCv,

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        this.cv.assessmentTracker = initialCv;

        return {
            orpha: null, // boolean for entered in Orphanet id input box
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            annotation: null, // Annotation object given in query string
            extraFamilyCount: 0, // Number of extra families to create
            extraFamilyNames: [], // Names of extra families to create
            variantCount: 0, // Number of variants to display
            variantOption: [], // One variant panel, and nothing entered
            variantInfo: {}, // Extra holding info for variant display
            probandIndividual: null, //Proband individual if the family being edited has one
            familyName: '', // Currently entered family name
            addVariantDisabled: false, // True if Add Another Variant button enabled
            individualRequired: null, // Boolean for set up requirement of proband
            variantRequired: null, // boolean for set up requirement of variant if proband individual data entered
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            segregationFilled: false, // True if at least one segregation field has a value
            submitBusy: false, // True while form is submitting
            existedOrphanetId: null // user-supplied value in Orphanet id input field
        };
    },

    // Handle value changes in various form fields
    handleChange: function(ref, e) {
        var clinvarid, othervariant;

        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
            this.setState({genotyping2Disabled: this.refs[ref].getValue() === 'none'});
        } else if (ref === 'familyname') {
            this.setState({familyName: this.refs[ref].getValue()});
        } else if (ref === 'orphanetid' && this.refs[ref].getValue()) {
            this.setState({orpha: true});
            this.setState({existedOrphanetId: this.refs[ref].getValue().toUpperCase()});
        } else if (ref === 'orphanetid') {
            this.setState({orpha: false});
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

            // if variant data entered, must enter proband individual name and orphanet
            // First check if data entered in either ClinVar Variant ID or Other description at each variant
            var noVariantData = true;
            _.range(this.state.variantCount).map(i => {
                if (this.refs['VARclinvarid' + i].getValue() || this.refs['VARothervariant' + i].getValue()) {
                    noVariantData = false;
                }
            });
            // If not entered at all, proband individua is not required and must be no error messages at individual fields.
            if (noVariantData) {
                this.setState({individualRequired: false});
                var errors = this.state.formErrors;
                errors['individualname'] = '';
                errors['individualorphanetid'] = '';
                this.setState({formErrors: errors});
            } else {
                this.setState({individualRequired: true});
            }
        } else if (ref.substring(0,3) === 'SEG') {
            // Handle segregation fields to see if we should enable or disable the assessment dropdown
            var value = this.refs[ref].getValue();
            if (this.refs[ref].props.type === 'select') {
                value = value === 'none' ? '' : value;
            }
            if (value !== '') {
                // A segregation field has a value; remember this field
                this.cv.filledSegregations[ref] = true;
            } else {
                // A segregation field lost its value; if we had remembered it, forget it
                if (this.cv.filledSegregations[ref]) {
                    delete this.cv.filledSegregations[ref];
                }
            }

            // Now change the state of the assessment dropdown if needed
            // Also force assessment value goes back to Not Assessed when deleting all segregation data
            var filled = Object.keys(this.cv.filledSegregations).length > 0;
            if (this.state.segregationFilled !== filled) {
                this.setState({segregationFilled: filled});
                this.cv.assessmentTracker.currentVal = 'Not Assessed';
                this.updateAssessmentValue(this.cv.assessmentTracker, 'Not Assessed');
            }
        }
    },

    // Handle a click on a copy orphanet button or copy phenotype button
    handleClick: function(fromTarget, item, e) {
        e.preventDefault(); e.stopPropagation();
        var associatedGroups;
        //var orphanetValTemp = [];
        var orphanetVal = '';
        var hpoIds = '';
        var hpoFreeText = '';
        if (fromTarget == 'group') {
            if (this.state.group) {
                // We have a group, so get the disease array from it.
                associatedGroups = [this.state.group];
            } else if (this.state.family && this.state.family.associatedGroups && this.state.family.associatedGroups.length) {
                // We have a family with associated groups. Combine the diseases from all groups.
                associatedGroups = this.state.family.associatedGroups;
            }
            if (associatedGroups && associatedGroups.length > 0) {
                if (item === 'orphanetid') {
                    orphanetVal = associatedGroups.map(function(associatedGroup, i) {
                        return (
                            associatedGroup.commonDiagnosis.map(function(disease, i) {
                                return ('ORPHA' + disease.orphaNumber);
                            }).join(', ')
                        );
                    });
                    this.refs['orphanetid'].setValue(orphanetVal.join(', '));
                    this.setState({orpha: true});
                    this.setState({existedOrphanetId: orphanetVal.join(', ').toUpperCase()});
                }
                else if (item === 'phenotype') {
                    hpoIds = associatedGroups.map(function(associatedGroup, i) {
                        if (associatedGroup.hpoIdInDiagnosis && associatedGroup.hpoIdInDiagnosis.length) {
                            return (
                                associatedGroup.hpoIdInDiagnosis.map(function(hpoid, i) {
                                    return (hpoid);
                                }).join(', ')
                            );
                        }
                    });
                    if (hpoIds.length) {
                        this.refs['hpoid'].setValue(hpoIds.join(', '));
                    }
                    hpoFreeText = associatedGroups.map(function(associatedGroup, i) {
                        if (associatedGroup.termsInDiagnosis) {
                            return associatedGroup.termsInDiagnosis;
                        }
                    });
                    if (hpoFreeText !== '') {
                        this.refs['phenoterms'].setValue(hpoFreeText.join(', '));
                    }
                }
            }
        } else if (fromTarget == 'family') {
            orphanetVal = this.refs['orphanetid'].getValue();
            this.refs['individualorphanetid'].setValue(orphanetVal);
            var errors = this.state.formErrors;
            errors['individualorphanetid'] = '';
            this.setState({formErrors: errors});
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var familyUuid = this.queryValues.familyUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/groups/' + groupUuid : '',
            familyUuid ? '/families/' + familyUuid: '',
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

                    case 'group':
                        stateObj.group = data;
                        break;

                    case 'family':
                        stateObj.family = data;
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

            // Update the family name
            if (stateObj.family) {
                this.setState({familyName: stateObj.family.label});

                if (stateObj.family.commonDiagnosis && stateObj.family.commonDiagnosis.length > 0) {
                    this.setState({orpha: true});
                }
                else {
                    this.setState({orpha: false});
                }
            }

            if (stateObj.family) {
                // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
                stateObj.genotyping2Disabled = !(stateObj.family.method && stateObj.family.method.genotypingMethods && stateObj.family.method.genotypingMethods.length);

                // See if any associated individual is a proband
                if (stateObj.family.individualIncluded.length) {
                    stateObj.probandIndividual = _(stateObj.family.individualIncluded).find(function(individual) {
                        return individual.proband;
                    });
                }

                // See if we need to disable the Add Variant button based on the number of variants configured
                var segregation = stateObj.family.segregation;
                if (segregation) {
                    // Adjust the form for incoming variants
                    if (segregation.variants && segregation.variants.length) {
                        // We have variants
                        stateObj.variantCount = segregation.variants.length;
                        stateObj.addVariantDisabled = false;
                        stateObj.variantInfo = {};

                        // For each incoming variant, set the form value
                        var currVariantOption = [];
                        for (var i = 0; i < segregation.variants.length; i++) {
                            if (segregation.variants[i].clinvarVariantId) {
                                currVariantOption[i] = VAR_SPEC;
                                stateObj.variantInfo[i] = {'clinvarVariantId': segregation.variants[i].clinvarVariantId, 'clinvarVariantTitle': segregation.variants[i].clinvarVariantTitle};
                            } else if (segregation.variants[i].otherDescription) {
                                currVariantOption[i] = VAR_OTHER;
                            } else {
                                currVariantOption[i] = VAR_NONE;
                            }
                        }
                        stateObj.variantOption = currVariantOption;
                    } else if (stateObj.probandIndividual) {
                        // No variants in this family, but it does have a proband individual. Open one empty variant panel
                        stateObj.variantCount = 1;
                    }

                    // Find the current user's segregation assessment from the segregation's assessment list
                    if (segregation.assessments && segregation.assessments.length) {
                        // Find the assessment belonging to the logged-in curator, if any.
                        userAssessment = Assessments.userAssessment(segregation.assessments, user && user.uuid);

                        // See if any assessments are non-default
                        this.cv.segregationAssessed = _(segregation.assessments).find(function(assessment) {
                            return assessment.value !== Assessments.DEFAULT_VALUE;
                        });

                        // See if others have assessed
                        if (user && user.uuid) {
                            this.cv.othersAssessed = Assessments.othersAssessed(segregation.assessments, user.uuid);
                        }
                    }

                    // Fill in the segregation filled object so we know whether to enable or disable the assessment dropdown
                    Object.keys(formMapSegregation).forEach(formRef => {
                        if (segregation.hasOwnProperty(formMapSegregation[formRef])) {
                            this.cv.filledSegregations[formRef] = true;
                        }
                    });

                    // Note whether any segregation fields were set so the assessment dropdown is set properly on load
                    stateObj.segregationFilled = Object.keys(this.cv.filledSegregations).length > 0;
                }
            }

            // Make a new tracking object for the current assessment. Either or both of the original assessment or user can be blank
            // and assigned later. Then set the component state's assessment value to the assessment's value -- default if there was no
            // assessment.
            var assessmentTracker = this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');
            this.setAssessmentValue(assessmentTracker);

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No annotation; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // Called when user changes the number of copies of family
    extraFamilyCountChanged: function(ref, e) {
        this.setState({extraFamilyCount: e.target.value});
    },

    // Write a family object to the DB.
    writeFamilyObj: function(newFamily, familyLabel) {
        var methodPromise; // Promise from writing (POST/PUT) a method to the DB

        // Get a new family object ready for writing. Modify a copy of it instead
        // of the one we were given.
        var writerFamily = _.clone(newFamily);
        if (familyLabel) {
            writerFamily.label = familyLabel;
        }

        // If a method and/or segregation object was created (at least one method/segregation field set), assign it to the family.
        // If writing multiple family objects, reuse the one we made, but assign new methods and segregations because each family
        // needs unique objects here.
        var newMethod = methods.create.call(this);
        if (newMethod) {
            writerFamily.method = newMethod;
        }

        // Either update or create the family object in the DB
        if (this.state.family) {
            // We're editing a family. PUT the new family object to the DB to update the existing one.
            return this.putRestData('/families/' + this.state.family.uuid, writerFamily).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        } else {
            // We created a family; post it to the DB
            return this.postRestData('/families/', writerFamily).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }
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

    // Called when a form is submitted.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault() && this.validateVariants()) {
            var currFamily = this.state.family;
            var newFamily = {}; // Holds the new group object;
            var familyDiseases = null, familyArticles, familyVariants = [], familyAssessments = [];
            var individualDiseases = null;
            var savedFamilies; // Array of saved written to DB
            var formError = false;
            var initvar = false; // T if edited family has variants for the first time, or if new family has variants
            var hadvar = false; // T if family had variants before being edited here.

            // Parse the comma-separated list of Orphanet IDs
            var orphaIds = curator.capture.orphas(this.getFormValue('orphanetid'));
            var indOrphaIds = curator.capture.orphas(this.getFormValue('individualorphanetid'));
            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (orphaIds && orphaIds.length && _(orphaIds).any(function(id) { return id === null; })) {
                // ORPHA list is bad
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
            }

            // Check that all individual’s Orphanet IDs have the proper format (will check for existence later)
            if (this.state.variantCount > 0 && !this.state.probandIndividual && this.state.individualRequired) {
                if (!indOrphaIds || !indOrphaIds.length || _(indOrphaIds).any(function(id) { return id === null; })) {
                    // Individual’s ORPHA list is bad
                    formError = true;
                    this.setFormErrors('individualorphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
                }
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (pmids && pmids.length && _(pmids).any(function(id) { return id === null; })) {
                // PMID list is bad
                formError = true;
                this.setFormErrors('otherpmids', 'Use PubMed IDs (e.g. 12345678) separated by commas');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (hpoids && hpoids.length && _(hpoids).any(function(id) { return id === null; })) {
                // HPOID list is bad
                formError = true;
                this.setFormErrors('hpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (nothpoids && nothpoids.length && _(nothpoids).any(function(id) { return id === null; })) {
                // NOT HPOID list is bad
                formError = true;
                this.setFormErrors('nothpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            if (!formError) {
                // Build search string from given ORPHA IDs, empty string if no Orphanet id entered.
                var searchStr;
                if (orphaIds && orphaIds.length > 0) {
                    searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');
                }
                else {
                    searchStr = '';
                }
                this.setState({submitBusy: true});

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (orphaIds && orphaIds.length) {
                        if (diseases['@graph'].length === orphaIds.length) {
                            // Successfully retrieved all diseases
                            familyDiseases = diseases;
                            return Promise.resolve(diseases);
                        } else {
                            // Get array of missing Orphanet IDs
                            this.setState({submitBusy: false}); // submit error; re-enable submit button
                            var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                            this.setFormErrors('orphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                            throw diseases;
                        }
                    } else {
                        // if no Orphanet id entered.
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setFormErrors('orphanetid', 'The given diseases not found');
                    throw e;
                }).then(diseases => {
                    // Check for individual orphanet IDs if we have variants and no existing proband
                    if (this.state.variantCount && !this.state.probandIndividual && this.state.individualRequired) {
                        var searchStr = '/search/?type=orphaPhenotype&' + indOrphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');

                        // Verify given Orpha ID exists in DB
                        return this.getRestData(searchStr).then(diseases => {
                            if (diseases['@graph'].length === indOrphaIds.length) {
                                // Successfully retrieved all diseases
                                individualDiseases = diseases;
                                return Promise.resolve(diseases);
                            } else {
                                // Get array of missing Orphanet IDs
                                this.setState({submitBusy: false}); // submit error; re-enable submit button
                                var missingOrphas = _.difference(indOrphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                                this.setFormErrors('individualorphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                                throw diseases;
                            }
                        }, e => {
                            // The given orpha IDs couldn't be retrieved for some reason.
                            this.setState({submitBusy: false}); // submit error; re-enable submit button
                            this.setFormErrors('individualorphanetid', 'The given diseases not found');
                            throw e;
                        });
                    }
                    return Promise.resolve(diseases);
                }).then(diseases => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids && pmids.length) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all PMIDs, so just set familyArticles and return
                                familyArticles = articles;
                                return Promise.resolve(articles);
                            } else {
                                // some PMIDs were not in our db already
                                // generate list of PMIDs and pubmed URLs for those PMIDs
                                var missingPmids = _.difference(pmids, articles['@graph'].map(function(article) { return article.pmid; }));
                                var missingPmidsUrls = [];
                                for (var missingPmidsIndex = 0; missingPmidsIndex < missingPmids.length; missingPmidsIndex++) {
                                    missingPmidsUrls.push(external_url_map['PubMedSearch']  + missingPmids[missingPmidsIndex]);
                                }
                                // get the XML for the missing PMIDs
                                return this.getRestDatasXml(missingPmidsUrls).then(xml => {
                                    var newArticles = [];
                                    var invalidPmids = [];
                                    var tempArticle;
                                    // loop through the resulting XMLs and parsePubmed them
                                    for (var xmlIndex = 0; xmlIndex < xml.length; xmlIndex++) {
                                        tempArticle = parsePubmed(xml[xmlIndex]);
                                        // check to see if Pubmed actually had an entry for the PMID
                                        if ('pmid' in tempArticle) {
                                            newArticles.push(tempArticle);
                                        } else {
                                            // PMID was not found at Pubmed
                                            invalidPmids.push(missingPmids[xmlIndex]);
                                        }
                                    }
                                    // if there were invalid PMIDs, throw an error with a list of them
                                    if (invalidPmids.length > 0) {
                                        this.setState({submitBusy: false}); // submit error; re-enable submit button
                                        this.setFormErrors('otherpmids', 'PMID(s) ' + invalidPmids.join(', ') + ' not found');
                                        throw invalidPmids;
                                    }
                                    // otherwise, post the valid PMIDs
                                    if (newArticles.length > 0) {
                                        return this.postRestDatas('/articles', newArticles).then(data => {
                                            for (var dataIndex = 0; dataIndex < data.length; dataIndex++) {
                                                articles['@graph'].push(data[dataIndex]['@graph'][0]);
                                            }
                                            familyArticles = articles;
                                            return Promise.resolve(data);
                                        });
                                    }
                                    return Promise(articles);
                                });
                            }
                        });
                    } else {
                        // No PMIDs entered; just pass null to the next then
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
                                    familyVariants.push(result['@graph'][0]['@id']);
                                    //familyVariants.push('/variants/' + result['@graph'][0].uuid + '/');
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
                                // Write the new variants to history
                                results.forEach(function(result) {
                                    this.recordHistory('add', result['@graph'][0]);
                                }, this);

                                // Add the newly written variants to the family
                                results.forEach(result => {
                                    familyVariants.push(result['@graph'][0]['@id']);
                                    //familyVariants.push('/variants/' + result['@graph'][0].uuid + '/');
                                });
                            }
                            return Promise.resolve(results);
                        });
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(null);
                }).then(data => {
                    var label, diseases;

                    // If we're editing a family, see if we need to update it and its proband individual
                    if (currFamily) {
                        if (currFamily.segregation && currFamily.segregation.variants && currFamily.segregation.variants.length) {
                            // The family being edited had variants; remember that for passing a query string var to family-submit
                            hadvar = true;
                        }

                        // If the family has a proband, update it to the current variant list, and then immediately on to creating a family.
                        if (this.state.probandIndividual) {
                            return updateProbandVariants(this.state.probandIndividual, familyVariants, this).then(data => {
                                return Promise.resolve(null);
                            });
                        }
                    }
                    // If we fall through to here, we know the family doesn't (yet) have a proband individual

                    // Creating or editing a family, and the form has at least one variant. Create the starter individual and return a promise
                    // from its creation. Also remember we have new variants.
                    if (this.state.variantCount && !this.state.probandIndividual && this.state.individualRequired) {
                        initvar = true;
                        label = this.getFormValue('individualname');
                        diseases = individualDiseases['@graph'].map(function(disease) { return disease['@id']; });
                        return makeStarterIndividual(label, diseases, familyVariants, this);
                    }

                    // Family doesn't have any variants
                    return Promise.resolve(null);
                }).then(individual => {
                    var gdmUuid = this.state.gdm && this.state.gdm.uuid;
                    var familyUuid = this.state.family && this.state.family.uuid;

                    // Write the assessment to the DB, if there was one. The assessment’s evidence_id won’t be set at this stage, and must be written after writing the family.
                    return this.saveAssessment(this.cv.assessmentTracker, gdmUuid, familyUuid).then(assessmentInfo => {
                        return Promise.resolve({starterIndividual: individual, assessment: assessmentInfo.assessment, updatedAssessment: assessmentInfo.update});
                    });
                }).then(data => {
                    // Make a list of assessments along with the new one if necessary
                    if (currFamily && currFamily.segregation && currFamily.segregation.assessments && currFamily.segregation.assessments.length) {
                        familyAssessments = currFamily.segregation.assessments.map(function(assessment) {
                            return assessment['@id'];
                        });
                    }
                    if (data.assessment && !data.updatedAssessment) {
                        familyAssessments.push(data.assessment['@id']);
                    }

                    // Make a new family object based on form fields.
                    var newFamily = this.createFamily(familyDiseases, familyArticles, familyVariants, familyAssessments);

                    // Prep for multiple family writes, based on the family count dropdown (only appears when creating a new family,
                    // not when editing a family). This is a count of *extra* families, so add 1 to it to get the number of families
                    // to create.
                    var familyPromises = [];
                    var familyCount = parseInt(this.getFormValue('extrafamilycount'), 10);
                    familyCount = familyCount ? familyCount + 1 : 1;

                    // Assign the starter individual if we made one
                    if (data.starterIndividual) {
                        if (!newFamily.individualIncluded) {
                            newFamily.individualIncluded = [];
                        }
                        newFamily.individualIncluded.push(data.starterIndividual['@id']);
                    }

                    // Write the new family object to the DB
                    return this.writeFamilyObj(newFamily).then(newFamily => {
                        return Promise.resolve(_.extend(data, {family: newFamily}));
                    });
                }).then(data => {
                    // If the assessment is missing its evidence_id; fill it in and update the assessment in the DB
                    var newFamily = data.family;
                    var newAssessment = data.assessment;
                    var gdmUuid = this.state.gdm && this.state.gdm.uuid;
                    var familyUuid = newFamily && newFamily.uuid;

                    if (newFamily && newAssessment && !newAssessment.evidence_id) {
                        // We saved a pathogenicity and assessment, and the assessment has no evidence_id. Fix that.
                        return this.saveAssessment(this.cv.assessmentTracker, gdmUuid, familyUuid, newAssessment).then(assessmentInfo => {
                            return Promise.resolve(_.extend(data, {assessment: assessmentInfo.assessment, updatedAssessment: assessmentInfo.update}));
                        });
                    }

                    // Next step relies on the pathogenicity, not the updated assessment
                    return Promise.resolve(data);
                }).then(data => {
                    var newFamily = data.family;
                    var promise;

                    // If we're adding this family to a group, update the group with this family; otherwise update the annotation
                    // with the family.
                    if (!this.state.family) {
                        // Adding a new family
                        if (this.state.group) {
                            // Add the newly saved families to the group
                            promise = this.getRestData('/groups/' + this.state.group.uuid, null, true).then(freshGroup => {
                                var group = curator.flatten(freshGroup);
                                if (!group.familyIncluded) {
                                    group.familyIncluded = [];
                                }
                                group.familyIncluded.push(newFamily['@id']);

                                // Post the modified group to the DB
                                return this.putRestData('/groups/' + this.state.group.uuid, group).then(groupGraph => {
                                    // The next step needs the family, not the group it was written to
                                    return Promise.resolve(_.extend(data, {group: groupGraph['@graph'][0]}));
                                });
                            });
                        } else {
                            // Not part of a group, so add the family to the annotation instead.
                            promise = this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                                // Get a flattened copy of the fresh annotation object and put our new family into it,
                                // ready for writing.
                                var annotation = curator.flatten(freshAnnotation);
                                if (!annotation.families) {
                                    annotation.families = [];
                                }
                                annotation.families.push(newFamily['@id']);

                                // Post the modified annotation to the DB
                                return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(annotation => {
                                    // The next step needs the family, not the group it was written to
                                    return Promise.resolve(_.extend(data, {annotation: annotation}));
                                });
                            });
                        }
                    } else {
                        // Editing an existing family
                        promise = Promise.resolve(data);
                    }
                    return promise;
                }).then(data => {
                    // Add to the user history. data.family always contains the new or edited family. data.group contains the group the family was
                    // added to, if it was added to a group. data.annotation contains the annotation the family was added to, if it was added to
                    // the annotation. If neither data.group nor data.annotation exist, data.family holds the existing family that was modified.
                    var meta, historyPromise;

                    if (data.annotation) {
                        // Record the creation of a new family added to a GDM
                        meta = {
                            family: {
                                gdm: this.state.gdm['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        historyPromise = this.recordHistory('add', data.family, meta);
                    } else if (data.group) {
                        // Record the creation of a new family added to a group
                        meta = {
                            family: {
                                gdm: this.state.gdm['@id'],
                                group: data.group['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        historyPromise = this.recordHistory('add', data.family, meta);
                    } else {
                        // Record the modification of an existing family
                        historyPromise = this.recordHistory('modify', data.family);
                    }

                    // Once we're done writing the family history, write the other related histories
                    historyPromise.then(() => {
                        // Write the starter individual history if there was one
                        if (data.starterIndividual) {
                            return recordIndividualHistory(this.state.gdm, this.state.annotation, data.starterIndividual, data.group, data.family, false, this);
                        }
                        return Promise.resolve(null);
                    }).then(() => {
                        // If we're assessing a family segregation, write that to history
                        if (data.family && data.assessment) {
                            this.saveAssessmentHistory(data.assessment, this.state.gdm, data.family, data.updatedAssessment);
                        }
                        return Promise.resolve(null);
                    });

                    // Navigate to Curation Central or Family Submit page, depending on previous page
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut && !initvar) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        this.context.navigate('/family-submit/?gdm=' + this.state.gdm.uuid + '&family=' + data.family.uuid + '&evidence=' + this.state.annotation.uuid + (initvar ? '&initvar' : '') + (hadvar ? '&hadvar' : ''));
                    }
                }).catch(function(e) {
                    console.log('FAMILY CREATION ERROR=: %o', e);
                });
            }
        }
    },

    // Create segregation object based on the form values
    createSegregation: function(newFamily, variants, assessments) {
        var newSegregation = {};
        var value1;

        // Unless others have assessed (in which case there's no segregation form), get the segregation
        // values from the form
        if (!this.cv.segregationAssessed) {
            value1 = this.getFormValue('SEGpedigreedesc');
            if (value1) {
                newSegregation[formMapSegregation['SEGpedigreedesc']] = value1;
            }
            value1 = this.getFormValue('SEGpedigreesize');
            if (value1) {
                newSegregation[formMapSegregation['SEGpedigreesize']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnogenerationsinpedigree');
            if (value1) {
                newSegregation[formMapSegregation['SEGnogenerationsinpedigree']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGconsanguineous');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGconsanguineous']] = value1 === 'Yes';
            }
            value1 = this.getFormValue('SEGnocases');
            if (value1) {
                newSegregation[formMapSegregation['SEGnocases']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGdenovo');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGdenovo']] = value1;
            }
            value1 = this.getFormValue('SEGunaffectedcarriers');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGunaffectedcarriers']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnoaffected');
            if (value1) {
                newSegregation[formMapSegregation['SEGnoaffected']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnoaffected1');
            if (value1) {
                newSegregation[formMapSegregation['SEGnoaffected1']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnoaffected2');
            if (value1) {
                newSegregation[formMapSegregation['SEGnoaffected2']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnounaffectedcarriers');
            if (value1) {
                newSegregation[formMapSegregation['SEGnounaffectedcarriers']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGnounaffectedindividuals');
            if (value1) {
                newSegregation[formMapSegregation['SEGnounaffectedindividuals']] = parseInt(value1, 10);
            }
            value1 = this.getFormValue('SEGbothvariants');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGbothvariants']] = value1 === 'Yes';
            }
            value1 = this.getFormValue('SEGaddedsegregationinfo');
            if (value1) {
                newSegregation[formMapSegregation['SEGaddedsegregationinfo']] = value1;
            }
        } else if (newFamily.segregation && Object.keys(newFamily.segregation).length) {
            newSegregation = _.clone(newFamily.segregation);
        }

        if (variants) {
            newSegregation.variants = variants;
        }

        if (assessments) {
            newSegregation.assessments = assessments;
        }

        if (Object.keys(newSegregation).length) {
            newFamily.segregation = newSegregation;
        }
    },

    // Create a family object to be written to the database. Most values come from the values
    // in the form. The created object is returned from the function.
    createFamily: function(familyDiseases, familyArticles, familyVariants, familyAssessments) {
        // Make a new family. If we're editing the form, first copy the old family
        // to make sure we have everything not from the form.
        var newFamily = this.state.family ? curator.flatten(this.state.family) : {};

        // Method and/or segregation successfully created if needed (null if not); passed in 'methSeg' object. Now make the new family.
        newFamily.label = this.getFormValue('familyname');

        // Get an array of all given disease IDs
        if (familyDiseases) {
            newFamily.commonDiagnosis = familyDiseases['@graph'].map(function(disease) { return disease['@id']; });
        }
        else if (newFamily.commonDiagnosis && newFamily.commonDiagnosis.length > 0) {
            // allow to delete oephanet ids when editing family
            delete newFamily.commonDiagnosis;
        }

        // Add array of other PMIDs
        if (familyArticles) {
            newFamily.otherPMIDs = familyArticles['@graph'].map(function(article) { return article['@id']; });
        }

        // Fill in the group fields from the Common Diseases & Phenotypes panel
        var hpoTerms = this.getFormValue('hpoid');
        if (hpoTerms) {
            newFamily.hpoIdInDiagnosis = _.compact(hpoTerms.toUpperCase().split(','));
        }
        else if (newFamily.hpoIdInDiagnosis) {
            // allow to delete HPO ids
            delete newFamily.hpoIdInDiagnosis;
        }
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newFamily.termsInDiagnosis = phenoterms;
        }
        else if (newFamily.termsInDiagnosis) {
            // allow to delete phenotype free text
            delete newFamily.termsInDiagnosis;
        }
        hpoTerms = this.getFormValue('nothpoid');
        if (hpoTerms) {
            newFamily.hpoIdInElimination = _.compact(hpoTerms.toUpperCase().split(','));
        }
        phenoterms = this.getFormValue('notphenoterms');
        if (phenoterms) {
            newFamily.termsInElimination = phenoterms;
        }

        // Fill in the group fields from the Family Demographics panel
        var value = this.getFormValue('malecount');
        if (value) { newFamily.numberOfMale = parseInt(value, 10); }

        value = this.getFormValue('femalecount');
        if (value) { newFamily.numberOfFemale = parseInt(value, 10); }

        value = this.getFormValue('country');
        if (value !== 'none') { newFamily.countryOfOrigin = value; }

        value = this.getFormValue('ethnicity');
        if (value !== 'none') { newFamily.ethnicity = value; }

        value = this.getFormValue('race');
        if (value !== 'none') { newFamily.race = value; }

        value = this.getFormValue('agerangetype');
        if (value !== 'none') { newFamily.ageRangeType = value + ''; }

        value = this.getFormValue('agefrom');
        if (value) { newFamily.ageRangeFrom = parseInt(value, 10); }

        value = this.getFormValue('ageto');
        if (value) { newFamily.ageRangeTo = parseInt(value, 10); }

        value = this.getFormValue('ageunit');
        if (value !== 'none') { newFamily.ageRangeUnit = value; }

        value = this.getFormValue('additionalinfofamily');
        if (value) { newFamily.additionalInformation = value; }

        // Fill in the segregation fields to the family, if there was a form (no form if assessed)
        this.createSegregation(newFamily, familyVariants, familyAssessments);

        return newFamily;
    },

    // Add another variant section to the FamilyVariant panel
    handleAddVariant: function() {
        this.setState({variantCount: this.state.variantCount + 1, addVariantDisabled: true});
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateClinvarVariantId: function(data, fieldNum) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        var currVariantOption = this.state.variantOption;
        var addVariantDisabled;
        if (data) {
            // Enable/Disable Add Variant button as needed
            if (fieldNum == 0) {
                addVariantDisabled = false;
            } else {
                addVariantDisabled = true;
            }
            // Update the form and display values with new data
            this.refs['VARclinvarid' + fieldNum].setValue(data.clinvarVariantId);
            newVariantInfo[fieldNum] = {'clinvarVariantId': data.clinvarVariantId, 'clinvarVariantTitle': data.clinvarVariantTitle};
            // Disable the 'Other description' textarea
            this.refs['VARothervariant' + fieldNum].resetValue();
            currVariantOption[parseInt(fieldNum)] = VAR_SPEC;
        } else {
            // Reset the form and display values
            this.refs['VARclinvarid' + fieldNum].setValue('');
            delete newVariantInfo[fieldNum];
            // Reenable the 'Other description' textarea
            currVariantOption[parseInt(fieldNum)] = VAR_NONE;
        }

        // if variant data entered, must enter proband individual name and orphanet
        // First check if data entered in either ClinVar Variant ID or Other description at each variant
        var noVariantData = true;
        _.range(this.state.variantCount).map(i => {
            if (this.refs['VARclinvarid' + i].getValue() || this.refs['VARothervariant' + i].getValue()) {
                noVariantData = false;
            }
        });
        // If not entered at all, proband individua is not required and must be no error messages at individual fields.
        if (noVariantData) {
            this.setState({individualRequired: false});
            var errors = this.state.formErrors;
            errors['individualname'] = '';
            errors['individualorphanetid'] = '';
            this.setState({formErrors: errors});
        } else {
            this.setState({individualRequired: true});
        }

        // Set state
        this.setState({variantInfo: newVariantInfo, variantOption: currVariantOption, addVariantDisabled: addVariantDisabled});
    },

    // Determine whether a Family is associated with a Group
    // or
    // whether an individual is associated with a Family or a Group
    getAssociation: function(item) {
        var associatedGroups, associatedFamilies;

        if (this.state.group) {
            associatedGroups = [this.state.group];
        } else if (this.state.family && this.state.family.associatedGroups && this.state.family.associatedGroups.length) {
            associatedGroups = this.state.family.associatedGroups;
        }

        if (this.state.family) {
            associatedFamilies = [this.state.family];
        } else if (this.state.individual && this.state.individual.associatedFamilies && this.state.individual.associatedFamilies.length) {
            associatedFamilies = this.state.individual.associatedFamilies;
        }

        switch(item) {
            case 'individual':
                return this.state.individual;

            case 'family':
                return this.state.family;

            case 'associatedFamilies':
                return associatedFamilies;

            case 'associatedGroups':
                return associatedGroups;

            default:
                break;
        }
    },

    // After the Family Curation page component mounts, grab the GDM, group, family, and annotation UUIDs (as many as given)
    // from the query string and retrieve the corresponding objects from the DB, if they exist. Note, we have to do this after
    // the component mounts because AJAX DB queries can't be done from unmounted components.
    componentDidMount: function() {
        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.loadData();
    },

    componentWillUnmount: function() {
        // Flush family-specific segregation data
        if (this.cv.segregationAssessed && this.cv.segregationAssessed != false) {
            this.cv.segregationAssessed = false;
        }
        if (this.cv.filledSegregations && Object.keys(this.cv.filledSegregations).length > 0) {
            this.cv.filledSegregations = {};
        }
        if (this.cv.othersAssessed && this.cv.othersAssessed != false) {
            this.cv.othersAssessed = false;
        }
    },

    render: function() {
        var gdm = this.state.gdm;
        var family = this.state.family;
        var groups = (family && family.associatedGroups) ? family.associatedGroups :
            (this.state.group ? [this.state.group] : null);
        var annotation = this.state.annotation;
        var pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        var method = (family && family.method && Object.keys(family.method).length) ? family.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        var assessments = [];
        var userAssessmentValue = null;
        if (family && family.segregation && family.segregation.assessments && family.segregation.assessments.length) {
            _.map(family.segregation.assessments, assessment => {
                if (assessment.value !== 'Not Assessed') {
                    assessments.push(assessment);
                    if (assessment.submitted_by.uuid === session.user_properties.uuid) {
                        userAssessmentValue = assessment.value;
                    }
                }
            });
        }
        //var is_owner = session && family && (session.user_properties.uuid === family.submitted_by.uuid) ? true : false;

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.familyUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/family-submit/?gdm=' + gdm.uuid + (family ? '&family=' + family.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        //if (!this.state.segregationFilled && (this.cv.assessmentTracker.currentVal !== 'Not Assessed' || !userAssessmentValue)) {
        //    this.cv.assessmentTracker.currentVal = 'Not Assessed';
        //} else if (userAssessmentValue) {
        //    this.cv.assessmentTracker.currentVal = userAssessmentValue;
        //}

        return (
            <div>
                {(!this.queryValues.familyUuid || this.state.family) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(family ? 'Edit' : 'Curate') + ' Family Information'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    {groups && groups.length ?
                                        <span> &#x2F;&#x2F; Group {groups.map(function(group, i) { return <span key={group['@id']}>{i > 0 ? ', ' : ''}<a href={group['@id']}>{group.label}</a></span>; })}</span>
                                    : null}
                                    <span> &#x2F;&#x2F; {this.state.familyName ? <span>Family {this.state.familyName}</span> : <span className="no-entry">No entry</span>}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {FamilyName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Family – Common Disease(s) & Phenotype(s)" open>
                                                {FamilyCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family — Demographics" open>
                                                {FamilyDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family — Methods" open>
                                                {methods.render.call(this, method, true)}
                                            </Panel>
                                        </PanelGroup>

                                        {!this.cv.segregationAssessed ?
                                            <PanelGroup accordion>
                                                <Panel title="Family — Segregation" open>
                                                    {FamilySegregation.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                        :
                                            <div>
                                                {family && family.segregation ?
                                                    <PanelGroup accordion>
                                                        {FamilySegregationViewer(family.segregation, null, true)}
                                                    </PanelGroup>
                                                : null}
                                            </div>
                                        }

                                        <Panel panelClassName="panel-data">
                                            <dl className="dl-horizontal">
                                                <dt>Assessments</dt>
                                                <dd>
                                                    {assessments.length ? assessments.map(function(assessment, i) {
                                                        return (
                                                            <span key={assessment.uuid}>
                                                                {assessment.value} ({assessment.submitted_by.title})
                                                                {i < assessments.length-1 ? <br /> : null}
                                                            </span>
                                                        );})
                                                    :
                                                    <div>None</div>
                                                    }
                                                </dd>
                                            </dl>
                                        </Panel>

                                        <PanelGroup accordion>
                                            <AssessmentPanel panelTitle="Family — Segregation Assessment" assessmentTracker={this.cv.assessmentTracker} noSeg={this.state.segregationFilled ? false : true}
                                                updateValue={this.updateAssessmentValue} disableDefault={this.cv.othersAssessed} ownerNotAssessed={false} accordion open />
                                        </PanelGroup>

                                        <PanelGroup accordion>
                                            <Panel title="Family — Variant(s) Segregating with Proband" open>
                                                {FamilyVariant.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Additional Information" open>
                                                {FamilyAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {family ?
                                                <DeleteButton gdm={gdm} parent={groups.length > 0 ? groups[0] : annotation} item={family} pmid={pmid} disabled={this.cv.othersAssessed} />
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

globals.curator_page.register(FamilyCuration, 'curator_page', 'family-curation');


// Family Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyName = function(displayNote) {
    var family = this.state.family;

    return (
        <div className="row">
            {!this.getAssociation('family') && !this.getAssociation('associatedGroups') ?
                <div className="col-sm-7 col-sm-offset-5"><p className="alert alert-warning">If this Family is a member of a Group, please curate the Group first and then add the Family to that Group.</p></div>
            : null}
            <Input type="text" ref="familyname" label="Family Label:" value={family && family.label} handleChange={this.handleChange}
                error={this.getFormError('familyname')} clearError={this.clrFormErrors.bind(null, 'familyname')} maxLength="60"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">{curator.renderLabelNote('Family')}</p>
            {displayNote ?
                <p className="col-sm-7 col-sm-offset-5">Note: If there is more than one family with IDENTICAL information, you can indicate this at the bottom of this form.</p>
            : null}
        </div>
    );
};


// If the Family is being edited (we know this because there was a family
// UUID in the query string), then don’t present the ability to specify multiple families.
var FamilyCount = function() {
    var family = this.state.family;

    return (
        <div>
            <p className="col-sm-7 col-sm-offset-5">
                If more than one family has exactly the same information entered above and is associated with the same variants, you can specify how many extra copies of this
                family to make with this drop-down menu to indicate how many <em>extra</em> copies of this family to make when you submit this form, and specify the names
                of each extra family below that.
            </p>
            <Input type="select" ref="extrafamilycount" label="Number of extra identical Families to make:" defaultValue="0" handleChange={this.extraFamilyCountChanged}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                {_.range(11).map(function(count) { return <option key={count}>{count}</option>; })}
            </Input>
            {_.range(this.state.extraFamilyCount).map(i => {
                return (
                    <Input key={i} type="text" ref={'extrafamilyname' + i} label={'Family Name ' + (i + 2)}
                        error={this.getFormError('extrafamilyname' + i)} clearError={this.clrFormErrors.bind(null, 'extrafamilyname' + i)}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                );
            })}
        </div>
    );
};


// Common diseases family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyCommonDiseases = function() {
    var family = this.state.family;
    var group = this.state.group;
    var orphanetidVal, hpoidVal, nothpoidVal, associatedGroups;

    // If we're editing a family, make editable values of the complex properties
    if (family) {
        orphanetidVal = family.commonDiagnosis ? family.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join(', ') : null;
        hpoidVal = family.hpoIdInDiagnosis ? family.hpoIdInDiagnosis.join(', ') : null;
        nothpoidVal = family.hpoIdInElimination ? family.hpoIdInElimination.join(', ') : null;
    }

    // Make a list of diseases from the group, either from the given group,
    // or the family if we're editing one that has associated groups.renderPhenotype
    if (group) {
        // We have a group, so get the disease array from it.
        associatedGroups = [group];
    } else if (family && family.associatedGroups && family.associatedGroups.length) {
        // We have a family with associated groups. Combine the diseases from all groups.
        associatedGroups = family.associatedGroups;
    }

    return (
        <div className="row">
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ? curator.renderOrphanets(associatedGroups, 'Group') : null}
            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ?
            <Input type="button" ref="orphanetcopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Orphanet IDs from Associated Group"
                clickHandler={this.handleClick.bind(this, 'group', 'orphanetid')} />
            : null}
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Family', 'hpo') : curator.renderPhenotype(null, 'Family', 'hpo')
            }
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Family', 'ft') : curator.renderPhenotype(null, 'Family', 'ft')
            }
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={family && family.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
            <Input type="button" ref="phenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy all Phenotype(s) from Associated Group"
                clickHandler={this.handleClick.bind(this, 'group', 'phenotype')} />
            : null
            }
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Family</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={family && family.termsInElimination}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Disease(s) in Common <span className="normal">(<a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet home page in a new tab">Orphanet</a> term)</span>:</span>;
    }
});

// HTML labels for inputs follow.
var LabelHpoId = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
            </span>
        );
    }
});

// HTML labels for inputs follow.
var LabelPhenoTerms = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                <span className="normal">(free text)</span>:
            </span>
        );
    }
});

// Demographics family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyDemographics = function() {
    var family = this.state.family;

    return (
        <div className="row">
            <Input type="number" ref="malecount" label="# males:" value={family && family.numberOfMale}
                error={this.getFormError('malecount')} clearError={this.clrFormErrors.bind(null, 'malecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="femalecount" label="# females:" value={family && family.numberOfFemale}
                error={this.getFormError('femalecount')} clearError={this.clrFormErrors.bind(null, 'femalecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={family && family.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={family && family.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={family && family.race}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Asian">Asian</option>
                <option value="Black">Black</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="White">White</option>
                <option value="Mixed">Mixed</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Age Range</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none" value={family && family.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="number" ref="agefrom" inputClassName="input-inline" groupClassName="form-group-inline group-age-input" maxVal={150}
                        error={this.getFormError('agefrom')} clearError={this.clrFormErrors.bind(null, 'agefrom')} value={family && family.ageRangeFrom} />
                    <span className="group-age-inter">to</span>
                    <Input type="number" ref="ageto" inputClassName="input-inline" groupClassName="form-group-inline group-age-input" maxVal={150}
                        error={this.getFormError('ageto')} clearError={this.clrFormErrors.bind(null, 'ageto')} value={family && family.ageRangeTo} />
                </Input>
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={family && family.ageRangeUnit}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                </Input>
            </div>
        </div>
    );
};


// Segregation family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilySegregation = function() {
    var family = this.state.family;
    var segregation = (family && family.segregation && Object.keys(family.segregation).length) ? family.segregation : {};

    return (
        <div className="row">
            <Input type="textarea" ref="SEGpedigreedesc" label="Pedigree description:" rows="5" value={segregation.pedigreeDescription} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGpedigreesize" label="Pedigree size:" value={segregation.pedigreeSize} minVal={2} handleChange={this.handleChange}
                error={this.getFormError('SEGpedigreesize')} clearError={this.clrFormErrors.bind(null, 'SEGpedigreesize')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGnogenerationsinpedigree" label="# generations in pedigree:" value={segregation.numberOfGenerationInPedigree} handleChange={this.handleChange}
                error={this.getFormError('SEGnogenerationsinpedigree')} clearError={this.clrFormErrors.bind(null, 'SEGnogenerationsinpedigree')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="SEGconsanguineous" label="Consanguineous family?:" defaultValue="none" value={curator.booleanToDropdown(segregation.consanguineousFamily)} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <Input type="number" ref="SEGnocases" label="# cases (phenotype positive):" value={segregation.numberOfCases} minVal={1} handleChange={this.handleChange}
                error={this.getFormError('SEGnocases')} clearError={this.clrFormErrors.bind(null, 'SEGnocases')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="SEGdenovo" label="de novo type:" defaultValue="none" value={segregation.deNovoType} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Inferred">Inferred</option>
                <option value="Confirmed">Confirmed</option>
            </Input>
            <Input type="select" ref="SEGunaffectedcarriers" label="# parents who are unaffected carriers" defaultValue="none" value={segregation.numberOfParentsUnaffectedCarriers} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
            </Input>
            <Input type="number" ref="SEGnoaffected" label="# affected individuals:" value={segregation.numberOfAffectedAlleles} handleChange={this.handleChange}
                error={this.getFormError('SEGnoaffected')} clearError={this.clrFormErrors.bind(null, 'SEGnoaffected')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGnoaffected1" label="# affected with 1 variant:" value={segregation.numberOfAffectedWithOneVariant} handleChange={this.handleChange}
                error={this.getFormError('SEGnoaffected1')} clearError={this.clrFormErrors.bind(null, 'SEGnoaffected1')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGnoaffected2" label="# affected with 2 different variants or homozygous for 1:" value={segregation.numberOfAffectedWithTwoVariants} handleChange={this.handleChange}
                error={this.getFormError('SEGnoaffected2')} clearError={this.clrFormErrors.bind(null, 'SEGnoaffected2')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGnounaffectedcarriers" label="# unaffected carriers:" value={segregation.numberOfUnaffectedCarriers} handleChange={this.handleChange}
                error={this.getFormError('SEGnounaffectedcarriers')} clearError={this.clrFormErrors.bind(null, 'SEGnounaffectedcarriers')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="SEGnounaffectedindividuals" label="# unaffected individuals:" value={segregation.numberOfUnaffectedIndividuals} handleChange={this.handleChange}
                error={this.getFormError('SEGnounaffectedindividuals')} clearError={this.clrFormErrors.bind(null, 'SEGnounaffectedindividuals')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="SEGbothvariants" label="If more than 1 variant, is proband associated with both?" defaultValue="none" value={curator.booleanToDropdown(segregation.probandAssociatedWithBoth)} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <Input type="textarea" ref="SEGaddedsegregationinfo" label="Additional Segregation Information:" rows="5" value={segregation.additionalInformation} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// Display the Family variant panel. The number of copies depends on the variantCount state variable.
var FamilyVariant = function() {
    var family = this.state.family;
    var segregation = family && family.segregation ? family.segregation : null;
    var variants = segregation && segregation.variants;

    return (
        <div className="row">
            {!family || !family.segregation || !family.segregation.variants || family.segregation.variants.length === 0 ?
                <div className="row">
                    <p className="col-sm-7 col-sm-offset-5">
                        To create and have the option to count a proband associated with a variant(s) for this Family, you need to add variant information in this section.
                        The proband (an Individual) will be created upon submission using the label you supply here. You will be able to add additional information about the proband
                        following submission of Family information.
                    </p>
                    <p className="col-sm-7 col-sm-offset-5">
                        Note: Probands are indicated by the following icon: <i className="icon icon-proband"></i>
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
                        {this.state.variantInfo[i] ?
                            <div>
                                <div className="row">
                                    <span className="col-sm-5 control-label"><label>{<LabelClinVarVariant />}</label></span>
                                    <span className="col-sm-7 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.variantInfo[i].clinvarVariantId} target="_blank">{this.state.variantInfo[i].clinvarVariantId}</a></span>
                                </div>
                                <div className="row">
                                    <span className="col-sm-5 control-label"><label>{<LabelClinVarVariantTitle />}</label></span>
                                    <span className="col-sm-7 text-no-input clinvar-preferred-title">{this.state.variantInfo[i].clinvarVariantTitle}</span>
                                </div>
                            </div>
                        : null}
                        <Input type="text" ref={'VARclinvarid' + i} value={variant && variant.clinvarVariantId} handleChange={this.handleChange}
                            error={this.getFormError('VARclinvarid' + i)} clearError={this.clrFormErrors.bind(null, 'VARclinvarid' + i)}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" />
                        <AddResourceId resourceType="clinvar" label={<LabelClinVarVariant />} labelVisible={!this.state.variantInfo[i]}
                            buttonText={this.state.variantOption[i] === VAR_SPEC ? "Edit ClinVar ID" : "Add ClinVar ID" } protocol={this.props.href_url.protocol}
                            initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId} fieldNum={String(i)}
                            updateParentForm={this.updateClinvarVariantId} disabled={this.state.variantOption[i] === VAR_OTHER} />
                        <Input type="textarea" ref={'VARothervariant' + i} label={<LabelOtherVariant />} rows="5" value={variant && variant.otherDescription} inputDisabled={this.state.variantOption[i] === VAR_SPEC}
                            handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group other-variant-desc" />
                        {curator.renderMutalyzerLink()}
                    </div>
                );
            })}
            {this.state.variantCount && !this.state.probandIndividual && this.state.individualRequired ?
                <div className="variant-panel">
                    <Input type="text" ref="individualname" label="Individual Label"
                        error={this.getFormError('individualname')} clearError={this.clrFormErrors.bind(null, 'individualname')} maxLength="60"
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                    <p className="col-sm-7 col-sm-offset-5 input-note-below">Note: Do not enter real names in this field. {curator.renderLabelNote('Individual')}</p>
                    {this.state.orpha ?
                        <div className="form-group">
                            <div className="col-sm-5"><strong className="pull-right">Orphanet Disease(s) Associated with Family:</strong></div>
                            <div className="col-sm-7">{this.state.existedOrphanetId}</div>
                        </div>
                        : null
                    }
                    <Input type="text" ref="individualorphanetid" label="Orphanet Disease(s) for Individual" placeholder="e.g. ORPHA15"
                        error={this.getFormError('individualorphanetid')} clearError={this.clrFormErrors.bind(null, 'individualorphanetid')}
                        buttonClassName="btn btn-default" buttonLabel="Copy From Family" buttonHandler={this.handleclick}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                    { this.state.orpha ?
                        <Input type="button" ref="orphanetcopy" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Orphanet IDs from Family"
                        clickHandler={this.handleClick.bind(this, 'family', 'orphanetid')} />
                        :
                        null
                    }
                </div>
            : null }
            {this.state.variantCount < MAX_VARIANTS ?
                <div className="row">
                    <div className="col-sm-7 col-sm-offset-5 clearfix">
                        {this.state.variantCount ?
                            <p className="alert alert-warning">
                                For a recessive condition, you must enter both variants believed to be causative for the disease in order that
                                each may be associated with the Individual and assessed (except in the case of homozygous recessive, then the
                                variant need only be entered once). Additionally, each variant must be assessed as supports for the Individual to be counted.
                            </p>
                        : null}
                        <Input type="button" ref="addvariant" inputClassName="btn-default btn-last pull-right" title={this.state.variantCount ? "Add another variant associated with Individual" : "Add variant associated with Individual"}
                            clickHandler={this.handleAddVariant} inputDisabled={this.state.addVariantDisabled} />
                    </div>
                </div>
            : null}
        </div>
    );
};

var LabelClinVarVariant = React.createClass({
    render: function() {
        return <span><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> VariationID:</span>;
    }
});

var LabelClinVarVariantTitle = React.createClass({
    render: function() {
        return <span><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Preferred Title:</span>;
    }
});

var LabelOtherVariant = React.createClass({
    render: function() {
        return <span>Other description <span className="normal">(only when ClinVar VariationID is not available):</span></span>;
    }
});


// Additional Information family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyAdditional = function() {
    var otherpmidsVal;
    var family = this.state.family;
    if (family) {
        otherpmidsVal = family.otherPMIDs ? family.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : null;
    }

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfofamily" label="Additional Information about Family:" rows="5" value={family && family.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same family:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// Determine whether the given segregation contains any non-empty values.
function segregationExists(segregation) {
    var exists = false;

    if (segregation) {
        exists = (segregation.pedigreeDescription && segregation.pedigreeDescription.length > 0) ||
                  segregation.pedigreeSize ||
                  segregation.numberOfGenerationInPedigree ||
                  segregation.consanguineousFamily ||
                  segregation.numberOfCases ||
                 (segregation.deNovoType && segregation.deNovoType.length > 0) ||
                  segregation.numberOfParentsUnaffectedCarriers ||
                  segregation.numberOfAffectedAlleles ||
                  segregation.numberOfAffectedWithOneVariant ||
                  segregation.numberOfAffectedWithTwoVariants ||
                  segregation.numberOfUnaffectedCarriers ||
                  segregation.numberOfUnaffectedIndividuals ||
                  segregation.probandAssociatedWithBoth ||
                 (segregation.additionalInformation && segregation.additionalInformation.length > 0);
    }
    return exists;
}


var FamilyViewer = React.createClass({
    mixins: [RestMixin, AssessmentMixin, CuratorHistory],

    cv: {
        assessmentTracker: null, // Tracking object for a single assessment
        gdmUuid: '' // UUID of the GDM; passed in the query string
    },

    getInitialState: function() {
        return {
            assessments: null, // Array of assessments for the family's segregation
            updatedAssessment: '', // Updated assessment value
            submitBusy: false // True while form is submitting
        };
    },

    // Handle the assessment submit button
    assessmentSubmit: function(e) {
        var updatedFamily;
        // GET the family object to have the most up-to-date version
        this.getRestData('/families/' + this.props.context.uuid).then(data => {
            this.setState({submitBusy: true});
            var family = data;

            // Write the assessment to the DB, if there was one.
            return this.saveAssessment(this.cv.assessmentTracker, this.cv.gdmUuid, this.props.context.uuid).then(assessmentInfo => {
                // If we're assessing a family segregation, write that to history
                this.saveAssessmentHistory(assessmentInfo.assessment, null, family, assessmentInfo.update);

                // If we made a new assessment, add it to the family's assessments
                if (assessmentInfo.assessment && !assessmentInfo.update) {
                    updatedFamily = curator.flatten(family);
                    if (!updatedFamily.segregation.assessments) {
                        updatedFamily.segregation.assessments = [];
                    }
                    updatedFamily.segregation.assessments.push(assessmentInfo.assessment['@id']);

                    // Write the updated family object to the DB
                    return this.putRestData('/families/' + family.uuid, updatedFamily).then(data => {
                        return this.getRestData('/families/' + data['@graph'][0].uuid);
                    });
                }

                // Didn't update the family; if updated the assessment, reload the family
                if (assessmentInfo.update) {
                    return this.getRestData('/families/' + family.uuid);
                }

                // Not updating the family
                return Promise.resolve(family);
            });
        }).then(updatedFamily => {
            // update the assessmentTracker object so it accounts for any new assessments
            var userAssessment;
            var assessments = updatedFamily.segregation.assessments;
            var user = this.props.session && this.props.session.user_properties;

            // Find if any assessments for the segregation are owned by the currently logged-in user
            if (assessments && assessments.length) {
                // Find the assessment belonging to the logged-in curator, if any.
                userAssessment = Assessments.userAssessment(assessments, user && user.uuid);
            }
            this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');

            // Wrote the family, so update the assessments state to the new assessment list
            if (updatedFamily && updatedFamily.segregation && updatedFamily.segregation.assessments && updatedFamily.segregation.assessments.length) {
                this.setState({assessments: updatedFamily.segregation.assessments, updatedAssessment: this.cv.assessmentTracker.getCurrentVal()});
            }

            this.setState({submitBusy: false}); // done w/ form submission; turn the submit button back on
            return Promise.resolve(null);
        }).then(data => {
            var tempGdmPmid = curator.findGdmPmidFromObj(this.props.context);
            var tempGdm = tempGdmPmid[0];
            var tempPmid = tempGdmPmid[1];
            window.location.href = '/curation-central/?gdm=' + tempGdm.uuid + '&pmid=' + tempPmid;
        }).catch(function(e) {
            console.log('FAMILY VIEW UPDATE ERROR=: %o', e);
        });
    },

    componentWillMount: function() {
        var family = this.props.context;

        // Get the GDM and Family UUIDs from the query string
        this.cv.gdmUuid = queryKeyValue('gdm', this.props.href);
        if (family && family.segregation && family.segregation.assessments && family.segregation.assessments.length) {
            this.setState({assessments: family.segregation.assessments});
        }

        if (typeof this.props.session.user_properties !== undefined) {
            var user = this.props.session && this.props.session.user_properties;
            this.loadAssessmentTracker(user);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (typeof nextProps.session.user_properties !== undefined && nextProps.session.user_properties != this.props.session.user_properties) {
            var user = nextProps.session && nextProps.session.user_properties;
            this.loadAssessmentTracker(user);
        }
    },

    loadAssessmentTracker: function(user) {
        var family = this.props.context;
        var segregation = family.segregation;
        var assessments = this.state.assessments ? this.state.assessments : (segregation ? segregation.assessments : null);

        // Make an assessment tracker object once we get the logged in user info
        if (!this.cv.assessmentTracker && user && segregation) {
            var userAssessment;

            // Find if any assessments for the segregation are owned by the currently logged-in user
            if (assessments && assessments.length) {
                // Find the assessment belonging to the logged-in curator, if any.
                userAssessment = Assessments.userAssessment(assessments, user && user.uuid);
            }
            this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');
        }
    },

    render: function() {
        var family = this.props.context;
        var method = family.method;
        var groups = family.associatedGroups;
        var segregation = family.segregation;
        var assessments = this.state.assessments ? this.state.assessments : (segregation ? segregation.assessments : null);
        var validAssessments = [];
        _.map(assessments, assessment => {
            if (assessment.value !== 'Not Assessed') {
                validAssessments.push(assessment);
            }
        });
        //var is_assessed = false; // filter out Not Assessed in assessments
        //for(var i=0; i< assessments.length; i++) {
        //    if (assessments[i].value !== 'Not Assessed') {
        //        is_assessed = true;
        //        break;
        //    }
        //}

        var variants = segregation ? ((segregation.variants && segregation.variants.length) ? segregation.variants : [{}]) : [{}];
        var user = this.props.session && this.props.session.user_properties;
        var userFamily = user && family && family.submitted_by ? user.uuid === family.submitted_by.uuid : false;
        var familyUserAssessed = false; // TRUE if logged-in user doesn't own the family, but the family's owner assessed its segregation
        var othersAssessed = false; // TRUE if we own this segregation, and others have assessed it
        var updateMsg = this.state.updatedAssessment ? 'Assessment updated to ' + this.state.updatedAssessment : '';

        // See if others have assessed
        if (userFamily) {
            othersAssessed = Assessments.othersAssessed(assessments, user.uuid);
        }

        // Note if we don't own the family, but the owner has assessed the segregation
        if (user && family && family.submitted_by) {
            var familyUserAssessment = Assessments.userAssessment(assessments, family.submitted_by.uuid);
            if (familyUserAssessment && familyUserAssessment.value !== Assessments.DEFAULT_VALUE) {
                familyUserAssessed = true;
            }
        }

        // See if the segregation contains anything.
        var haveSegregation = segregationExists(segregation);

        var tempGdmPmid = curator.findGdmPmidFromObj(family);
        var tempGdm = tempGdmPmid[0];
        var tempPmid = tempGdmPmid[1];

        return (
            <div>
                <ViewRecordHeader gdm={tempGdm} pmid={tempPmid} />
                <div className="container">
                    <div className="row curation-content-viewer">
                        <div className="viewer-titles">
                            <h1>View Family: {family.label}</h1>
                            <h2>
                                {tempGdm ? <a href={'/curation-central/?gdm=' + tempGdm.uuid + (tempGdm ? '&pmid=' + tempPmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                {groups && groups.length ?
                                    <span> &#x2F;&#x2F; Group {groups.map(function(group, i) { return <span key={group['@id']}>{i > 0 ? ', ' : ''}<a href={group['@id']}>{group.label}</a></span>; })}</span>
                                : null}
                                <span> &#x2F;&#x2F; Family {family.label}</span>
                            </h2>
                        </div>
                        <Panel title="Common Disease(s) & Phenotype(s)" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Orphanet Common Diagnosis</dt>
                                    <dd>{family.commonDiagnosis && family.commonDiagnosis.map(function(disease, i) {
                                        return <span key={disease.orphaNumber}>{i > 0 ? ', ' : ''}{disease.term} (<a href={external_url_map['OrphaNet'] + disease.orphaNumber} title={"OrphaNet entry for ORPHA" + disease.orphaNumber + " in new tab"} target="_blank">ORPHA{disease.orphaNumber}</a>)</span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>HPO IDs</dt>
                                    <dd>{family.hpoIdInDiagnosis && family.hpoIdInDiagnosis.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype Terms</dt>
                                    <dd>{family.termsInDiagnosis}</dd>
                                </div>

                                <div>
                                    <dt>NOT HPO IDs</dt>
                                    <dd>{family.hpoIdInElimination && family.hpoIdInElimination.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>NOT phenotype terms</dt>
                                    <dd>{family.termsInElimination}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Family — Demographics" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt># Males</dt>
                                    <dd>{family.numberOfMale}</dd>
                                </div>

                                <div>
                                    <dt># Females</dt>
                                    <dd>{family.numberOfFemale}</dd>
                                </div>

                                <div>
                                    <dt>Country of Origin</dt>
                                    <dd>{family.countryOfOrigin}</dd>
                                </div>

                                <div>
                                    <dt>Ethnicity</dt>
                                    <dd>{family.ethnicity}</dd>
                                </div>

                                <div>
                                    <dt>Race</dt>
                                    <dd>{family.race}</dd>
                                </div>

                                <div>
                                    <dt>Age Range Type</dt>
                                    <dd>{family.ageRangeType}</dd>
                                </div>

                                <div>
                                    <dt>Age Range</dt>
                                    <dd>{family.ageRangeFrom || family.ageRangeTo ? <span>{family.ageRangeFrom + ' – ' + family.ageRangeTo}</span> : null}</dd>
                                </div>

                                <div>
                                    <dt>Age Range Unit</dt>
                                    <dd>{family.ageRangeUnit}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Family — Methods" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Previous testing</dt>
                                    <dd>{method ? (method.previousTesting === true ? 'Yes' : (method.previousTesting === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Description of previous testing</dt>
                                    <dd>{method && method.previousTestingDescription}</dd>
                                </div>

                                <div>
                                    <dt>Genome-wide study</dt>
                                    <dd>{method ? (method.genomeWideStudy === true ? 'Yes' : (method.genomeWideStudy === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Genotyping methods</dt>
                                    <dd>{method && method.genotypingMethods && method.genotypingMethods.join(', ')}</dd>
                                </div>

                                <div>
                                    <dt>Entire gene sequenced</dt>
                                    <dd>{method ? (method.entireGeneSequenced === true ? 'Yes' : (method.entireGeneSequenced === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Copy number assessed</dt>
                                    <dd>{method ? (method.copyNumberAssessed === true ? 'Yes' : (method.copyNumberAssessed === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Specific mutations genotyped</dt>
                                    <dd>{method ? (method.specificMutationsGenotyped === true ? 'Yes' : (method.specificMutationsGenotyped === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Description of genotyping method</dt>
                                    <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                                </div>

                                <div>
                                    <dt>Additional Information about Family Method</dt>
                                    <dd>{method && method.additionalInformation}</dd>
                                </div>
                            </dl>
                        </Panel>

                        {FamilySegregationViewer(segregation, assessments, true)}

                        {this.cv.gdmUuid ?
                            <Panel panelClassName="panel-data">
                                <dl className="dl-horizontal">
                                    <div>
                                        <dt>Assessments</dt>
                                        <dd>
                                            {validAssessments.length ?
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
                                            : <div>None</div>}
                                        </dd>
                                    </div>
                                </dl>
                            </Panel>
                        : null}

                        <AssessmentPanel panelTitle="Segregation Assessment" assessmentTracker={this.cv.assessmentTracker} updateValue={this.updateAssessmentValue}
                            assessmentSubmit={this.assessmentSubmit} disableDefault={othersAssessed} submitBusy={this.state.submitBusy} updateMsg={updateMsg}
                            noSeg={!haveSegregation} ownerNotAssessed={userFamily ? false : !familyUserAssessed} />

                        <Panel title="Family - Variant(s) Segregating with Proband" panelClassName="panel-data">
                            {variants.map(function(variant, i) {
                                return (
                                    <div className="variant-view-panel" key={variant.uuid}>
                                        <h5>Variant {i + 1}</h5>
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
                                    </div>
                                );
                            })}
                        </Panel>

                        <Panel title="Family — Additional Information" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Additional Information about Family</dt>
                                    <dd>{family.additionalInformation}</dd>
                                </div>

                                <dt>Other PMID(s) that report evidence about this same Family</dt>
                                <dd>{family.otherPMIDs && family.otherPMIDs.map(function(article, i) {
                                    return <span key={article.pmid}>{i > 0 ? ', ' : ''}<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span>;
                                })}</dd>
                            </dl>
                        </Panel>
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(FamilyViewer, 'family');


// Display a segregation in a read-only panel. If the assessments can change while the page
// gets dispalyed, pass the dynamic assessments in 'assessments'. If the assessments won't
// change, don't pass anything in assessments -- the assessments in the segregation get
// displayed.
var FamilySegregationViewer = function(segregation, assessments, open) {
    if (!assessments) {
        assessments = segregation.assessments;
    }

    return (
        <Panel title="Family — Segregation" panelClassName="panel-data" open={open}>
            <dl className="dl-horizontal">
                <div>
                    <dt>Pedigree description</dt>
                    <dd>{segregation && segregation.pedigreeDescription}</dd>
                </div>

                <div>
                    <dt>Pedigree size</dt>
                    <dd>{segregation && segregation.pedigreeSize}</dd>
                </div>

                <div>
                    <dt># generations in pedigree</dt>
                    <dd>{segregation && segregation.numberOfGenerationInPedigree}</dd>
                </div>

                <div>
                    <dt>Consanguineous family</dt>
                    <dd>{segregation && segregation.consanguineousFamily === true ? 'Yes' : (segregation.consanguineousFamily === false ? 'No' : '')}</dd>
                </div>

                <div>
                    <dt># cases (phenotype positive)</dt>
                    <dd>{segregation && segregation.numberOfCases}</dd>
                </div>

                <div>
                    <dt>de novo type</dt>
                    <dd>{segregation && segregation.deNovoType}</dd>
                </div>

                <div>
                    <dt># parents who are unaffected carriers</dt>
                    <dd>{segregation && segregation.numberOfParentsUnaffectedCarriers}</dd>
                </div>

                <div>
                    <dt># affected individuals</dt>
                    <dd>{segregation && segregation.numberOfAffectedAlleles}</dd>
                </div>

                <div>
                    <dt># affected with 1 variant</dt>
                    <dd>{segregation && segregation.numberOfAffectedWithOneVariant}</dd>
                </div>

                <div>
                    <dt># affected with 2 different variants or homozygous for 1</dt>
                    <dd>{segregation && segregation.numberOfAffectedWithTwoVariants}</dd>
                </div>

                <div>
                    <dt># unaffected carriers</dt>
                    <dd>{segregation && segregation.numberOfUnaffectedCarriers}</dd>
                </div>

                <div>
                    <dt># unaffected individuals</dt>
                    <dd>{segregation && segregation.numberOfUnaffectedIndividuals}</dd>
                </div>

                <div>
                    <dt>If more than 1 variant, is proband associated with both</dt>
                    <dd>{segregation && segregation.probandAssociatedWithBoth === true ? 'Yes' : (segregation.probandAssociatedWithBoth === false ? 'No' : '')}</dd>
                </div>

                <div>
                    <dt>Additional Segregation information</dt>
                    <dd>{segregation && segregation.additionalInformation}</dd>
                </div>
            </dl>
        </Panel>
    );
};


// Display a history item for adding a family
var FamilyAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var family = history.primary;
        var gdm = history.meta.family.gdm;
        var group = history.meta.family.group;
        var article = history.meta.family.article;

        return (
            <div>
                Family <a href={family['@id']}>{family.label}</a>
                <span> added to </span>
                {group ?
                    <span>group <a href={group['@id']}>{group.label}</a></span>
                :
                    <span>
                        <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                        <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                    </span>
                }
                <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(FamilyAddHistory, 'family', 'add');


// Display a history item for modifying a family
var FamilyModifyHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var family = history.primary;

        return (
            <div>
                Family <a href={family['@id']}>{family.label}</a>
                <span> modified</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(FamilyModifyHistory, 'family', 'modify');


// Display a history item for deleting a family
var FamilyDeleteHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var family = history.primary;

        // Prepare to display a note about associated families and individuals
        // This data can now only be obtained from the history object's hadChildren field
        var collateralObjects = history.hadChildren == 1 ? true : false;

        return (
            <div>
                <span>Family {family.label} deleted</span>
                <span>{collateralObjects ? ' along with any individuals' : ''}</span>
                <span>; {moment(history.last_modified).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(FamilyDeleteHistory, 'family', 'delete');
