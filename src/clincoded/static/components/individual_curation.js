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
var parsePubmed = require('../libs/parse-pubmed').parsePubmed;
var add_external_resource = require('./add_external_resource');
var CuratorHistory = require('./curator_history');

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var ViewRecordHeader = curator.ViewRecordHeader;
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
var external_url_map = globals.external_url_map;
var DeleteButton = curator.DeleteButton;
var AddResourceId = add_external_resource.AddResourceId;

// Will be great to convert to 'const' when available
var MAX_VARIANTS = 2;

// Settings for this.state.varOption
var VAR_NONE = 0; // No variants entered in a panel
var VAR_SPEC = 1; // A specific variant (dbSNP, ClinVar, HGVS) entered in a panel
var VAR_OTHER = 2; // Other description entered in a panel


var IndividualCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            proband_selected: null, // select proband at the form
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // Family object given in query string
            individual: null, // If we're editing an individual, this gets the fleshed-out individual object we're editing
            annotation: null, // Annotation object given in query string
            extraIndividualCount: 0, // Number of extra families to create
            extraIndividualNames: [], // Names of extra families to create
            variantCount: 1, // Number of variants to display
            variantOption: [VAR_NONE], // One variant panel, and nothing entered
            variantInfo: {}, // Extra holding info for variant display
            variantRequired: false, // specifies whether or not variant information is required
            individualName: '', // Currently entered individual name
            addVariantDisabled: true, // True if Add Another Variant button enabled
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            proband: null, // If we have an associated family that has a proband, this points at it
            submitBusy: false, // True while form is submitting
            recessiveZygosity: null, // Determines whether to allow user to add 2nd variant
            evidenceScoreUuid: null
        };
    },

    // Handle value changes in various form fields
    handleChange: function(ref, e) {
        var dbsnpid, clinvarid, hgvsterm, othervariant;

        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
            this.setState({genotyping2Disabled: this.refs[ref].getValue() === 'none'});
        } else if (ref === 'individualname') {
            this.setState({individualName: this.refs[ref].getValue()});
        } else if (ref === 'SEGrecessiveZygosity') {
            // set the variant count and variant required as necessary
            let tempValue = this.refs[ref].getValue();
            if (tempValue === 'Heterozygous') {
                this.setState({variantCount: 2, variantRequired: true});
            } else if (tempValue === 'Homozygous' || tempValue === 'Hemizygous') {
                this.setState({variantCount: 1, variantRequired: true});
            } else {
                this.setState({variantCount: 1, variantRequired: false});
            }
        } else if (ref === 'proband' && this.refs[ref].getValue() === 'Yes') {
            this.setState({proband_selected: true});
        } else if (ref === 'proband') {
            this.setState({proband_selected: false});
        }
    },

    // Handle a click on a copy orphanet button or copy phenotype button
    handleClick: function(obj, item, e) {
        e.preventDefault(); e.stopPropagation();
        var orphanetVal = '';
        var hpoIds = '';

        if (item === 'orphanet') {
            orphanetVal = obj.commonDiagnosis.map(function(disease, i) {
                return ('ORPHA' + disease.orphaNumber);
            }).join(', ');
            this.refs['orphanetid'].setValue(orphanetVal);
            var errors = this.state.formErrors;
            errors['orphanetid'] = '';
            this.setState({formErrors: errors});
        } else if (item === 'phenotype') {
            if (obj.hpoIdInDiagnosis && obj.hpoIdInDiagnosis.length) {
                hpoIds = obj.hpoIdInDiagnosis.map(function(hpoid, i) {
                    return (hpoid);
                }).join(', ');
                this.refs['hpoid'].setValue(hpoIds);
            }
            if (obj.termsInDiagnosis) {
                this.refs['phenoterms'].setValue(obj.termsInDiagnosis);
            }
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var familyUuid = this.queryValues.familyUuid;
        var individualUuid = this.queryValues.individualUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/groups/' + groupUuid : '',
            familyUuid ? '/families/' + familyUuid: '',
            individualUuid ? '/individuals/' + individualUuid: '',
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

                    case 'group':
                        stateObj.group = data;
                        break;

                    case 'family':
                        stateObj.family = data;
                        break;

                    case 'individual':
                        stateObj.individual = data;
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

            // Update the individual name
            if (stateObj.individual) {
                this.setState({individualName: stateObj.individual.label});

                if (stateObj.individual.proband) {
                    // proband individual
                    this.setState({proband_selected: true});
                }
                else {
                    this.setState({proband_selected: false});
                }
                // Get evidenceScore object if exists
                // FIXME: Need to handle an array of scores
                if (stateObj.individual.scores && stateObj.individual.scores.length) {
                    this.setState({evidenceScoreUuid: stateObj.individual.scores[0].uuid});
                }
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            // Also see if we need to disable the Add Variant button
            if (stateObj.individual) {
                stateObj.genotyping2Disabled = !(stateObj.individual.method && stateObj.individual.method.genotypingMethods && stateObj.individual.method.genotypingMethods.length);

                // If this individual has variants and isn't the proband in a family, handle the variant panels.
                if (stateObj.individual.variants && stateObj.individual.variants.length && !(stateObj.individual.proband && stateObj.family)) {
                    var variants = stateObj.individual.variants;
                    // This individual has variants
                    stateObj.variantCount = variants.length ? variants.length : 1;
                    stateObj.variantRequired = stateObj.individual.recessiveZygosity ? true : false;
                    stateObj.addVariantDisabled = false;
                    stateObj.variantInfo = {};

                    // Go through each variant to determine how its form fields should be disabled.
                    var currVariantOption = [];
                    for (var i = 0; i < variants.length; i++) {
                        if (variants[i].clinvarVariantId) {
                            currVariantOption[i] = VAR_SPEC;
                            stateObj.variantInfo[i] = {
                                'clinvarVariantId': variants[i].clinvarVariantId ? variants[i].clinvarVariantId : null,
                                'clinvarVariantTitle': variants[i].clinvarVariantTitle ? variants[i].clinvarVariantTitle : null,
                                'carId': variants[i].carId ? variants[i].carId : null,
                                'uuid': variants[i].uuid
                            };
                        } else if (variants[i].otherDescription) {
                            currVariantOption[i] = VAR_OTHER;
                        } else {
                            currVariantOption[i] = VAR_NONE;
                        }
                    }
                    stateObj.variantOption = currVariantOption;
                }
            }

            // If we didn't get a family in the query string, see if we're editing an individual, and it has associated
            // families. If it does, get the first (really the only) one.
            if (!stateObj.family && stateObj.individual && stateObj.individual.associatedFamilies && stateObj.individual.associatedFamilies.length) {
                stateObj.family = stateObj.individual.associatedFamilies[0];
            }

            // If we have a family, see if it has a proband
            if (stateObj.family && stateObj.family.individualIncluded && stateObj.family.individualIncluded.length) {
                var proband = _(stateObj.family.individualIncluded).find(function(individual) {
                    return individual.proband;
                });
                if (proband) {
                    stateObj.proband = proband;
                }
            }

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No annotation; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // Called when user changes the number of copies of family
    extraIndividualCountChanged: function(ref, e) {
        this.setState({extraIndividualCount: e.target.value});
    },

    // Write a family object to the DB.
    writeIndividualObj: function(newIndividual, individualLabel) {
        var methodPromise; // Promise from writing (POST/PUT) a method to the DB

        // Get a new family object ready for writing. Modify a copy of it instead
        // of the one we were given.
        var writerIndividual = _.clone(newIndividual);
        if (individualLabel) {
            writerIndividual.label = individualLabel;
        }

        // If a method and/or segregation object was created (at least one method/segregation field set), assign it to the individual.
        // If writing multiple family objects, reuse the one we made, but assign new methods and segregations because each family
        // needs unique objects here.
        var newMethod = methods.create.call(this);
        if (newMethod) {
            writerIndividual.method = newMethod;
        }

        // Either update or create the individual object in the DB
        if (this.state.individual) {
            // We're editing a family. PUT the new family object to the DB to update the existing one.
            return this.putRestData('/individuals/' + this.state.individual.uuid, writerIndividual).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        } else {
            // We created a family; post it to the DB
            return this.postRestData('/individuals/', writerIndividual).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }
    },

    // Called when a form is submitted.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var family = this.state.family;
            var currIndividual = this.state.individual;
            var newIndividual = {}; // Holds the new group object;
            var individualDiseases = null, individualArticles, individualVariants = [];
            var individualScores = []; // FIXME: Need to be able to handle array of scores
            var formError = false;

            // Parse the comma-separated list of Orphanet IDs
            var orphaIds = curator.capture.orphas(this.getFormValue('orphanetid'));
            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));
            let SEGrecessiveZygosity = this.getFormValue('SEGrecessiveZygosity');
            let variantId0 = this.getFormValue('VARclinvarid0'),
                variantId1 = this.getFormValue('VARclinvarid1'),
                variantText0 = this.getFormValue('VARothervariant0'),
                variantText1 = this.getFormValue('VARothervariant1');

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (this.state.proband_selected && (!orphaIds || !orphaIds.length || _(orphaIds).any(function(id) { return id === null; }))) {
                // ORPHA is not required for non-proband individual
                // ORPHA list is bad
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
            } else if (!this.state.proband_selected && (orphaIds && orphaIds.length && _(orphaIds).any(function(id) { return id === null; }))) {
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
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

            // Get variant uuid's if they were added via the modals
            for (var i = 0; i < this.state.variantCount; i++) {
                // Grab the values from the variant form panel
                var variantId = this.getFormValue('VARclinvarid' + i);

                // Build the search string depending on what the user entered
                if (variantId) {
                    // Make a search string for these terms
                    individualVariants.push('/variants/' + variantId);
                }
            }

            // Check to see if the right number of variants exist
            if (SEGrecessiveZygosity === 'Heterozygous') {
                if ((!variantId0 && !variantText0) || (!variantId1 && !variantText1)) {
                    formError = true;
                    this.setFormErrors('SEGrecessiveZygosity', 'For Heterozygous, two variants must be specified');
                }
            } else if (SEGrecessiveZygosity === 'Hemizygous' || SEGrecessiveZygosity === 'Homozygous') {
                if (!variantId0 && !variantText0) {
                    formError = true;
                    this.setFormErrors('SEGrecessiveZygosity', `For ${SEGrecessiveZygosity}, one variant must be specified`);
                }
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
                            individualDiseases = diseases;
                            return Promise.resolve(diseases);
                        } else {
                            // Get array of missing Orphanet IDs
                            this.setState({submitBusy: false}); // submit error; re-enable submit button
                            var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                            this.setFormErrors('orphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                            throw diseases;
                        }
                    } else {
                        // for no Orphanet id entered
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setFormErrors('orphanetid', 'The given diseases not found');
                    throw e;
                }).then(diseases => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids && pmids.length) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all PMIDs, so just set individualArticles and return
                                individualArticles = articles;
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
                                            individualArticles = articles;
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
                    var newVariants = [];
                    if (currIndividual && currIndividual.proband && family) {
                        // Editing a proband in a family. Get updated variants list from the target individual since it is changed from the Family edit page
                        return this.getRestData('/individuals/' + currIndividual.uuid).then(updatedIndiv => {
                            newVariants = updatedIndiv.variants.map(function(variant) { return '/variants/' + variant.uuid + '/'; });
                            return Promise.resolve(newVariants);
                        });
                    }

                    // No variant search strings. Go to next THEN.
                    return Promise.resolve([]);
                }).then(newVariants => {
                    // We're passed in a list of new clinVarRCV variant objects that need to be written to the DB.
                    // Now see if we need to add 'Other description' data. Search for any variants in the form with that field filled.
                    if (!currIndividual || !(currIndividual.proband && family)) {
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
                                        individualVariants.push(result['@graph'][0]['@id']);
                                    });
                                }
                                return Promise.resolve(results);
                            });
                        }
                    } else if (currIndividual && currIndividual.proband && family) {
                        individualVariants = newVariants;
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(null);
                }).then(response => {
                    /*****************************************************/
                    /* Proband score status data object                  */
                    /*****************************************************/
                    let newScoreStatusObj = {};
                    let scoreStatus = this.getFormValue('scoreStatus') && this.getFormValue('scoreStatus') !== 'none' ? this.getFormValue('scoreStatus') : null;
                    if (scoreStatus) {
                        newScoreStatusObj = {
                            scoreStatus: scoreStatus,
                            evidenceType: 'Individual'
                        };
                        /*************************************************************/
                        /* Either update or create the score status object in the DB */
                        /*************************************************************/
                        if (this.state.evidenceScoreUuid) {
                            return this.putRestData('/evidencescore/' + this.state.evidenceScoreUuid, newScoreStatusObj).then(modifiedScoreObj => {
                                // FIXME: Need to be able to handle array of scores
                                if (modifiedScoreObj) {
                                    individualScores.push(modifiedScoreObj['@graph'][0]['@id']);
                                }
                                return Promise.resolve(individualScores);
                            });
                        } else {
                            return this.postRestData('/evidencescore/', newScoreStatusObj).then(newScoreObject => {
                                if (newScoreObject) {
                                    individualScores.push(newScoreObject['@graph'][0]['@id']);
                                }
                                return Promise.resolve(individualScores);
                            });
                        }
                    } else {
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Make a new individual object based on form fields.
                    var newIndividual = this.createIndividual(individualDiseases, individualArticles, individualVariants, individualScores, hpoids, nothpoids);
                    return this.writeIndividualObj(newIndividual);
                }).then(newIndividual => {
                    var promise;

                    // If we're adding this individual to a group, update the group with this family; otherwise update the annotation
                    // with the family.
                    if (!this.state.individual) {
                        if (this.state.group) {
                            // Add the newly saved individual to a group
                            promise = this.getRestData('/groups/' + this.state.group.uuid, null, true).then(freshGroup => {
                                var group = curator.flatten(freshGroup);
                                if (!group.individualIncluded) {
                                    group.individualIncluded = [];
                                }
                                group.individualIncluded.push(newIndividual['@id']);

                                // Post the modified group to the DB
                                return this.putRestData('/groups/' + this.state.group.uuid, group).then(data => {
                                    return {individual: newIndividual, group: data['@graph'][0], modified: false};
                                });
                            });
                        } else if (this.state.family) {
                            // Add the newly saved individual to a family
                            promise = this.getRestData('/families/' + this.state.family.uuid, null, true).then(freshFamily => {
                                var family = curator.flatten(freshFamily);
                                if (!family.individualIncluded) {
                                    family.individualIncluded = [];
                                }
                                family.individualIncluded.push(newIndividual['@id']);

                                // Post the modified family to the DB
                                return this.putRestData('/families/' + this.state.family.uuid, family).then(data => {
                                    return {individual: newIndividual, family: data['@graph'][0], modified: false};
                                });
                            });
                        } else {
                            // Not part of a group or family, so add the individual to the annotation instead.
                            promise = this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                                // Get a flattened copy of the fresh annotation object and put our new individual into it,
                                // ready for writing.
                                var annotation = curator.flatten(freshAnnotation);
                                if (!annotation.individuals) {
                                    annotation.individuals = [];
                                }
                                annotation.individuals.push(newIndividual['@id']);

                                // Post the modified annotation to the DB
                                return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(data => {
                                    return {individual: newIndividual, annotation: data['@graph'][0], modified: false};
                                });
                            });
                        }
                    } else {
                        // Editing an individual; not creating one
                        promise = Promise.resolve({individual: newIndividual, modified: true});
                    }
                    return promise;
                }).then(data => {
                    // Add to the user history. data.individual always contains the new or edited individual. data.group contains the group the individual was
                    // added to, if it was added to a group. data.annotation contains the annotation the individual was added to, if it was added to
                    // the annotation, and data.family contains the family the individual was added to, if it was added to a family. If none of data.group,
                    // data.family, nor data.annotation exist, data.individual holds the existing individual that was modified.
                    recordIndividualHistory(this.state.gdm, this.state.annotation, data.individual, data.group, data.family, data.modified, this);

                    // Navigate to Curation Central or Family Submit page, depending on previous page
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        var submitLink = '/individual-submit/?gdm=' + this.state.gdm.uuid + '&evidence=' + this.state.annotation.uuid + '&individual=' + data.individual.uuid;
                        if (this.state.family) {
                            submitLink += '&family=' + this.state.family.uuid;
                        } else if (this.state.group) {
                            submitLink += '&group=' + this.state.group.uuid;
                        }
                        this.context.navigate(submitLink);
                    }

                }).catch(function(e) {
                    console.log('INDIVIDUAL CREATION ERROR=: %o', e);
                });
            }
        }
    },

    // Create a family object to be written to the database. Most values come from the values
    // in the form. The created object is returned from the function.
    createIndividual: function(individualDiseases, individualArticles, individualVariants, individualScores, hpoids, nothpoids) {
        var value;
        var currIndividual = this.state.individual;
        var family = this.state.family;

        // Make a new family. If we're editing the form, first copy the old family
        // to make sure we have everything not from the form.
        var newIndividual = this.state.individual ? curator.flatten(this.state.individual) : {};
        newIndividual.label = this.getFormValue('individualname');

        // Get an array of all given disease IDs
        if (individualDiseases) {
            newIndividual.diagnosis = individualDiseases['@graph'].map(function(disease) { return disease['@id']; });
        }
        else if (newIndividual.diagnosis && newIndividual.diagnosis.length > 0) {
            delete newIndividual.diagnosis;
        }

        // Fill in the individual fields from the Diseases & Phenotypes panel
        if (hpoids && hpoids.length) {
            newIndividual.hpoIdInDiagnosis = hpoids;
        } else if (newIndividual.hpoIdInDiagnosis && newIndividual.hpoIdInDiagnosis.length) {
            delete newIndividual.hpoIdInDiagnosis;
        }
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newIndividual.termsInDiagnosis = phenoterms;
        } else if (newIndividual.termsInDiagnosis) {
            delete newIndividual.termsInDiagnosis;
        }
        if (nothpoids && nothpoids.length) {
            newIndividual.hpoIdInElimination = nothpoids;
        }
        phenoterms = this.getFormValue('notphenoterms');
        if (phenoterms) {
            newIndividual.termsInElimination = phenoterms;
        }

        // Fill in the individual fields from the Demographics panel
        value = this.getFormValue('sex');
        if (value !== 'none') { newIndividual.sex = value; }

        value = this.getFormValue('country');
        if (value !== 'none') { newIndividual.countryOfOrigin = value; }

        value = this.getFormValue('ethnicity');
        if (value !== 'none') { newIndividual.ethnicity = value; }

        value = this.getFormValue('race');
        if (value !== 'none') { newIndividual.race = value; }

        value = this.getFormValue('agetype');
        if (value !== 'none') { newIndividual.ageType = value; }

        value = this.getFormValueNumber('agevalue');
        if (value) { newIndividual.ageValue = value; }

        value = this.getFormValue('ageunit');
        if (value !== 'none') { newIndividual.ageUnit = value; }

        // Fill in the individual fields from the Additional panel
        value = this.getFormValue('additionalinfoindividual');
        if (value) { newIndividual.additionalInformation = value; }

        if (individualArticles) {
            newIndividual.otherPMIDs = individualArticles['@graph'].map(function(article) { return article['@id']; });
        }

        if (individualVariants) {
            newIndividual.variants = individualVariants;
        }

        if (individualScores) {
            newIndividual.scores = individualScores;
        }

        // Set the proband boolean
        value = this.getFormValue('proband');
        if (value && value !== 'none') { newIndividual.proband = value === "Yes"; }

        /*************************************************/
        /* Individual variant form fields.               */
        /* Only applicable when individual is associated */
        /* with a family and 1 or more variants          */
        /*************************************************/
        if (individualVariants) {
            value = this.getFormValue('SEGrecessiveZygosity');
            if (value && value !== 'none') {
                newIndividual.recessiveZygosity = value;
            } else {
                if (newIndividual && newIndividual.recessiveZygosity) {
                    delete newIndividual['recessiveZygosity'];
                }
            }

            value = this.getFormValue('individualBothVariantsInTrans');
            if (value && value !== 'none') {
                newIndividual.bothVariantsInTrans = value;
            } else {
                if (newIndividual && newIndividual.bothVariantsInTrans) {
                    delete newIndividual['bothVariantsInTrans'];
                }
            }

            value = this.getFormValue('individualDeNovo');
            if (value && value !== 'none') {
                newIndividual.denovo = value;
            } else {
                if (newIndividual && newIndividual.denovo) {
                    delete newIndividual['denovo'];
                }
            }

            value = this.getFormValue('individualMaternityPaternityConfirmed');
            if (value && value !== 'none') {
                newIndividual.maternityPaternityConfirmed = value;
            } else {
                if (newIndividual && newIndividual.maternityPaternityConfirmed) {
                    delete newIndividual['maternityPaternityConfirmed'];
                }
            }
        }

        return newIndividual;
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
            this.refs['VARclinvarid' + fieldNum].setValue(data['uuid']);
            newVariantInfo[fieldNum] = {
                'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
                'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
                'carId': data.carId ? data.carId : null
            };
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
        // Set state
        this.setState({variantInfo: newVariantInfo, variantOption: currVariantOption, addVariantDisabled: addVariantDisabled});
        this.clrFormErrors('SEGrecessiveZygosity');
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

    render: function() {
        var gdm = this.state.gdm;
        var individual = this.state.individual;
        var annotation = this.state.annotation;
        var pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        var method = (individual && individual.method && Object.keys(individual.method).length) ? individual.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
        var variantTitle = (individual && individual.proband) ? <h4>Individual<i className="icon icon-proband-white"></i>  – Variant(s) segregating with Proband</h4> : <h4>Individual — Associated Variant(s)</h4>;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get a list of associated groups if editing an individual, or the group in the query string if there was one, or null.
        var groups = (individual && individual.associatedGroups) ? individual.associatedGroups :
            (this.state.group ? [this.state.group] : null);

        // Get a list of associated families if editing an individual, or the family in the query string if there was one, or null.
        var families = (individual && individual.associatedFamilies) ? individual.associatedFamilies :
            (this.state.family ? [this.state.family] : null);

        // Figure out the family and group page titles
        var familyTitles = [];
        var groupTitles = [];
        if (individual) {
            // Editing an individual. get associated family titles, and associated group titles
            groupTitles = groups.map(function(group) { return {'label': group.label, '@id': group['@id']}; });
            familyTitles = families.map(function(family) {
                // If this family has associated groups, add their titles to groupTitles.
                if (family.associatedGroups && family.associatedGroups.length) {
                    groupTitles = groupTitles.concat(family.associatedGroups.map(function(group) { return {'label': group.label, '@id': group['@id']}; }));
                }
                return {'label': family.label, '@id': family['@id']};
            });
        } else {
            // Curating an individual.
            if (families) {
                // Given a family in the query string. Get title from first (only) family.
                familyTitles[0] = {'label': families[0].label, '@id': families[0]['@id']};

                // If the given family has associated groups, add those to group titles
                if (families[0].associatedGroups && families[0].associatedGroups.length) {
                    groupTitles = families[0].associatedGroups.map(function(group) {
                        return {'label': group.label, '@id': group['@id']};
                    });
                }
            } else if (groups) {
                // Given a group in the query string. Get title from first (only) group.
                groupTitles[0] = {'label': groups[0].label, '@id': groups[0]['@id']};
            }
        }

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.individualUuid = queryKeyValue('individual', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.individualUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/individual-submit/?gdm=' + gdm.uuid + (individual ? '&individual=' + individual.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        return (
            <div>
                {(!this.queryValues.individualUuid || individual) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{individual ? 'Edit' : 'Curate'} Individual Information</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    {groupTitles.length ?
                                        <span> &#x2F;&#x2F; Group {groupTitles.map(function(group, i) { return <span key={group['@id']}>{i > 0 ? ', ' : ''}<a href={group['@id']}>{group.label}</a></span>; })}</span>
                                    : null}
                                    {familyTitles.length ?
                                        <span> &#x2F;&#x2F; Family {familyTitles.map(function(family, i) { return <span key={family['@id']}>{i > 0 ? ', ' : ''}<a href={family['@id']}>{family.label}</a></span>; })}</span>
                                    : null}
                                    <span> &#x2F;&#x2F; {this.state.individualName ? <span>Individual {this.state.individualName}{probandLabel}</span> : <span className="no-entry">No entry</span>}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {IndividualName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title={<LabelPanelTitle individual={individual} labelText="Disease & Phenotype(s)" />} open>
                                                {IndividualCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={<LabelPanelTitle individual={individual} labelText="Demographics" />} open>
                                                {IndividualDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={<LabelPanelTitle individual={individual} labelText="Methods" />} open>
                                                {methods.render.call(this, method)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={variantTitle} open>
                                                {IndividualVariantInfo.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={<LabelPanelTitle individual={individual} labelText="Additional Information" />} open>
                                                {IndividualAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        {(this.state.family && this.state.proband_selected) || (!this.state.family && this.state.proband_selected) ?
                                            <PanelGroup accordion>
                                                <Panel title={<LabelPanelTitle individual={individual} labelText="Score Proband" />} open>
                                                    {IndividualScore.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                        : null}
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {individual ?
                                                <DeleteButton gdm={gdm} parent={families.length > 0 ? families[0] : (groups.length > 0 ? groups[0] : annotation)} item={individual} pmid={pmid} />
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

globals.curator_page.register(IndividualCuration, 'curator_page', 'individual-curation');

// HTML labels for inputs follow.
var LabelPanelTitle = React.createClass({
    render: function() {
        var individual = this.props.individual;
        var probandLabelWhite = <span>{individual && individual.proband ? <i className="icon icon-proband-white"></i> : null}</span>;

        return <h4>Individual{probandLabelWhite} — {this.props.labelText}</h4>;
    }
});


// Individual Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualName = function(displayNote) {
    var individual = this.state.individual;
    var family = this.state.family;
    var familyProbandExists = false;
    var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
    if (individual && individual.proband) familyProbandExists = individual.proband;
    if (family && family.individualIncluded && family.individualIncluded.length && family.individualIncluded.length > 0) {
        for (var i = 0; i < family.individualIncluded.length; i++) {
            if (family.individualIncluded[i].proband === true) familyProbandExists = true;
        }
    }

    return (
        <div className="row">
            {family && !familyProbandExists ?
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-warning">
                    This page is only for adding non-probands to the Family. To create a proband for this Family, please edit its Family page: <a href={"/family-curation/?editsc&gdm=" + this.queryValues.gdmUuid + "&evidence=" + this.queryValues.annotationUuid + "&family=" + family.uuid}>Edit {family.label}</a>
                </p>
            </div>
            : null}
            {!this.getAssociation('individual') && !this.getAssociation('associatedFamilies') && !this.getAssociation('associatedGroups') ?
                <div className="col-sm-7 col-sm-offset-5"><p className="alert alert-warning">If this Individual is part of a Family or a Group, please curate that Group or Family first and then add the Individual as a member.</p></div>
            : null}
            <Input type="text" ref="individualname" label={<LabelIndividualName probandLabel={probandLabel} />} value={individual && individual.label} handleChange={this.handleChange}
                error={this.getFormError('individualname')} clearError={this.clrFormErrors.bind(null, 'individualname')} maxLength="60"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">Note: Do not enter real names in this field. {curator.renderLabelNote('Individual')}</p>
            {displayNote ?
                <p className="col-sm-7 col-sm-offset-5">Note: If there is more than one individual with IDENTICAL information, you can indicate this at the bottom of this form.</p>
            : null}
            {!family ?
                <div>
                    <Input type="select" ref="proband" label="Is this Individual a proband:" value={individual && individual.proband ? "Yes" : (individual ? "No" : "none")}
                        error={this.getFormError('proband')} clearError={this.clrFormErrors.bind(null, 'proband')} handleChange={this.handleChange}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <p className="col-sm-7 col-sm-offset-5 input-note-below">
                        Note: Probands are indicated by the following icon: <i className="icon icon-proband"></i>
                    </p>
                </div>
            : null}
        </div>
    );
};

// HTML labels for inputs follow.
var LabelIndividualName = React.createClass({
    render: function() {
        return <span>{this.props.probandLabel}Individual Label:</span>;
    }
});


// If the individual is being edited (we know this because there was an individual
// UUID in the query string), then don’t present the ability to specify multiple individuals.
var IndividualCount = function() {
    var individual = this.state.individual;

    return (
        <div>
            <p className="col-sm-7 col-sm-offset-5">
                If more than one individual has exactly the same information entered above and is associated with the same variants, you can specify how many extra copies of this
                individual to make with this drop-down menu to indicate how many <em>extra</em> copies of this individual to make when you submit this form, and specify the names
                of each extra individual below that.
            </p>
            <Input type="select" ref="extraindividualcount" label="Number of extra identical Individuals to make:" defaultValue="0" handleChange={this.extraIndividualCountChanged}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                {_.range(11).map(function(count) { return <option key={count}>{count}</option>; })}
            </Input>
            {_.range(this.state.extraIndividualCount).map(i => {
                return (
                    <Input key={i} type="text" ref={'extraindividualname' + i} label={'Individual Label ' + (i + 2)}
                        error={this.getFormError('extraindividualname' + i)} clearError={this.clrFormErrors.bind(null, 'extraindividualname' + i)}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                );
            })}
        </div>
    );
};


// Diseases individual curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualCommonDiseases = function() {
    var individual = this.state.individual;
    var family = this.state.family;
    var group = this.state.group;
    var orphanetidVal, hpoidVal, nothpoidVal, associatedGroups, associatedFamilies;
    var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

    // If we're editing an individual, make editable values of the complex properties
    if (individual) {
        orphanetidVal = individual.diagnosis ? individual.diagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join(', ') : null;
        hpoidVal = individual.hpoIdInDiagnosis ? individual.hpoIdInDiagnosis.join(', ') : null;
        nothpoidVal = individual.hpoIdInElimination ? individual.hpoIdInElimination.join(', ') : null;
    }

    // Make a list of diseases from the group, either from the given group,
    // or the individual if we're editing one that has associated groups.
    if (group) {
        // We have a group, so get the disease array from it.
        associatedGroups = [group];
    } else if (individual && individual.associatedGroups && individual.associatedGroups.length) {
        // We have an individual with associated groups. Combine the diseases from all groups.
        associatedGroups = individual.associatedGroups;
    }

    // Make a list of diseases from the family, either from the given family,
    // or the individual if we're editing one that has associated families.
    if (family) {
        // We have a group, so get the disease array from it.
        associatedFamilies = [family];
    } else if (individual && individual.associatedFamilies && individual.associatedFamilies.length) {
        // We have an individual with associated groups. Combine the diseases from all groups.
        associatedFamilies = individual.associatedFamilies;
    }

    return (
        <div className="row">
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ? curator.renderOrphanets(associatedGroups, 'Group') : null}
            {associatedFamilies && associatedFamilies[0].commonDiagnosis && associatedFamilies[0].commonDiagnosis.length > 0 ? curator.renderOrphanets(associatedFamilies, 'Family') : null}
            { this.state.proband_selected ?
                <Input type="text" ref="orphanetid" label={<LabelOrphanetId probandLabel={probandLabel} />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                :
                <Input type="text" ref="orphanetid" label={<LabelOrphanetId probandLabel={probandLabel} />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            }
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ?
            <Input type="button" ref="orphanetcopy" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Orphanet IDs from Associated Group"
                clickHandler={this.handleClick.bind(this, associatedGroups[0], 'orphanet')} />
            : null}
            {associatedFamilies && associatedFamilies[0].commonDiagnosis && associatedFamilies[0].commonDiagnosis.length > 0 ?
            <Input type="button" ref="orphanetcopy" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Orphanet IDs from Associated Family"
                clickHandler={this.handleClick.bind(this, associatedFamilies[0], 'orphanet')} />
            : null}
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'hpo')
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'hpo') : curator.renderPhenotype(null, 'Individual', 'hpo')
                )
            }
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'ft')
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'ft') : curator.renderPhenotype(null, 'Individual', 'ft')
                )
            }
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={individual && individual.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
            <Input type="button" ref="phenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Phenotype from Associated Group"
                clickHandler={this.handleClick.bind(this, associatedGroups[0], 'phenotype')} />
            : null
            }
            {associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
            <Input type="button" ref="phenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-default btn-last btn-sm" title="Copy Phenotype from Associated Family"
                clickHandler={this.handleClick.bind(this, associatedFamilies[0], 'phenotype')} />
            : null
            }
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Individual</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={individual && individual.termsInElimination}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span><a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet home page in a new tab">Orphanet</a> Disease for Individual{this.props.probandLabel}:</span>;
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
                {this.props.not ? <span className="emphasis">NOT </span> : ''}
                Phenotype(s) <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
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
                {this.props.not ? <span className="emphasis">NOT </span> : ''}
                Phenotype(s) (<span className="normal">free text</span>):
            </span>
        );
    }
});

