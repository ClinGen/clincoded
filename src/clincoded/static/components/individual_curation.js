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


var IndividualCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: {}, // GDM object given in query string
            group: {}, // Group object given in query string
            family: {}, // Family object given in query string
            individual: {}, // If we're editing an individual, this gets the fleshed-out individual object we're editing
            annotation: {}, // Annotation object given in query string
            extraIndividualCount: 0, // Number of extra families to create
            extraIndividualNames: [], // Names of extra families to create
            variantCount: 1, // Number of variants to display
            variantOption: [VAR_NONE], // One variant panel, and nothing entered
            individualName: '', // Currently entered individual name
            addVariantDisabled: true, // True if Add Another Variant button enabled
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            proband: null // If we have an associated family that has a proband, this points at it
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
                this.refs['VARclinvarid' + refSuffix].resetValue();
                currVariantOption[refSuffix] = VAR_OTHER;
            } else if (dbsnpid || clinvarid || hgvsterm) {
                this.refs['VARothervariant' + refSuffix].resetValue();
                currVariantOption[refSuffix] = VAR_SPEC;
            } else {
                currVariantOption[refSuffix] = VAR_NONE;
            }
            this.setState({variantOption: currVariantOption});
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
            if (stateObj.individual && Object.keys(stateObj.individual).length) {
                this.setState({individualName: stateObj.individual.label});
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            // Also see if we need to disable the Add Variant button
            if (stateObj.individual && Object.keys(stateObj.individual).length) {
                stateObj.genotyping2Disabled = !(stateObj.individual.method && stateObj.individual.method.genotypingMethods && stateObj.individual.method.genotypingMethods.length);

                // If this individual has variants and isn't the proband in a family, handle the variant panels.
                if (stateObj.individual.variants && stateObj.individual.variants.length && !(stateObj.individual.proband && stateObj.family)) {
                    var variants = stateObj.individual.variants;

                    // This individual has variants
                    stateObj.variantCount = variants.length;
                    stateObj.addVariantDisabled = false;

                    // Go through each variant to determine how its form fields should be disabled.
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
        if (this.state.individual && Object.keys(this.state.individual).length) {
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

    // Validate that all the variant panels have properly-formatted input. Return true if they all do.
    validateVariants: function() {
        var valid;
        var anyInvalid = false;

        // Check Variant panel inputs for correct formats
        for (var i = 0; i < this.state.variantCount; i++) {
            // Check dbSNP ID for a valid format
            var value = this.getFormValue('VARdbsnpid' + i);
            if (value) {
                valid = value.match(/^\s*(rs\d{1,8})\s*$/i);
                if (!valid) {
                    this.setFormErrors('VARdbsnpid' + i, 'Use dbSNP IDs (e.g. rs1748)');
                    anyInvalid = true;
                }
            }

            // Check dbSNP ID for a valid format
            value = this.getFormValue('VARclinvarid' + i);
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
            var family = (this.state.family && Object.keys(this.state.family).length) ? this.state.family : null;
            var currIndividual = (this.state.individual && Object.keys(this.state.individual).length) ? this.state.individual : null;
            var newIndividual = {}; // Holds the new group object;
            var individualDiseases = null, individualArticles, individualVariants = [];
            var savedIndividuals; // Array of saved written to DB
            var formError = false;

            // Parse the comma-separated list of Orphanet IDs
            var orphaIds = curator.capture.orphas(this.getFormValue('orphanetid'));
            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (!orphaIds || !orphaIds.length || _(orphaIds).any(function(id) { return id === null; })) {
                // ORPHA list is bad
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

            if (!formError) {
                // Build search string from given ORPHA IDs
                var searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (diseases['@graph'].length === orphaIds.length) {
                        // Successfully retrieved all diseases
                        individualDiseases = diseases;
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
                    // Handle 'Add any other PMID(s) that have evidence about this same Individual' list of PMIDs
                    if (pmids) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all genes
                                individualArticles = articles;
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
                    var newVariants = [];
                    if (!currIndividual || !(currIndividual.proband && family)) {
                        // We're not editing a variant, or we're editing an individual that's not a proband in a family.
                        // Handle variants; start by making an array of search terms, one for each variant in the form.
                        // If this is a proband individual, its variants can only be edited from its associated family.

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
                                        individualVariants.push('/variants/' + result['@graph'][0].uuid + '/');
                                    } else {
                                        // Search got no result; make a new variant and save it in an array so we can write them.
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
                    } else if (currIndividual && currIndividual.proband && family) {
                        // Editing a proband in a family. Just pass through existing variants
                        newVariants = currIndividual.variants.map(function(variant) { return '/variants/' + variant.uuid + '/'; });
                        Promise.resolve(newVariants);
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
                                    // Add the newly written variants to the family
                                    results.forEach(result => {
                                        individualVariants.push('/variants/' + result['@graph'][0].uuid + '/');
                                    });
                                }
                                return Promise.resolve(results);
                            });
                        }
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(null);
                }).then(data => {
                    // Make a new individual object based on form fields.
                    var newIndividual = this.createIndividual(individualDiseases, individualArticles, individualVariants, hpoids, nothpoids);

                    // Prep for multiple family writes, based on the family count dropdown (only appears when creating a new family,
                    // not when editing a family). This is a count of *extra* families, so add 1 to it to get the number of families
                    // to create.
                    var individualPromises = [];
                    var individualCount = parseInt(this.getFormValue('extraindividualcount'), 10);
                    individualCount = individualCount ? individualCount + 1 : 1;

                    // Write the new individual object(s) to the DB
                    for (var i = 0; i < individualCount; ++i) {
                        var individualLabel;
                        if (i > 0) {
                            individualLabel = this.getFormValue('extraindividualname' + (i - 1));
                        }
                        individualPromises.push(this.writeIndividualObj(newIndividual, individualLabel));
                    }
                    return Promise.all(individualPromises);
                }).then(newIndividuals => {
                    var promise;
                    savedIndividuals = newIndividuals;

                    // If we're adding this individual to a group, update the group with this family; otherwise update the annotation
                    // with the family.
                    if (!this.state.individual || Object.keys(this.state.individual).length === 0) {
                        if (Object.keys(this.state.group).length) {
                            // Add the newly saved families to the group
                            var group = curator.flatten(this.state.group);
                            if (!group.individualIncluded) {
                                group.individualIncluded = [];
                            }

                            // Merge existing families in the annotation with the new set of families.
                            Array.prototype.push.apply(group.individualIncluded, savedIndividuals.map(function(individual) { return individual['@id']; }));

                            // Post the modified annotation to the DB, then go back to Curation Central
                            promise = this.putRestData('/groups/' + this.state.group.uuid, group);
                        } else if (Object.keys(this.state.family).length) {
                            // Add the newly saved families to the group
                            var family = curator.flatten(this.state.family);
                            if (!family.individualIncluded) {
                                family.individualIncluded = [];
                            }

                            // Merge existing families in the annotation with the new set of families.
                            Array.prototype.push.apply(family.individualIncluded, savedIndividuals.map(function(individual) { return individual['@id']; }));

                            // Post the modified annotation to the DB, then go back to Curation Central
                            promise = this.putRestData('/families/' + this.state.family.uuid, family);
                        } else {
                            // Not part of a group, so add the family to the annotation instead.
                            var annotation = curator.flatten(this.state.annotation);
                            if (!annotation.individuals) {
                                annotation.individuals = [];
                            }

                            // Merge existing families in the annotation with the new set of families.
                            Array.prototype.push.apply(annotation.individuals, savedIndividuals.map(function(individual) { return individual['@id']; }));

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
                    if (this.queryValues.editShortcut) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        var submitLink = '/individual-submit/?gdm=' + this.state.gdm.uuid + '&evidence=' + this.state.annotation.uuid + '&individual=' + savedIndividuals[0].uuid;
                        if (this.state.family && Object.keys(this.state.family).length) {
                            submitLink += '&family=' + this.state.family.uuid;
                        } else if (this.state.group && Object.keys(this.state.group).length) {
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
    createIndividual: function(individualDiseases, individualArticles, individualVariants, hpoids, nothpoids) {
        var value;
        var currIndividual = (this.state.individual && Object.keys(this.state.individual).length) ? this.state.individual : null;
        var family = (this.state.family && Object.keys(this.state.family).length) ? this.state.family : null;

        // Make a new family. If we're editing the form, first copy the old family
        // to make sure we have everything not from the form.
        var newIndividual = Object.keys(this.state.individual).length ? curator.flatten(this.state.individual) : {};
        newIndividual.label = this.getFormValue('individualname');

        // Get an array of all given disease IDs
        if (individualDiseases) {
            newIndividual.diagnosis = individualDiseases['@graph'].map(function(disease) { return disease['@id']; });
        }

        // Fill in the individual fields from the Common Diseases & Phenotypes panel
        if (hpoids && hpoids.length) {
            newIndividual.hpoIdInDiagnosis = hpoids;
        }
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newIndividual.termsInDiagnosis = phenoterms;
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

        // Assign the given variant array if we're not editing an individual proband in a family
        if (!currIndividual || !(currIndividual.proband && family)) {
            if (individualVariants) {
                newIndividual.variants = individualVariants;
            }
        }

        // Set the proband boolean
        value = this.getFormValue('proband');
        if (value && value !== 'none') { newIndividual.proband = value === "Yes"; }

        return newIndividual;
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
        var gdm = Object.keys(this.state.gdm).length ? this.state.gdm : null;
        var individual = Object.keys(this.state.individual).length ? this.state.individual : null;
        var annotation = Object.keys(this.state.annotation).length ? this.state.annotation : null;
        var method = (individual && individual.method && Object.keys(individual.method).length) ? individual.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get a list of associated groups if editing an individual, or the group in the query string if there was one, or null.
        var groups = (individual && individual.associatedGroups) ? individual.associatedGroups :
            (Object.keys(this.state.group).length ? [this.state.group] : null);

        // Get a list of associated families if editing an individual, or the family in the query string if there was one, or null.
        var families = (individual && individual.associatedFamilies) ? individual.associatedFamilies :
            (Object.keys(this.state.family).length ? [this.state.family] : null);

        // Figure out the family and group page titles
        var familyTitles = [];
        var groupTitles = [];
        if (individual) {
            // Editing an individual. get associated family titles, and associated group titles
            groupTitles = groups.map(function(group) { return group.label; });
            familyTitles = families.map(function(family) {
                // If this family has associated groups, add their titles to groupTitles.
                if (family.associatedGroups && family.associatedGroups.length) {
                    groupTitles = groupTitles.concat(family.associatedGroups.map(function(group) { return group.label; }));
                }
                return family.label;
            });
        } else {
            // Curating an individual.
            if (families) {
                // Given a family in the query string. Get title from first (only) family.
                familyTitles[0] = families[0].label;

                // If the given family has associated groups, add those to group titles
                if (families[0].associatedGroups && families[0].associatedGroups.length) {
                    groupTitles = families[0].associatedGroups.map(function(group) {
                        return group.label;
                    });
                }
            } else if (groups) {
                // Given a group in the query string. Get title from first (only) group.
                groupTitles[0] = groups[0].label;
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

        return (
            <div>
                {(!this.queryValues.individualUuid || individual) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={annotation.article} displayJournal />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(individual ? 'Edit' : 'Curate') + ' Individual Information'}</h1>
                                <h2>Individual: {this.state.individualName ? <span>{this.state.individualName}</span> : <span className="no-entry">No entry</span>}</h2>
                                {groupTitles.length ?
                                    <h2>
                                        {'Group association: ' + groupTitles.join(', ')}
                                    </h2>
                                : null}
                                {familyTitles.length ?
                                    <h2>
                                        {'Family association: ' + familyTitles.join(', ')}
                                    </h2>
                                : null}
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {IndividualName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Individual – Common Disease & Phenotypes" open>
                                                {IndividualCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Individual — Demographics" open>
                                                {IndividualDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Individual — Methods" open>
                                                {methods.render.call(this, method)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Individual — Additional Information" open>
                                                {IndividualAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Individual – Variant Information" open>
                                                {IndividualVariantInfo.call(this)}
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

globals.curator_page.register(IndividualCuration, 'curator_page', 'individual-curation');


// Individual Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualName = function(displayNote) {
    var individual = this.state.individual;

    return (
        <div className="row">
            <Input type="text" ref="individualname" label="Individual Name:" value={individual.label} handleChange={this.handleChange}
                error={this.getFormError('individualname')} clearError={this.clrFormErrors.bind(null, 'individualname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            {displayNote ?
                <p className="col-sm-7 col-sm-offset-5">Note: If there is more than one individual with IDENTICAL information, you can indicate this at the bottom of this form.</p>
            : null}
        </div>
    );
};


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
                    <Input key={i} type="text" ref={'extraindividualname' + i} label={'Individual Name ' + (i + 2)}
                        error={this.getFormError('extraindividualname' + i)} clearError={this.clrFormErrors.bind(null, 'extraindividualname' + i)}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                );
            })}
        </div>
    );
};


// Common diseases individual curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualCommonDiseases = function() {
    var individual = this.state.individual;
    var family = this.state.family;
    var group = this.state.group;
    var orphanetidVal, hpoidVal, nothpoidVal, associatedGroups, associatedFamilies;

    // If we're editing an individual, make editable values of the complex properties
    if (individual && Object.keys(individual).length) {
        orphanetidVal = individual.diagnosis ? individual.diagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join() : null;
        hpoidVal = individual.hpoIdInDiagnosis ? individual.hpoIdInDiagnosis.join() : null;
        nothpoidVal = individual.hpoIdInElimination ? individual.hpoIdInElimination.join() : null;
    }

    // Make a list of diseases from the group, either from the given group,
    // or the individual if we're editing one that has associated groups.
    if (Object.keys(group).length) {
        // We have a group, so get the disease array from it.
        associatedGroups = [group];
    } else if (individual && individual.associatedGroups && individual.associatedGroups.length) {
        // We have an individual with associated groups. Combine the diseases from all groups.
        associatedGroups = individual.associatedGroups;
    }

    // Make a list of diseases from the family, either from the given family,
    // or the individual if we're editing one that has associated families.
    if (Object.keys(family).length) {
        // We have a group, so get the disease array from it.
        associatedFamilies = [family];
    } else if (individual && individual.associatedFamilies && individual.associatedFamilies.length) {
        // We have an individual with associated groups. Combine the diseases from all groups.
        associatedFamilies = individual.associatedFamilies;
    }

    return (
        <div className="row">
            {curator.renderOrphanets(associatedGroups, 'Group')}
            {curator.renderOrphanets(associatedFamilies, 'Family')}

            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={individual.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Individual</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={individual.termsInElimination}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span><a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> Disease(s) for Individual:</span>;
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
                {this.props.not ? <span style={{color: 'red'}}>NOT </span> : ''}
                Phenotype(s) <span style={{fontWeight: 'normal'}}>(HPO ID(s); <a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="PhenExplorer home page in a new tab">PhenExplorer</a>)</span>:
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

// Demographics individual curation panel. Call with .call(this) to run in the same context
// as the calling component.
var IndividualDemographics = function() {
    var individual = this.state.individual;

    return (
        <div className="row">
            <Input type="select" ref="sex" label="Sex:" defaultValue="none" value={individual.sex}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Male</option>
                <option>Female</option>
                <option>Intersex</option>
                <option>MTF/Transwoman/Transgender Female</option>
                <option>FTM/Transman/Transgender Male</option>
                <option>Ambiguous</option>
                <option>Unknown</option>
                <option>Other</option>
            </Input>
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={individual.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={individual.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Hispanic or Latino</option>
                <option>Not Hispanic or Latino</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={individual.race}
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
            <h4 className="col-sm-7 col-sm-offset-5">Age</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agetype" label="Type:" defaultValue="none" value={individual.ageType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Onset</option>
                    <option>Report</option>
                    <option>Diagnosis</option>
                    <option>Death</option>
                </Input>
                <Input type="number" ref="agevalue" label="Value:" value={individual.ageValue} maxVal={150}
                    error={this.getFormError('agevalue')} clearError={this.clrFormErrors.bind(null, 'agevalue')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={individual.ageUnit}
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


// Only called if we have an associated family
var IndividualVariantInfo = function() {
    var individual = Object.keys(this.state.individual).length ? this.state.individual : null;
    var family = Object.keys(this.state.family).length ? this.state.family : null;
    var variants = individual && individual.variants;

    return (
        <div className="row">
            {individual && individual.proband && family ?
                <div>
                    {variants.map(function(variant, i) {
                        return (
                            <div key={i} className="variant-view-panel">
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
                </div>
            :
                <div>
                    {!family ?
                        <Input type="select" ref="proband" label="Is this Individual a proband:" value={individual && individual.proband ? "Yes" : (individual ? "No" : "none")}
                            error={this.getFormError('proband')} clearError={this.clrFormErrors.bind(null, 'proband')}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            <option>Yes</option>
                            <option>No</option>
                        </Input>
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
                                <Input type="textarea" ref={'VARothervariant' + i} label={<LabelOtherVariant />} rows="5" value={variant && variant.otherDescription} handleChange={this.handleChange} inputDisabled={this.state.variantOption[i] === VAR_SPEC}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                {(i === this.state.variantCount - 1 && this.state.variantCount < MAX_VARIANTS) ?
                                    <Input type="button" ref="addvariant" inputClassName="btn-default btn-last pull-right" title="Add another variant associated with proband"
                                        clickHandler={this.handleAddVariant} inputDisabled={this.state.addVariantDisabled} />
                                : null}
                            </div>
                        );
                    })}
                </div>
            }            
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
var IndividualAdditional = function() {
    var otherpmidsVal;
    var individual = this.state.individual;
    if (Object.keys(individual).length) {
        otherpmidsVal = individual.otherPMIDs ? individual.otherPMIDs.map(function(article) { return article.pmid; }).join() : null;
    }

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfoindividual" label="Additional Information about Individual:" rows="5" value={individual.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same family:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">
                Note: Any variants associated with the proband in this Family that were captured above will be counted as
                probands — the proband does not need to be captured at the Individual level unless there is additional
                information about the proband that you&rsquo;d like to capture (e.g. phenotype, methods). Additional information
                about other individuals in the Family may also be captured at the Individual level (including any additional
                variant information).
            </p>
        </div>
    );
};


var IndividualViewer = React.createClass({
    render: function() {
        var context = this.props.context;
        var method = context.method;
        var variants = (context.variants && context.variants.length) ? context.variants : [{}];
        var i = 0;
        var groupRenders = [];

        // Collect all families to render, as well as groups associated with these families
        var familyRenders = context.associatedFamilies.map(function(family, j) {
            groupRenders = family.associatedGroups.map(function(group) {
                return (
                    <span key={group.uuid}>
                        {i++ > 0 ? ', ' : ''}
                        {group.label}
                    </span>
                );
            });
            return (
                <span key={family.uuid}>
                    <span key={family.uuid}>
                        {j > 0 ? ', ' : ''}
                        {family.label}
                    </span>
                </span>
            );
        });

        // Collect all groups associated with these individuals directly
        var directGroupRenders = context.associatedGroups.map(function(group) {
            return (
                <span key={group.uuid}>
                    {i++ > 0 ? ', ' : ''}
                    {group.label}
                </span>
            );
        });
        groupRenders = groupRenders.concat(directGroupRenders);

        return (
            <div className="container">
                <div className="row group-curation-content">
                    <div className="viewer-titles">
                        <h1>View Individual: {context.label}</h1>
                        <h2>
                            {familyRenders.length ?
                                <div>
                                    <span>Family association: </span>
                                    {familyRenders}
                                </div>
                            : null}
                        </h2>
                        <h2>
                            {groupRenders.length ?
                                <div>
                                    <span>Group association: </span>
                                    {groupRenders}
                                </div>
                            : null}
                        </h2>
                    </div>
                    <Panel title="Common diseases &amp; phenotypes" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Orphanet Common Diagnosis</dt>
                                <dd>
                                    {context.diagnosis.map(function(disease, i) {
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

                    <Panel title="Individual — Demographics" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Sex</dt>
                                <dd>{context.sex}</dd>
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
                                <dt>Age Type</dt>
                                <dd>{context.ageType}</dd>
                            </div>

                            <div>
                                <dt>Value</dt>
                                <dd>{context.ageValue}</dd>
                            </div>

                            <div>
                                <dt>Age Unit</dt>
                                <dd>{context.ageUnit}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Individual — Methods" panelClassName="panel-data">
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
                                <dt>Specific Mutations Genotyped</dt>
                                <dd>{method ? (method.specificMutationsGenotyped === true ? 'Yes' : (method.specificMutationsGenotyped === false ? 'No' : '')) : ''}</dd>
                            </div>

                            <div>
                                <dt>Method by which Specific Mutations Genotyped</dt>
                                <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Individual — Additional Information" panelClassName="panel-data">
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

                    <Panel title="Individual - Variant Information" panelClassName="panel-data">
                        {variants.map(function(variant, i) {
                            return (
                                <div key={i} className="variant-view-panel">
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
                </div>
            </div>
        );
    }
});

globals.content_views.register(IndividualViewer, 'individual');


// Make a starter individual from the family and write it to the DB; always called from
// family curation. Pass an array of disease objects to add, as well as an array of variants.
// Returns a promise once the Individual object is written.
var makeStarterIndividual = module.exports.makeStarterIndividual = function(label, diseases, variants, context) {
    var newIndividual = {};

    newIndividual.label = label;
    newIndividual.diagnosis = diseases;
    newIndividual.variants = variants;
    newIndividual.proband = true;

    // We created an individual; post it to the DB and return a promise with the new individual
    return context.postRestData('/individuals/', newIndividual).then(data => {
        return Promise.resolve(data['@graph'][0]);
    });
};


// Update the individual with the variants, and write the updated individual to the DB.
var updateProbandVariants = module.exports.updateProbandVariants = function(individual, variants, context) {
    var updateNeeded = true;

    // Check whether the variants from the family are different from the variants in the individual
    if (individual.variants && (individual.variants.length === variants.length)) {
        // Same number of variants; see if the contents are different.
        // Need to convert individual variant array to array of variant @ids, because that's what's in the variants array.
        var missing = _.difference(variants, individual.variants.map(function(variant) { return variant['@id']; }));
        updateNeeded = !!missing.length;
    }

    if (updateNeeded) {
        var writerIndividual = curator.flatten(individual);
        writerIndividual.variants = variants;

        return context.putRestData('/individuals/' + individual.uuid, writerIndividual).then(data => {
            return Promise.resolve(data['@graph'][0]);
        });
    }
    return Promise.resolve(null);
};
