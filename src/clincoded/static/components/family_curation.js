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
var individual_curation = require('./individual_curation');

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
var makeStarterIndividual = individual_curation.makeStarterIndividual;
var updateProbandVariants = individual_curation.updateProbandVariants;

// Will be great to convert to 'const' when available
var MAX_VARIANTS = 5;

// Settings for this.state.varOption
var VAR_NONE = 0; // No variants entered in a panel
var VAR_SPEC = 1; // A specific variant (dbSNP, ClinVar, HGVS) entered in a panel
var VAR_OTHER = 2; // Other description entered in a panel


var FamilyCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            annotation: null, // Annotation object given in query string
            extraFamilyCount: 0, // Number of extra families to create
            extraFamilyNames: [], // Names of extra families to create
            variantCount: 0, // Number of variants to display
            variantOption: [], // One variant panel, and nothing entered
            probandIndividual: null, //Proband individual if the family being edited has one
            familyName: '', // Currently entered family name
            addVariantDisabled: false, // True if Add Another Variant button enabled
            genotyping2Disabled: true // True if genotyping method 2 dropdown disabled
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

    // Handle a click on the copy orphanet button
    handleClick: function(e) {
        e.preventDefault(); e.stopPropagation();
        var orphanetVal = this.refs['orphanetid'].getValue();
        this.refs['individualorphanetid'].setValue(orphanetVal);
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
                if (segregation && segregation.variants && segregation.variants.length) {
                    // We have variants
                    stateObj.variantCount = segregation.variants.length;
                    stateObj.addVariantDisabled = false;

                    var currVariantOption = [];
                    for (var i = 0; i < segregation.variants.length; i++) {
                        if (segregation.variants[i].clinvarVariantId) {
                            currVariantOption[i] = VAR_SPEC;
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
                    this.setFormErrors('VARclinvarid' + i, 'Use ClinVar VariantIDs (e.g. 177676)');
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
            var familyDiseases = null, familyArticles, familyVariants = [];
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
            if (!orphaIds || !orphaIds.length || _(orphaIds).any(function(id) { return id === null; })) {
                // ORPHA list is bad
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
            }

            // Check that all individual’s Orphanet IDs have the proper format (will check for existence later)
            if (this.state.variantCount > 0 && !this.state.probandIndividual) {
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
                // Build search string from given ORPHA IDs
                var searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (diseases['@graph'].length === orphaIds.length) {
                        // Successfully retrieved all diseases
                        familyDiseases = diseases;
                        return Promise.resolve(diseases);
                    } else {
                        // Get array of missing Orphanet IDs
                        var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                        this.setFormErrors('orphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                        throw diseases;
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setFormErrors('orphanetid', 'The given diseases not found');
                    throw e;
                }).then(diseases => {
                    // Check for individual orphanet IDs if we have variants and no existing proband
                    if (this.state.variantCount && !this.state.probandIndividual) {
                        var searchStr = '/search/?type=orphaPhenotype&' + indOrphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');

                        // Verify given Orpha ID exists in DB
                        return this.getRestData(searchStr).then(diseases => {
                            if (diseases['@graph'].length === indOrphaIds.length) {
                                // Successfully retrieved all diseases
                                individualDiseases = diseases;
                                return Promise.resolve(diseases);
                            } else {
                                // Get array of missing Orphanet IDs
                                var missingOrphas = _.difference(indOrphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                                this.setFormErrors('individualorphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                                throw diseases;
                            }
                        }, e => {
                            // The given orpha IDs couldn't be retrieved for some reason.
                            this.setFormErrors('individualorphanetid', 'The given diseases not found');
                            throw e;
                        });
                    }
                    return Promise.resolve(diseases);
                }).then(diseases => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all genes
                                familyArticles = articles;
                                return Promise.resolve(articles);
                            } else {
                                var missingPmids = _.difference(pmids, articles['@graph'].map(function(article) { return article.pmid; }));
                                this.setFormErrors('otherpmids', missingPmids.join(', ') + ' not found');
                                throw articles;
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
                                    familyVariants.push('/variants/' + result['@graph'][0].uuid + '/');
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
                                    familyVariants.push('/variants/' + result['@graph'][0].uuid + '/');
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
                    if (this.state.variantCount) {
                        initvar = true;
                        label = this.getFormValue('individualname');
                        diseases = individualDiseases['@graph'].map(function(disease) { return disease['@id']; });
                        return makeStarterIndividual(label, diseases, familyVariants, this);
                    }

                    // Family doesn't have any variants
                    return Promise.resolve(null);
                }).then(data => {
                    // Make a new family object based on form fields.
                    var newFamily = this.createFamily(familyDiseases, familyArticles, familyVariants);

                    // Prep for multiple family writes, based on the family count dropdown (only appears when creating a new family,
                    // not when editing a family). This is a count of *extra* families, so add 1 to it to get the number of families
                    // to create.
                    var familyPromises = [];
                    var familyCount = parseInt(this.getFormValue('extrafamilycount'), 10);
                    familyCount = familyCount ? familyCount + 1 : 1;

                    // Assign the starter individual if we made one
                    if (data && data['@type'][0] === 'individual') {
                        if (!newFamily.individualIncluded) {
                            newFamily.individualIncluded = [];
                        }
                        newFamily.individualIncluded.push(data['@id']);
                    }

                    // Write the new family object to the DB
                    for (var i = 0; i < familyCount; ++i) {
                        var familyLabel;
                        if (i > 0) {
                            familyLabel = this.getFormValue('extrafamilyname' + (i - 1));
                        }
                        familyPromises.push(this.writeFamilyObj(newFamily, familyLabel));
                    }
                    return Promise.all(familyPromises);
                }).then(newFamilies => {
                    var promise;
                    savedFamilies = newFamilies;

                    // If we're adding this family to a group, update the group with this family; otherwise update the annotation
                    // with the family.
                    if (!this.state.family) {
                        if (this.state.group) {
                            // Add the newly saved families to the group
                            var group = curator.flatten(this.state.group);
                            if (!group.familyIncluded) {
                                group.familyIncluded = [];
                            }

                            // Merge existing families in the annotation with the new set of families.
                            Array.prototype.push.apply(group.familyIncluded, savedFamilies.map(function(family) { return family['@id']; }));

                            // Post the modified annotation to the DB, then go back to Curation Central
                            promise = this.putRestData('/groups/' + this.state.group.uuid, group);
                        } else {
                            // Not part of a group, so add the family to the annotation instead.
                            var annotation = curator.flatten(this.state.annotation);
                            if (!annotation.families) {
                                annotation.families = [];
                            }

                            // Merge existing families in the annotation with the new set of families.
                            Array.prototype.push.apply(annotation.families, savedFamilies.map(function(family) { return family['@id']; }));

                            // Post the modified annotation to the DB, then go back to Curation Central
                            promise = this.putRestData('/evidence/' + this.state.annotation.uuid, annotation);
                        }
                    } else {
                        promise = Promise.resolve(null);
                    }
                    return promise;
                }).then(data => {
                    // Navigate back to Curation Central page.
                    // FUTURE: Need to navigate to Family Submit page.
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut && !initvar) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        this.context.navigate('/family-submit/?gdm=' + this.state.gdm.uuid + '&family=' + savedFamilies[0].uuid + '&annotation=' + this.state.annotation.uuid + (initvar ? '&initvar' : '') + (hadvar ? '&hadvar' : ''));
                    }
                }).catch(function(e) {
                    console.log('FAMILY CREATION ERROR=: %o', e);
                });
            }
        }
    },

    // Create segregation object based on the form values
    createSegregation: function(newFamily, variants) {
        var newSegregation = {};
        var value1;

        value1 = this.getFormValue('pedigreedesc');
        if (value1) {
            newSegregation.pedigreeDescription = value1;
        }
        value1 = this.getFormValue('pedigreesize');
        if (value1) {
            newSegregation.pedigreeSize = parseInt(value1, 10);
        }
        value1 = this.getFormValue('nogenerationsinpedigree');
        if (value1) {
            newSegregation.numberOfGenerationInPedigree = parseInt(value1, 10);
        }
        value1 = this.getFormValue('consanguineous');
        if (value1 !== 'none') {
            newSegregation.consanguineousFamily = value1 === 'Yes';
        }
        value1 = this.getFormValue('nocases');
        if (value1) {
            newSegregation.numberOfCases = parseInt(value1, 10);
        }
        value1 = this.getFormValue('denovo');
        if (value1 !== 'none') {
            newSegregation.deNovoType = value1;
        }
        value1 = this.getFormValue('unaffectedcarriers');
        if (value1 !== 'none') {
            newSegregation.numberOfParentsUnaffectedCarriers = parseInt(value1, 10);
        }
        value1 = this.getFormValue('noaffected');
        if (value1) {
            newSegregation.numberOfAffectedAlleles = parseInt(value1, 10);
        }
        value1 = this.getFormValue('noaffected1');
        if (value1) {
            newSegregation.numberOfAffectedWithOneVariant = parseInt(value1, 10);
        }
        value1 = this.getFormValue('noaffected2');
        if (value1) {
            newSegregation.numberOfAffectedWithTwoVariants = parseInt(value1, 10);
        }
        value1 = this.getFormValue('nounaffectedcarriers');
        if (value1) {
            newSegregation.numberOfUnaffectedCarriers = parseInt(value1, 10);
        }
        value1 = this.getFormValue('nounaffectedindividuals');
        if (value1) {
            newSegregation.numberOfUnaffectedIndividuals = parseInt(value1, 10);
        }
        value1 = this.getFormValue('bothvariants');
        if (value1 !== 'none') {
            newSegregation.probandAssociatedWithBoth = value1 === 'Yes';
        }
        value1 = this.getFormValue('addedsegregationinfo');
        if (value1) {
            newSegregation.additionalInformation = value1;
        }
        if (variants) {
            newSegregation.variants = variants;
        }

        if (Object.keys(newSegregation).length) {
            newFamily.segregation = newSegregation;
        }
    },

    // Create a family object to be written to the database. Most values come from the values
    // in the form. The created object is returned from the function.
    createFamily: function(familyDiseases, familyArticles, familyVariants) {
        // Make a new family. If we're editing the form, first copy the old family
        // to make sure we have everything not from the form.
        var newFamily = this.state.family ? curator.flatten(this.state.family) : {};

        // Method and/or segregation successfully created if needed (null if not); passed in 'methSeg' object. Now make the new family.
        newFamily.label = this.getFormValue('familyname');

        // Get an array of all given disease IDs
        if (familyDiseases) {
            newFamily.commonDiagnosis = familyDiseases['@graph'].map(function(disease) { return disease['@id']; });
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
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newFamily.termsInDiagnosis = phenoterms;
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

        // Fill in the segregation fields to the family.
        this.createSegregation(newFamily, familyVariants);

        return newFamily;
    },

    // Add another variant section to the FamilyVariant panel
    handleAddVariant: function() {
        this.setState({variantCount: this.state.variantCount + 1, addVariantDisabled: true});
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
        var family = this.state.family;
        var groups = (family && family.associatedGroups) ? family.associatedGroups :
            (this.state.group ? [this.state.group] : null);
        var annotation = this.state.annotation;
        var method = (family && family.method && Object.keys(family.method).length) ? family.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        return (
            <div>
                {(!this.queryValues.familyUuid || this.state.family) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={annotation.article} displayJournal />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(family ? 'Edit' : 'Curate') + ' Family Information'}</h1>
                                <h2>Family: {this.state.familyName ? <span>{this.state.familyName}</span> : <span className="no-entry">No entry</span>}</h2>
                                {groups && groups.length ?
                                    <h2>
                                        {'Group association: ' + groups.map(function(group) { return group.label; }).join(', ')}
                                    </h2>
                                : null}
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {FamilyName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Family – Common Disease & Phenotypes" open>
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
                                        <PanelGroup accordion>
                                            <Panel title="Family — Segregation" open>
                                                {FamilySegregation.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family — Variant(s) segregating with Proband" open>
                                                {FamilyVariant.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Additional Information" open>
                                                {FamilyAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right" id="submit" title="Save" />
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
            <Input type="text" ref="familyname" label="Family Name:" value={family && family.label} handleChange={this.handleChange}
                error={this.getFormError('familyname')} clearError={this.clrFormErrors.bind(null, 'familyname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
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
        orphanetidVal = family.commonDiagnosis ? family.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join() : null;
        hpoidVal = family.hpoIdInDiagnosis ? family.hpoIdInDiagnosis.join() : null;
        nothpoidVal = family.hpoIdInElimination ? family.hpoIdInElimination.join() : null;
    }

    // Make a list of diseases from the group, either from the given group,
    // or the family if we're editing one that has associated groups.
    if (group) {
        // We have a group, so get the disease array from it.
        associatedGroups = [group];
    } else if (family && family.associatedGroups && family.associatedGroups.length) {
        // We have a family with associated groups. Combine the diseases from all groups.
        associatedGroups = family.associatedGroups;
    }

    return (
        <div className="row">
            {curator.renderOrphanets(associatedGroups, 'Group')}
            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={family && family.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
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
        return <span><a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> Common Disease(s) in Family:</span>;
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
                {this.props.not ? <span style={{color: 'red'}}>NOT </span> : <span>Shared </span>}
                Phenotype(s) <span style={{fontWeight: 'normal'}}>(HPO ID(s); <a href="http://www.human-phenotype-ontology.org/hpoweb/showterm?id=HP:0000118" target="_blank" title="HPO Browser in a new tab">HPO Browser</a>)</span>:
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
                {this.props.not ? <span style={{color: 'red'}}>NOT </span> : <span>Shared </span>}
                Phenotype(s) (<span style={{fontWeight: 'normal'}}>free text</span>):
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
                    return <option key={country_code.code}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={family && family.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Hispanic or Latino</option>
                <option>Not Hispanic or Latino</option>
                <option>Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={family && family.race}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>American Indian or Alaska Native</option>
                <option>Asian</option>
                <option>Black</option>
                <option>Native Hawaiian or Other Pacific Islander</option>
                <option>White</option>
                <option>Mixed</option>
                <option>Unknown</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Age Range</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none" value={family && family.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Onset</option>
                    <option>Report</option>
                    <option>Diagnosis</option>
                    <option>Death</option>
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
                    <option>Days</option>
                    <option>Weeks</option>
                    <option>Months</option>
                    <option>Years</option>
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
            <Input type="textarea" ref="pedigreedesc" label="Pedigree description:" rows="5" value={segregation.pedigreeDescription}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="pedigreesize" label="Pedigree size:" value={segregation.pedigreeSize} minVal={2}
                error={this.getFormError('pedigreesize')} clearError={this.clrFormErrors.bind(null, 'pedigreesize')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="nogenerationsinpedigree" label="# generations in pedigree:" value={segregation.numberOfGenerationInPedigree}
                error={this.getFormError('nogenerationsinpedigree')} clearError={this.clrFormErrors.bind(null, 'nogenerationsinpedigree')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="consanguineous" label="Consanguineous family?:" defaultValue="none" value={curator.booleanToDropdown(segregation.consanguineousFamily)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="number" ref="nocases" label="# cases (phenotype positive):" value={segregation.numberOfCases} minVal={1}
                error={this.getFormError('nocases')} clearError={this.clrFormErrors.bind(null, 'nocases')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="denovo" label="de novo type:" defaultValue="none" value={segregation.deNovoType}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Inferred</option>
                <option>Confirmed</option>
            </Input>
            <Input type="select" ref="unaffectedcarriers" label="# parents who are unaffected carriers" defaultValue="none" value={segregation.numberOfParentsUnaffectedCarriers}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>0</option>
                <option>1</option>
                <option>2</option>
            </Input>
            <Input type="number" ref="noaffected" label="# affected individuals:" value={segregation.numberOfAffectedAlleles}
                error={this.getFormError('noaffected')} clearError={this.clrFormErrors.bind(null, 'noaffected')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="noaffected1" label="# affected with 1 variant:" value={segregation.numberOfAffectedWithOneVariant}
                error={this.getFormError('noaffected1')} clearError={this.clrFormErrors.bind(null, 'noaffected1')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="noaffected2" label="# affected with 2 different variants or homozygous for 1:" value={segregation.numberOfAffectedWithTwoVariants}
                error={this.getFormError('noaffected2')} clearError={this.clrFormErrors.bind(null, 'noaffected2')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="nounaffectedcarriers" label="# unaffected carriers:" value={segregation.numberOfUnaffectedCarriers}
                error={this.getFormError('nounaffectedcarriers')} clearError={this.clrFormErrors.bind(null, 'nounaffectedcarriers')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="nounaffectedindividuals" label="# unaffected individuals:" value={segregation.numberOfUnaffectedIndividuals}
                error={this.getFormError('nounaffectedindividuals')} clearError={this.clrFormErrors.bind(null, 'nounaffectedindividuals')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="bothvariants" label="If more than 1 variant, is proband associated with both?" defaultValue="none" value={curator.booleanToDropdown(segregation.probandAssociatedWithBoth)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="textarea" ref="addedsegregationinfo" label="Additional Segregation Information:" rows="5" value={segregation.additionalInformation}
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
                <div className="clearfix">
                    <p className="col-sm-7 col-sm-offset-5">
                        To create and have the option to count a proband associated with a variant(s) for this Family, you need to add variant information in this section.
                        The proband (an Individual) will be created upon submission using the name you supply here. You will be able to add additional information about the proband
                        following submission of Family information.
                    </p>
                    <p className="col-sm-7 col-sm-offset-5">
                        ClinVar VariantID should be provided in all instances it exists. This is the only way to associate probands from different studies with
                        the same variant, and ensures the accurate counting of probands.
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
                        <Input type="text" ref={'VARclinvarid' + i} label={<LabelClinVarVariant />} value={variant && variant.clinvarVariantId} placeholder="e.g. 177676" handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_OTHER}
                            error={this.getFormError('VARclinvarid' + i)} clearError={this.clrFormErrors.bind(null, 'VARclinvarid' + i)}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
                        <p className="col-sm-7 col-sm-offset-5 input-note-below">
                            The VariantID is the number found after <strong>/variation/</strong> in the URL for a variant in ClinVar (<a href="http://www.ncbi.nlm.nih.gov/clinvar/variation/139214/" target="_blank">example</a>: 139214).
                        </p>
                        <Input type="textarea" ref={'VARothervariant' + i} label={<LabelOtherVariant />} rows="5" value={variant && variant.otherDescription} handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_SPEC}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                    </div>
                );
            })}
            {this.state.variantCount && !this.state.probandIndividual ?
                <div className="variant-panel clearfix">
                    <Input type="text" ref="individualname" label="Individual Name"
                        error={this.getFormError('individualname')} clearError={this.clrFormErrors.bind(null, 'individualname')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                    <Input type="text" ref="individualorphanetid" label="Orphanet Disease(s) for Individual" placeholder="e.g. ORPHA15"
                        error={this.getFormError('individualorphanetid')} clearError={this.clrFormErrors.bind(null, 'individualorphanetid')}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                    <Input type="button" ref="orphanetcopy" inputClassName="btn-default btn-last pull-right" title="Copy Orphanet IDs from Family"
                        clickHandler={this.handleClick} />
                </div>
            : null}
            {this.state.variantCount < MAX_VARIANTS ?
                <div>
                    <Input type="button" ref="addvariant" inputClassName="btn-default btn-last pull-right" title={this.state.variantCount ? "Add another variant associated with proband" : "Add variant associated with proband"}
                        clickHandler={this.handleAddVariant} inputDisabled={this.state.addVariantDisabled} />
                </div>
            : null}
        </div>
    );
};

var LabelClinVarVariant = React.createClass({
    render: function() {
        return <span><a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> VariantID:</span>;
    }
});

var LabelOtherVariant = React.createClass({
    render: function() {
        return <span>Other description <span style={{fontWeight: 'normal'}}>(only when no ID available)</span>:</span>;
    }
});


// Additional Information family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyAdditional = function() {
    var otherpmidsVal;
    var family = this.state.family;
    if (family) {
        otherpmidsVal = family.otherPMIDs ? family.otherPMIDs.map(function(article) { return article.pmid; }).join() : null;
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


var FamilyViewer = React.createClass({
    render: function() {
        var context = this.props.context;
        var method = context.method;
        var groups = context.associatedGroups;
        var segregation = context.segregation;
        var variants = segregation ? ((segregation.variants && segregation.variants.length) ? segregation.variants : [{}]) : [{}];

        return (
            <div className="container">
                <div className="row group-curation-content">
                    <div className="viewer-titles">
                        <h1>View Family: {context.label}</h1>
                        {groups && groups.length ?
                            <h2>
                                Group association:&nbsp;
                                {groups.map(function(group, i) {
                                    return <span key={i}>{i > 0 ? ', ' : ''}{group.label}</span>;
                                })}
                            </h2>
                        : null}
                    </div>
                    <Panel title="Common diseases &amp; phenotypes" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Orphanet Common Diagnosis</dt>
                                <dd>
                                    {context.commonDiagnosis.map(function(disease, i) {
                                        return (
                                            <span key={disease.orphaNumber}>
                                                {i > 0 ? ', ' : ''}
                                                {'ORPHA' + disease.orphaNumber}
                                            </span>
                                        );
                                    })}
                                </dd>
                            </div>

                            <div>
                                <dt>HPO IDs</dt>
                                <dd>{context.hpoIdInDiagnosis.join(', ')}</dd>
                            </div>

                            <div>
                                <dt>Phenotype Terms</dt>
                                <dd>{context.termsInDiagnosis}</dd>
                            </div>

                            <div>
                                <dt>NOT HPO IDs</dt>
                                <dd>{context.hpoIdInElimination.join(', ')}</dd>
                            </div>

                            <div>
                                <dt>NOT phenotype terms</dt>
                                <dd>{context.termsInElimination}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Family — Demographics" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt># Males</dt>
                                <dd>{context.numberOfMale}</dd>
                            </div>

                            <div>
                                <dt># Females</dt>
                                <dd>{context.numberOfFemale}</dd>
                            </div>

                            <div>
                                <dt>Country of Origin</dt>
                                <dd>{context.countryOfOrigin}</dd>
                            </div>

                            <div>
                                <dt>Ethnicity</dt>
                                <dd>{context.ethnicity}</dd>
                            </div>

                            <div>
                                <dt>Race</dt>
                                <dd>{context.race}</dd>
                            </div>

                            <div>
                                <dt>Age Range Type</dt>
                                <dd>{context.ageRangeType}</dd>
                            </div>

                            <div>
                                <dt>Age Range</dt>
                                <dd>{context.ageRangeFrom || context.ageRangeTo ? <span>{context.ageRangeFrom + ' – ' + context.ageRangeTo}</span> : null}</dd>
                            </div>

                            <div>
                                <dt>Age Range Unit</dt>
                                <dd>{context.ageRangeUnit}</dd>
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
                                <dt>Description of Methods by which specific mutations genotyped</dt>
                                <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                            </div>

                            <div>
                                <dt>Additional Information about Family Method</dt>
                                <dd>{method && method.additionalInformation}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Family — Segregation" panelClassName="panel-data">
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

                    <Panel title="Family - Variant(s) associated with Proband" panelClassName="panel-data">
                        {variants.map(function(variant, i) {
                            return (
                                <div className="variant-view-panel">
                                    <h5>Variant {i + 1}</h5>
                                    <dl className="dl-horizontal">
                                        <div>
                                            <dt>ClinVar VariantID</dt>
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

                    <Panel title="Family — Additional Information" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Additional Information about Family</dt>
                                <dd>{context.additionalInformation}</dd>
                            </div>

                            <dt>Other PMID(s) that report evidence about this same Family</dt>
                            <dd>
                                {context.otherPMIDs && context.otherPMIDs.map(function(article, i) {
                                    return (
                                        <span key={i}>
                                            {i > 0 ? ', ' : ''}
                                            {article.pmid}
                                        </span>
                                    );
                                })}
                            </dd>
                        </dl>
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.content_views.register(FamilyViewer, 'family');