// Demographics individual curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualDemographics = function() {
    var individual = this.state.individual;

    return (
        <div className="row">
            <Input type="select" ref="sex" label="Sex:" defaultValue="none" value={individual && individual.sex}
                error={this.getFormError('sex')} clearError={this.clrFormErrors.bind(null, 'sex')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Intersex">Intersex</option>
                <option value="MTF/Transwoman/Transgender Female">MTF/Transwoman/Transgender Female</option>
                <option value="FTM/Transman/Transgender Male">FTM/Transman/Transgender Male</option>
                <option value="Ambiguous">Ambiguous</option>
                <option value="Unknown">Unknown</option>
                <option value="Other">Other</option>
            </Input>
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={individual && individual.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={individual && individual.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={individual && individual.race}
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
            <h4 className="col-sm-7 col-sm-offset-5">Age</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agetype" label="Type:" defaultValue="none" value={individual && individual.ageType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="number" ref="agevalue" label="Value:" value={individual && individual.ageValue} maxVal={150}
                    error={this.getFormError('agevalue')} clearError={this.clrFormErrors.bind(null, 'agevalue')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={individual && individual.ageUnit}
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


// Only called if we have an associated family
var IndividualVariantInfo = function() {
    var individual = this.state.individual;
    var family = this.state.family;
    var gdm = this.state.gdm;
    var annotation = this.state.annotation;
    var variants = individual && individual.variants;
    let gdmUuid = gdm && gdm.uuid ? gdm.uuid : null;
    let pmidUuid = annotation && annotation.article.pmid ? annotation.article.pmid : null;
    let userUuid = gdm && gdm.submitted_by.uuid ? gdm.submitted_by.uuid : null;

    return (
        <div className="row">
            {individual && individual.proband && family ?
                <div>
                    {variants.map(function(variant, i) {
                        return (
                            <div key={i} className="variant-view-panel variant-view-panel-edit">
                                <p>Variant(s) for a proband associated with a Family can only be edited through the Family page: <a href={"/family-curation/?editsc&gdm=" + gdm.uuid + "&evidence=" + annotation.uuid + "&family=" + family.uuid}>Edit {family.label}</a></p>
                                <h5>Variant {i + 1}</h5>
                                <dl className="dl-horizontal">
                                    <div>
                                        <dt>ClinVar VariationID</dt>
                                        <dd><a href={external_url_map['ClinVarSearch'] + variant.clinvarVariantId} target="_blank">{variant.clinvarVariantId}</a></dd>
                                    </div>

                                    <div>
                                        <dt>ClinVar Preferred Title</dt>
                                        <dd>{variant.clinvarVariantTitle}</dd>
                                    </div>

                                    {variant.otherDescription && variant.otherDescription.length ?
                                        <div>
                                            <dt>Other description</dt>
                                            <dd>{variant.otherDescription}</dd>
                                        </div>
                                    : null}

                                    {individual.recessiveZygosity && i === 0 ?
                                        <div>
                                            <dt>If Recessive, select variant zygosity</dt>
                                            <dd>{individual.recessiveZygosity}</dd>
                                        </div>
                                    : null }
                                </dl>
                            </div>
                        );
                    })}
                    {variants && variants.length ?
                        <div  className="variant-panel">
                            <Input type="select" ref="individualBothVariantsInTrans" label={<span>If there are 2 variants described, are they both located in <i>trans</i> with respect to one another?</span>}
                                defaultValue="none" value={individual && individual.bothVariantsInTrans ? individual.bothVariantsInTrans : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Not Specified">Not Specified</option>
                            </Input>
                            <Input type="select" ref="individualDeNovo" label={<span>If the individuals has one variant, is it <i>de novo</i><br/>OR<br/>If the individual has 2 variants, is at least one <i>de novo</i>?</span>}
                                defaultValue="none" value={individual && individual.denovo ? individual.denovo : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                            <Input type="select" ref="individualMaternityPaternityConfirmed" label={<span>If the answer to the above question is yes, is the variant maternity and paternity confirmed?</span>}
                                defaultValue="none" value={individual && individual.maternityPaternityConfirmed ? individual.maternityPaternityConfirmed : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                        </div>
                    : null}
                </div>
            :
                <div>
                    <Input type="select" ref="SEGrecessiveZygosity" label="If Recessive, select variant zygosity:" defaultValue="none"
                        error={this.getFormError('SEGrecessiveZygosity')} clearError={this.clrFormErrors.bind(null, 'SEGrecessiveZygosity')}
                        value={individual && individual.recessiveZygosity ? individual.recessiveZygosity : 'none'} handleChange={this.handleChange}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Homozygous">Homozygous</option>
                        <option value="Hemizygous">Hemizygous</option>
                        <option value="Heterozygous">Heterozygous</option>
                    </Input>
                    {_.range(this.state.variantCount).map(i => {
                        var variant;

                        if (variants && variants.length) {
                            variant = variants[i];
                        }

                        return (
                            <div key={i} className="variant-panel">
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
                                                <span className="col-sm-5 control-label"><label>CAR ID:</label></span>
                                                <span className="col-sm-7 text-no-input">{this.state.variantInfo[i].carId}</span>
                                            </div>
                                        : null}
                                        <div className="row variant-assessment">
                                            <span className="col-sm-5 control-label"><label></label></span>
                                            <span className="col-sm-7 text-no-input">
                                                <a href={'/variant-curation/?all&gdm=' + gdmUuid + '&pmid=' + pmidUuid + '&variant=' + this.state.variantInfo[i].uuid + '&user=' + userUuid} target="_blank">Curate variant's gene impact <i className="icon icon-external-link"></i></a>
                                            </span>
                                        </div>
                                        <div className="row variant-curation">
                                            <span className="col-sm-5 control-label"><label></label></span>
                                            <span className="col-sm-7 text-no-input">
                                                <a href={'/variant-central/?variant=' + this.state.variantInfo[i].uuid} target="_blank">View variant evidence in Variant Curation Interface <i className="icon icon-external-link"></i></a>
                                            </span>
                                        </div>
                                    </div>
                                : null}
                                <Input type="text" ref={'VARclinvarid' + i} value={variant && variant.uuid} handleChange={this.handleChange}
                                    error={this.getFormError('VARclinvarid' + i)} clearError={this.clrFormErrors.bind(null, 'VARclinvarid' + i)}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" />
                                <br />

                                <div className="row">
                                    <div className="form-group">
                                        <span className="col-sm-5 control-label">{!this.state.variantInfo[i] ? <label>Add Variant:{this.state.variantRequired ? ' *' : null}</label> : <label>Clear Variant Selection:</label>}</span>
                                        <span className="col-sm-7">
                                            <AddResourceId resourceType="clinvar" parentObj={{'@type': ['variantList', 'Individual'], 'variantList': this.state.variantInfo}}
                                                buttonText="Add ClinVar ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                                initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId} fieldNum={String(i)}
                                                updateParentForm={this.updateClinvarVariantId} disabled={this.state.variantOption[i] === VAR_OTHER} buttonOnly={true} />
                                            {!this.state.variantInfo[i] ? <span> - or - </span> : null}
                                            {!this.state.variantInfo[i] ?
                                                <AddResourceId resourceType="car" parentObj={{'@type': ['variantList', 'Individual'], 'variantList': this.state.variantInfo}}
                                                    buttonText="Add CAR ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                                    initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId} fieldNum={String(i)}
                                                    updateParentForm={this.updateClinvarVariantId} disabled={this.state.variantOption[i] === VAR_OTHER} buttonOnly={true} />
                                            : null}
                                        </span>
                                    </div>
                                </div>
                                <Input type="textarea" ref={'VARothervariant' + i} label={<LabelOtherVariant />} rows="5" value={variant && variant.otherDescription} handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_SPEC}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                {curator.renderMutalyzerLink()}
                            </div>
                        );
                    })}
                    {Object.keys(this.state.variantInfo).length > 0 ?
                        <div  className="variant-panel">
                            <Input type="select" ref="individualBothVariantsInTrans" label={<span>If there are 2 variants described, are they both located in <i>trans</i> with respect to one another?</span>}
                                defaultValue="none" value={individual && individual.bothVariantsInTrans ? individual.bothVariantsInTrans : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Not Specified">Not Specified</option>
                            </Input>
                            <Input type="select" ref="individualDeNovo" label={<span>If the individuals has one variant, is it <i>de novo</i><br/>OR<br/>If the individual has 2 variants, is at least one <i>de novo</i>?</span>}
                                defaultValue="none" value={individual && individual.denovo ? individual.denovo : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                            <Input type="select" ref="individualMaternityPaternityConfirmed" label={<span>If the answer to the above question is yes, is the variant maternity and paternity confirmed?</span>}
                                defaultValue="none" value={individual && individual.maternityPaternityConfirmed ? individual.maternityPaternityConfirmed : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                        </div>
                    : null}
                </div>
            }
        </div>
    );
};


var LabelClinVarVariant = React.createClass({
    render: function() {
        return <span><strong><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> VariationID:{this.props.variantRequired ? ' *' : null}</strong></span>;
    }
});

var LabelClinVarVariantTitle = React.createClass({
    render: function() {
        return <span><strong><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Preferred Title:</strong></span>;
    }
});

var LabelOtherVariant = React.createClass({
    render: function() {
        return <span>Other description when a ClinVar VariationID does not exist <span className="normal">(important: use CA ID registered with <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry <i className="icon icon-external-link"></i></a> whenever possible)</span>:</span>;
    }
});


// Additional Information family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualAdditional = function() {
    var otherpmidsVal;
    var individual = this.state.individual;
    var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

    // If editing an individual, get its existing articles
    if (individual) {
        otherpmidsVal = individual.otherPMIDs ? individual.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : null;
    }

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfoindividual" label={<LabelAdditional probandLabel={probandLabel} />} rows="5" value={individual && individual.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label={<LabelOtherPmids probandLabel={probandLabel} />} rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
var LabelAdditional = React.createClass({
    render: function() {
        return <span>Additional Information about Individual{this.props.probandLabel}:</span>;
    }
});

var LabelOtherPmids = React.createClass({
    render: function() {
        return <span>Enter PMID(s) that report evidence about this Individual{this.props.probandLabel}:</span>;
    }
});

// Score Proband panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualScore = function() {
    let individual = this.state.individual;
    let scores = individual && individual.scores ? individual.scores : null;

    return (
        <div className="row">
            <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue="none" value={scores && scores.length ? scores[0].scoreStatus : null}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Score">Score</option>
                <option value="Review">Review</option>
                <option value="Contradicts">Contradicts</option>
            </Input>
            <div className="col-sm-7 col-sm-offset-5 score-status-note">
                <div className="alert alert-warning">Note: The next release will provide a calculated score for this proband based on the information provided as well as the ability to adjust this score within the allowed range specified by the Clinical Validity Classification.</div>
            </div>
        </div>
    );
};

var IndividualViewer = React.createClass({
    render: function() {
        var individual = this.props.context;
        var method = individual.method;
        var variants = (individual.variants && individual.variants.length) ? individual.variants : [{}];
        var i = 0;
        var groupRenders = [];
        var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
        let scores = individual && individual.scores ? individual.scores : null;

        // Collect all families to render, as well as groups associated with these families
        var familyRenders = individual.associatedFamilies.map(function(family, j) {
            groupRenders = family.associatedGroups.map(function(group) {
                return (
                    <span key={group.uuid}>
                        {i++ > 0 ? ', ' : ''}
                        <a href={group['@id']}>{group.label}</a>
                    </span>
                );
            });
            return (
                <span key={family.uuid}>
                    <span key={family.uuid}>
                        {j > 0 ? ', ' : ''}
                        <a href={family['@id']}>{family.label}</a>
                    </span>
                </span>
            );
        });

        // Collect all groups associated with these individuals directly
        var directGroupRenders = individual.associatedGroups.map(function(group) {
            return (
                <span key={group.uuid}>
                    {i++ > 0 ? ', ' : ''}
                    {group.label}
                </span>
            );
        });
        groupRenders = groupRenders.concat(directGroupRenders);

        var tempGdmPmid = curator.findGdmPmidFromObj(individual);
        var tempGdm = tempGdmPmid[0];
        var tempPmid = tempGdmPmid[1];
        let associatedFamily = individual.associatedFamilies && individual.associatedFamilies.length ? individual.associatedFamilies[0] : null;
        let segregation = associatedFamily && associatedFamily.segregation ? associatedFamily.segregation : null;

        return (
            <div>
                <ViewRecordHeader gdm={tempGdm} pmid={tempPmid} />
                <div className="container">
                    <div className="row curation-content-viewer">
                        <div className="viewer-titles">
                            <h1>View Individual: {individual.label}{probandLabel}</h1>
                            <h2>
                                {tempGdm ? <a href={'/curation-central/?gdm=' + tempGdm.uuid + (tempGdm ? '&pmid=' + tempPmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                {groupRenders.length ?
                                    <span> &#x2F;&#x2F; Group {groupRenders}</span>
                                : null}
                                {familyRenders.length ?
                                    <span> &#x2F;&#x2F; Family {familyRenders}</span>
                                : null}
                                <span> &#x2F;&#x2F; Individual {individual.label}</span>
                            </h2>
                        </div>
                        <Panel title={<LabelPanelTitleView individual={individual} labelText="Disease & Phenotype(s)" />} panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Orphanet Common Diagnosis</dt>
                                    <dd>{individual.diagnosis && individual.diagnosis.map(function(disease, i) {
                                        return <span key={disease.orphaNumber}>{i > 0 ? ', ' : ''}{disease.term} (<a href={external_url_map['OrphaNet'] + disease.orphaNumber} title={"OrphaNet entry for ORPHA" + disease.orphaNumber + " in new tab"} target="_blank">ORPHA{disease.orphaNumber}</a>)</span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>HPO IDs</dt>
                                    <dd>{individual.hpoIdInDiagnosis && individual.hpoIdInDiagnosis.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype Terms</dt>
                                    <dd>{individual.termsInDiagnosis}</dd>
                                </div>

                                <div>
                                    <dt>NOT HPO IDs</dt>
                                    <dd>{individual.hpoIdInElimination && individual.hpoIdInElimination.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>NOT phenotype terms</dt>
                                    <dd>{individual.termsInElimination}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title={<LabelPanelTitleView individual={individual} labelText="Demographics" />} panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Sex</dt>
                                    <dd>{individual.sex}</dd>
                                </div>

                                <div>
                                    <dt>Country of Origin</dt>
                                    <dd>{individual.countryOfOrigin}</dd>
                                </div>

                                <div>
                                    <dt>Ethnicity</dt>
                                    <dd>{individual.ethnicity}</dd>
                                </div>

                                <div>
                                    <dt>Race</dt>
                                    <dd>{individual.race}</dd>
                                </div>

                                <div>
                                    <dt>Age Type</dt>
                                    <dd>{individual.ageType}</dd>
                                </div>

                                <div>
                                    <dt>Value</dt>
                                    <dd>{individual.ageValue}</dd>
                                </div>

                                <div>
                                    <dt>Age Unit</dt>
                                    <dd>{individual.ageUnit}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title={<LabelPanelTitleView individual={individual} labelText="Methods" />} panelClassName="panel-data">
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
                            </dl>
                        </Panel>

                        <Panel title={<LabelPanelTitleView individual={individual} variant />} panelClassName="panel-data">
                            {variants.map(function(variant, i) {
                                return (
                                    <div key={i} className="variant-view-panel">
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
                                        : null}
                                        {variant.otherDescription ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>Other description</dt>
                                                    <dd>{variant.otherDescription}</dd>
                                                </dl>
                                            </div>
                                        : null }
                                        {individual && individual.recessiveZygosity && i === 0 ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>If Recessive, select variant zygosity</dt>
                                                    <dd>{individual.recessiveZygosity}</dd>
                                                </dl>
                                            </div>
                                        : null }
                                    </div>
                                );
                            })}
                            {variants && variants.length ?
                                <div className="variant-view-panel family-associated">
                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If there are 2 variants described, are they both located in <i>trans</i> with respect to one another?</dt>
                                            <dd>{individual.bothVariantsInTrans}</dd>
                                        </dl>
                                    </div>

                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If the individuals has one variant, is it <i>de novo</i> OR If the individual has 2 variants, is at least one <i>de novo</i>?</dt>
                                            <dd>{individual.denovo}</dd>
                                        </dl>
                                    </div>

                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If the answer to the above question is yes, is the variant maternity and paternity confirmed?</dt>
                                            <dd>{individual.maternityPaternityConfirmed}</dd>
                                        </dl>
                                    </div>
                                </div>
                            : null}
                        </Panel>

                        <Panel title={<LabelPanelTitleView individual={individual} labelText="Additional Information" />} panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Additional Information about Individual</dt>
                                    <dd>{individual.additionalInformation}</dd>
                                </div>

                                <dt>Other PMID(s) that report evidence about this same Individual</dt>
                                <dd>{individual.otherPMIDs && individual.otherPMIDs.map(function(article, i) {
                                    return <span key={article.pmid}>{i > 0 ? ', ' : ''}<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span>;
                                })}</dd>
                            </dl>
                        </Panel>

                        {(associatedFamily && individual.proband) || (!associatedFamily && individual.proband) ?
                            <Panel title={<LabelPanelTitleView individual={individual} labelText="Score Proband" />} panelClassName="panel-data">
                                <dl className="dl-horizontal">
                                    <div>
                                        <dt>Score Status</dt>
                                        <dd>{scores && scores.length ? scores[0].scoreStatus : null}</dd>
                                    </div>
                                </dl>
                            </Panel>
                        : null}

                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(IndividualViewer, 'individual');


// HTML labels for inputs follow.
var LabelPanelTitleView = React.createClass({
    render: function() {
        var individual = this.props.individual;
        var probandLabel = <span>{individual && individual.proband ? <i className="icon icon-proband"></i> : null}</span>;
        var labelText = this.props.labelText;

        if (this.props.variant) {
            labelText = (individual && individual.associatedFamilies.length && individual.proband) ?
                'Variant(s) segregating with Proband' :
                'Associated Variant(s)';
        }

        return <h4><span className="panel-title-std">Individual{probandLabel} — {labelText}</span></h4>;
    }
});


// Make a starter individual from the family and write it to the DB; always called from
// family curation. Pass an array of disease objects to add, as well as an array of variants.
// Returns a promise once the Individual object is written.
var makeStarterIndividual = module.exports.makeStarterIndividual = function(label, diseases, variants, zygosity, context) {
    var newIndividual = {};

    newIndividual.label = label;
    newIndividual.diagnosis = diseases;
    newIndividual.variants = variants;
    newIndividual.proband = true;
    if (zygosity) { newIndividual.recessiveZygosity = zygosity; }

    // We created an individual; post it to the DB and return a promise with the new individual
    return context.postRestData('/individuals/', newIndividual).then(data => {
        return Promise.resolve(data['@graph'][0]);
    });
};


// Update the individual with the variants, and write the updated individual to the DB.
var updateProbandVariants = module.exports.updateProbandVariants = function(individual, variants, zygosity, context) {
    var updateNeeded = true;

    // Check whether the variants from the family are different from the variants in the individual
    if (individual.variants && (individual.variants.length === variants.length)) {
        // Same number of variants; see if the contents are different.
        // Need to convert individual variant array to array of variant @ids, because that's what's in the variants array.
        var missing = _.difference(variants, individual.variants.map(function(variant) { return variant['@id']; }));
        updateNeeded = !!missing.length;
    } else if (individual.variants && individual.variants.length !== variants.length) {
        /********************************************************************************************/
        /* Update individual's variant object if either one of the following is true:               */
        /* 1) Add 2 variants to proband in family first, but then remove 1 of them after submitting */
        /* 2) Add 1 variant to proband in family first, but then add 1 more after submitting        */
        /********************************************************************************************/
        updateNeeded = true;
    }

    /***********************************************************/
    /* Update individual's recessiveZygosity property if:      */
    /* The passed argument is different from the strored value */
    /***********************************************************/
    if (zygosity !== individual.recessiveZygosity) {
        updateNeeded = true;
    }

    if (updateNeeded) {
        var writerIndividual = curator.flatten(individual);
        writerIndividual.variants = variants;
        if (zygosity) {
            writerIndividual.recessiveZygosity = zygosity;
        } else {
            delete writerIndividual['recessiveZygosity'];
        }
        if (individual.scores && individual.scores.length) {
            writerIndividual.scores = individual.scores;
        }

        return context.putRestData('/individuals/' + individual.uuid, writerIndividual).then(data => {
            return Promise.resolve(data['@graph'][0]);
        });
    }
    return Promise.resolve(null);
};


var recordIndividualHistory = module.exports.recordIndividualHistory = function(gdm, annotation, individual, group, family, modified, context) {
    // Add to the user history. data.individual always contains the new or edited individual. data.group contains the group the individual was
    // added to, if it was added to a group. data.annotation contains the annotation the individual was added to, if it was added to
    // the annotation, and data.family contains the family the individual was added to, if it was added to a family. If none of data.group,
    // data.family, nor data.annotation exist, data.individual holds the existing individual that was modified.
    var meta, historyPromise;

    if (modified){
        historyPromise = context.recordHistory('modify', individual);
    } else {
        if (family) {
            // Record the creation of a new individual added to a family
            meta = {
                individual: {
                    gdm: gdm['@id'],
                    family: family['@id'],
                    article: annotation.article['@id']
                }
            };
            historyPromise = context.recordHistory('add', individual, meta);
        } else if (group) {
            // Record the creation of a new individual added to a group
            meta = {
                individual: {
                    gdm: gdm['@id'],
                    group: group['@id'],
                    article: annotation.article['@id']
                }
            };
            historyPromise = context.recordHistory('add', individual, meta);
        } else if (annotation) {
            // Record the creation of a new individual added to a GDM
            meta = {
                individual: {
                    gdm: gdm['@id'],
                    article: annotation.article['@id']
                }
            };
            historyPromise = context.recordHistory('add', individual, meta);
        }
    }

    return historyPromise;
};


// Display a history item for adding an individual
var IndividualAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var individual = history.primary;
        var gdm = history.meta.individual.gdm;
        var group = history.meta.individual.group;
        var family = history.meta.individual.family;
        var article = history.meta.individual.article;

        return (
            <div>
                Individual <a href={individual['@id']}>{individual.label}</a>
                <span> added to </span>
                {family ?
                    <span>family <a href={family['@id']}>{family.label}</a></span>
                :
                    <span>
                        {group ?
                            <span>group <a href={group['@id']}>{group.label}</a></span>
                        :
                            <span>
                                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                            </span>
                        }
                    </span>
                }
                <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(IndividualAddHistory, 'individual', 'add');


// Display a history item for modifying an individual
var IndividualModifyHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var individual = history.primary;

        return (
            <div>
                Individual <a href={individual['@id']}>{individual.label}</a>
                <span> modified</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(IndividualModifyHistory, 'individual', 'modify');


// Display a history item for deleting an individual
var IndividualDeleteHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var individual = history.primary;

        return (
            <div>
                <span>Individual {individual.label} deleted</span>
                <span>; {moment(history.last_modified).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(IndividualDeleteHistory, 'individual', 'delete');
