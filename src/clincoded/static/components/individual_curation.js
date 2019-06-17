'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, content_views, history_views, queryKeyValue, external_url_map, country_codes } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';
import { parsePubmed } from '../libs/parse-pubmed';
import { AddResourceId } from './add_external_resource';
import * as CuratorHistory from './curator_history';
import * as methods from './methods';
import { ScoreIndividual } from './score/individual_score';
import { ScoreViewer } from './score/viewer';
import ModalComponent from '../libs/bootstrap/modal';
import { IndividualDisease } from './disease';
import { renderVariantLabelAndTitle } from '../libs/render_variant_label_title';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const PmidDoiButtons = curator.PmidDoiButtons;
const DeleteButton = curator.DeleteButton;

const MAX_VARIANTS = 2;

const IndividualCuration = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    propTypes: {
        session: PropTypes.object,
        href: PropTypes.string
    },

    getInitialState() {
        return {
            proband_selected: null, // select proband at the form
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // Family object given in query string
            individual: null, // If we're editing an individual, this gets the fleshed-out individual object we're editing
            annotation: null, // Annotation object given in query string
            extraIndividualCount: 0, // Number of extra families to create
            extraIndividualNames: [], // Names of extra families to create
            variantCount: 0, // Number of variants loaded
            variantInfo: {}, // Extra holding info for variant display
            individualName: '', // Currently entered individual name
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            proband: null, // If we have an associated family that has a proband, this points at it
            biallelicHetOrHom: null, // Conditional rendering of denovo questions depending on proband answer for semidom
            submitBusy: false, // True while form is submitting
            recessiveZygosity: null, // Indicates which zygosity checkbox should be checked, if any
            userScoreObj: {}, // Logged-in user's score object
            diseaseObj: {},
            diseaseUuid: null,
            diseaseError: null,
            scoreError: false,
            scoreErrorMsg: ''
        };
    },

    // Called by child function props to update user score obj
    handleUserScoreObj: function(newUserScoreObj) {
        this.setState({userScoreObj: newUserScoreObj}, () => {
            if (!newUserScoreObj.hasOwnProperty('score') || (newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && newUserScoreObj.scoreExplanation)) {
                this.setState({scoreError: false, scoreErrorMsg: ''});
            }
        });
    },

    // Handle value changes in various form fields
    handleChange: function(ref, e) {
        var dbsnpid, clinvarid, hgvsterm, othervariant;

        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
            this.setState({genotyping2Disabled: this.refs[ref].getValue() === 'none'});
        } else if (ref === 'individualname') {
            this.setState({individualName: this.refs[ref].getValue()});
        } else if (ref === 'zygosityHomozygous') {
            if (this.refs[ref].toggleValue()) {
                this.setState({recessiveZygosity: 'Homozygous'});
                this.refs['zygosityHemizygous'].resetValue();
            } else {
                this.setState({recessiveZygosity: null});
            }
        } else if (ref === 'zygosityHemizygous') {
            if (this.refs[ref].toggleValue()) {
                this.setState({recessiveZygosity: 'Hemizygous'});
                this.refs['zygosityHomozygous'].resetValue();
            } else {
                this.setState({recessiveZygosity: null});
            }
        } else if (ref === 'proband' && this.refs[ref].getValue() === 'Yes') {
            this.setState({proband_selected: true});
        } else if (ref === 'proband') {
            this.setState({proband_selected: false});
        } else if (ref === 'probandIs') {
            if (this.refs[ref].getValue() === 'Biallelic homozygous' || this.refs[ref].getValue() === 'Biallelic compound heterozygous') {
                this.setState({biallelicHetOrHom: true});
            } else {
                this.setState({biallelicHetOrHom: false});
            }
        }
    },

    // Handle a click on a copy phenotype/demographics button
    handleClick: function(obj, item, e) {
        e.preventDefault(); e.stopPropagation();
        var hpoIds = '';
        var hpoElimIds = '';

        if (item === 'phenotype') {
            if (obj.hpoIdInDiagnosis && obj.hpoIdInDiagnosis.length) {
                hpoIds = obj.hpoIdInDiagnosis.map(function(hpoid, i) {
                    return (hpoid);
                }).join(', ');
                this.refs['hpoid'].setValue(hpoIds);
            }
            if (obj.termsInDiagnosis) {
                this.refs['phenoterms'].setValue(obj.termsInDiagnosis);
            }
        } else if (item === 'demographics') {
            if (obj.countryOfOrigin) {
                this.refs['country'].setValue(obj.countryOfOrigin);
            }

            if (obj.ethnicity) {
                this.refs['ethnicity'].setValue(obj.ethnicity);
            }

            if (obj.race) {
                this.refs['race'].setValue(obj.race);
            }
        } else if (item === 'notphenotype') {
            if (obj.hpoIdInElimination && obj.hpoIdInElimination.length) {
                hpoElimIds = obj.hpoIdInElimination.map(function(elimhpo, i) {
                    return (elimhpo);
                }).join(', ');
                this.refs['nothpoid'].setValue(hpoElimIds);
            }
            if (obj.termsInElimination) {
                this.refs['notphenoterms'].setValue(obj.termsInElimination);
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

                if (stateObj.individual.diagnosis && stateObj.individual.diagnosis.length > 0) {
                    this.setState({diseaseObj: stateObj.individual['diagnosis'][0]});
                }

                if (stateObj.individual.proband) {
                    // proband individual
                    this.setState({proband_selected: true});
                }
                else {
                    this.setState({proband_selected: false});
                }

                if (stateObj.individual.probandIs === 'Biallelic homozygous' || stateObj.individual.probandIs === 'Biallelic compound heterozygous') {
                    this.setState({biallelicHetOrHom: true});
                }
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            // Also see if we need to disable the Add Variant button
            if (stateObj.individual) {
                stateObj.genotyping2Disabled = !(stateObj.individual.method && stateObj.individual.method.genotypingMethods && stateObj.individual.method.genotypingMethods.length);

                stateObj.recessiveZygosity = stateObj.individual.recessiveZygosity ? stateObj.individual.recessiveZygosity : null;

                // If this individual has variants and isn't the proband in a family, handle the variant panels.
                if (stateObj.individual.variants && stateObj.individual.variants.length && !(stateObj.individual.proband && stateObj.family)) {
                    var variants = stateObj.individual.variants;
                    // This individual has variants
                    stateObj.variantCount = variants.length ? variants.length : 0;
                    stateObj.variantInfo = {};

                    // Go through each variant to determine how its form fields should be disabled.
                    for (var i = 0; i < variants.length; i++) {
                        if (variants[i].clinvarVariantId || variants[i].carId) {
                            stateObj.variantInfo[i] = {
                                'clinvarVariantId': variants[i].clinvarVariantId ? variants[i].clinvarVariantId : null,
                                'clinvarVariantTitle': variants[i].clinvarVariantTitle ? variants[i].clinvarVariantTitle : null,
                                'carId': variants[i].carId ? variants[i].carId : null,
                                'canonicalTranscriptTitle': variants[i].canonicalTranscriptTitle ? variants[i].canonicalTranscriptTitle : null,
                                'hgvsNames': variants[i].hgvsNames ? variants[i].hgvsNames : null,
                                'uuid': variants[i].uuid,
                                'associatedPathogenicities': variants[i].associatedPathogenicities && variants[i].associatedPathogenicities.length ? variants[i].associatedPathogenicities : []
                            };
                        }
                    }
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

        /**
         * 1) Make sure there is an explanation for the score selected differently from the default score
         * 2) Make sure there is a selection of the 'Confirm Case Information type' if the 'Select Status'
         *    value equals 'Score'
         */
        let newUserScoreObj = Object.keys(this.state.userScoreObj).length ? this.state.userScoreObj : {};
        if (Object.keys(newUserScoreObj).length) {
            if (newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && !newUserScoreObj.scoreExplanation) {
                this.setState({scoreError: true, scoreErrorMsg: 'A reason is required for the changed score.'});
                return false;
            }
            if (newUserScoreObj['scoreStatus'] === 'Score' && !newUserScoreObj['caseInfoType']) {
                this.setState({scoreError: true, scoreErrorMsg: 'A case information type is required for the Score status.'});
                return false;
            }
        }

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var family = this.state.family;
            let gdm = this.state.gdm;
            var currIndividual = this.state.individual;
            var newIndividual = {}; // Holds the new group object;
            var individualDiseases = [], individualArticles, individualVariants = [];
            var evidenceScores = []; // Holds new array of scores
            let individualScores = currIndividual && currIndividual.scores ? currIndividual.scores : [];
            const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
            const maxVariants = semiDom ? 3 : MAX_VARIANTS;
            // Find any pre-existing score(s) and put their '@id' values into an array
            if (individualScores.length) {
                individualScores.forEach(score => {
                    evidenceScores.push(score['@id']);
                });
            }
            var formError = false;

            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));
            let recessiveZygosity = this.state.recessiveZygosity;
            let variantUuid0 = this.getFormValue('variantUuid0'),
                variantUuid1 = this.getFormValue('variantUuid1');

            // Disease is required for proband individual
            if (this.state.proband_selected && (this.state.diseaseObj && !Object.keys(this.state.diseaseObj).length)) {
                formError = true;
                this.setState({diseaseError: 'Required for proband'}, () => {
                    this.setFormErrors('diseaseError', 'Required for proband');
                });
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
            for (var i = 0; i < maxVariants; i++) {
                // Grab the values from the variant form panel
                var variantId = this.getFormValue('variantUuid' + i);

                // Build the search string depending on what the user entered
                if (variantId) {
                    // Make a search string for these terms
                    individualVariants.push('/variants/' + variantId);
                }
            }

            if (!formError) {
                let searchStr;
                this.setState({submitBusy: true});

                /**
                 * Retrieve disease from database. If not existed, add it to the database.
                 */
                let diseaseObj = this.state.diseaseObj;
                if (Object.keys(diseaseObj).length && diseaseObj.diseaseId) {
                    searchStr = '/search?type=disease&diseaseId=' + diseaseObj.diseaseId;
                } else {
                    /**
                     * Disease is not required for a non-proband
                     */
                    searchStr = '';
                }
                this.getRestData(searchStr).then(diseaseSearch => {
                    if (Object.keys(diseaseSearch).length && diseaseSearch.hasOwnProperty('total')) {
                        let diseaseUuid;
                        if (diseaseSearch.total === 0) {
                            return this.postRestData('/diseases/', diseaseObj).then(result => {
                                let newDisease = result['@graph'][0];
                                diseaseUuid = newDisease['uuid'];
                                this.setState({diseaseUuid: diseaseUuid}, () => {
                                    individualDiseases.push(diseaseUuid);
                                    return Promise.resolve(result);
                                });
                            });
                        } else {
                            let _id = diseaseSearch['@graph'][0]['@id'];
                            diseaseUuid = _id.slice(10, -1);
                            this.setState({diseaseUuid: diseaseUuid}, () => {
                                individualDiseases.push(diseaseUuid);
                            });
                        }
                    } else {
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given disease couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setState({diseaseError: 'Error on validating disease.'});
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
                    if (currIndividual && currIndividual.proband && family) {
                        individualVariants = newVariants;
                    }

                    // No variant search strings. Go to next THEN indicating no new named variants
                    return Promise.resolve(null);
                }).then(response => {
                    /************************************************************/
                    /* Either update or create the score status object in the DB */
                    /*************************************************************/
                    if (Object.keys(newUserScoreObj).length && newUserScoreObj.scoreStatus) {
                        // Update and create score object when the score object has the scoreStatus key/value pair
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
                    } else if (Object.keys(newUserScoreObj).length && !newUserScoreObj.scoreStatus) {
                        // If an existing score object has no scoreStatus key/value pair, the user likely removed score
                        // Then delete the score entry from the score list associated with the evidence
                        if (this.state.userScoreObj.uuid) {
                            newUserScoreObj['status'] = 'deleted';
                            return this.putRestData('/evidencescore/' + this.state.userScoreObj.uuid, newUserScoreObj).then(modifiedScoreObj => {
                                evidenceScores.forEach(score => {
                                    if (score === modifiedScoreObj['@graph'][0]['@id']) {
                                        let index = evidenceScores.indexOf(score);
                                        evidenceScores.splice(index, 1);
                                    }
                                });
                                // Return the evidence score array without the deleted object
                                return Promise.resolve(evidenceScores);
                            });
                        }
                    } else {
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Make a new individual object based on form fields.
                    var newIndividual = this.createIndividual(individualDiseases, individualArticles, individualVariants, evidenceScores, hpoids, nothpoids);
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
        if (individualDiseases && individualDiseases.length) {
            newIndividual.diagnosis = individualDiseases.map(disease => { return disease; });
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
        if (value !== 'none') {
            newIndividual.countryOfOrigin = value;
        } else {
            if (newIndividual && newIndividual.countryOfOrigin) {
                delete newIndividual['countryOfOrigin'];
            }
        }

        value = this.getFormValue('ethnicity');
        if (value !== 'none') {
            newIndividual.ethnicity = value;
        } else {
            if (newIndividual && newIndividual.ethnicity) {
                delete newIndividual['ethnicity'];
            }
        }

        value = this.getFormValue('race');
        if (value !== 'none') {
            newIndividual.race = value;
        } else {
            if (newIndividual && newIndividual.race) {
                delete newIndividual['race'];
            }
        }

        value = this.getFormValue('agetype');
        newIndividual.ageType = value !== 'none' ? value : '';

        value = this.getFormValueNumber('agevalue');
        if (value) {
            newIndividual.ageValue = value;
        } else {
            if (newIndividual && newIndividual.ageValue) {
                delete newIndividual['ageValue'];
            }
        }

        value = this.getFormValue('ageunit');
        newIndividual.ageUnit = value !== 'none' ? value : '';

        // Fill in the individual fields from the Associated Variants panel
        value = this.getFormValue('probandIs');
        newIndividual.probandIs = value !== 'none' ? value : '';
        
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
            value = this.state.recessiveZygosity;
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

        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            if (!newIndividual.affiliation) {
                newIndividual.affiliation = this.props.affiliation.affiliation_id;
            }
        }

        return newIndividual;
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateVariantId: function(data, fieldNum) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        let variantCount = this.state.variantCount;
        if (data) {
            // Update the form and display values with new data
            this.refs['variantUuid' + fieldNum].setValue(data['uuid']);
            newVariantInfo[fieldNum] = {
                'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
                'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
                'carId': data.carId ? data.carId : null,
                'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
                'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
                'uuid': data.uuid,
                'associatedPathogenicities': data.associatedPathogenicities && data.associatedPathogenicities.length ? data.associatedPathogenicities : []
            };
            variantCount += 1;  // We have one more variant to show
        } else {
            // Reset the form and display values
            this.refs['variantUuid' + fieldNum].setValue('');
            delete newVariantInfo[fieldNum];
            variantCount -= 1;  // we have one less variant to show
        }
        // Set state
        this.setState({variantInfo: newVariantInfo, variantCount: variantCount});
        this.clrFormErrors('zygosityHemizygous');
        this.clrFormErrors('zygosityHomozygous');
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

    /**
     * Update the 'diseaseObj' state used to save data upon form submission
     */
    updateDiseaseObj(diseaseObj) {
        this.setState({diseaseObj: diseaseObj}, () => {
            this.clrFormErrors('diseaseError');
        });
    },

    /**
     * Clear error msg on missing disease
     */
    clearErrorInParent() {
        this.setState({diseaseError: null});
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

        // Retrieve methods data of "parent" evidence (assuming only one "parent", either a family or a group)
        var parentEvidenceMethod;
        var parentEvidenceName = '';

        if (families && families.length) {
            parentEvidenceMethod = (families[0].method && Object.keys(families[0].method).length) ? families[0].method : null;
            parentEvidenceName = 'Family';
        } else if (groups && groups.length) {
            parentEvidenceMethod = (groups[0].method && Object.keys(groups[0].method).length) ? groups[0].method : null;
            parentEvidenceName = 'Group';
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

        // Find any pre-existing scores associated with the evidence
        let evidenceScores = individual && individual.scores ? individual.scores : [];
        let variantInfo = this.state.variantInfo;

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
                                            <Panel title={LabelPanelTitle(individual, 'Disease & Phenotype(s)')} open>
                                                {IndividualCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={LabelPanelTitle(individual, 'Demographics')} open>
                                                {IndividualDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={LabelPanelTitle(individual, 'Methods')} open>
                                                {methods.render.call(this, method, 'individual', '', parentEvidenceMethod, parentEvidenceName)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={variantTitle} open>
                                                {IndividualVariantInfo.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title={LabelPanelTitle(individual, 'Additional Information')} open>
                                                {IndividualAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        {(this.state.family && this.state.proband_selected) || (!this.state.family && this.state.proband_selected) ?
                                            <div>
                                                <PanelGroup accordion>
                                                    <Panel title={LabelPanelTitle(individual, 'Score Proband')} panelClassName="proband-evidence-score" open>
                                                        <ScoreIndividual evidence={individual} modeInheritance={gdm.modeInheritance} evidenceType="Individual"
                                                            variantInfo={variantInfo} session={session} handleUserScoreObj={this.handleUserScoreObj}
                                                            scoreError={this.state.scoreError} scoreErrorMsg={this.state.scoreErrorMsg} affiliation={this.props.affiliation}
                                                            gdm={gdm} pmid={pmid ? pmid : null} />
                                                    </Panel>
                                                </PanelGroup>
                                            </div>
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

curator_page.register(IndividualCuration, 'curator_page', 'individual-curation');

/**
 * HTML labels for inputs follow.
 * @param {object} individual - Individual's data object
 * @param {string} labelText - Value of label
 */
const LabelPanelTitle = (individual, labelText) => {
    return (
        <h4>Individual<span>{individual && individual.proband ? <i className="icon icon-proband-white"></i> : null}</span> — {labelText}</h4>
    );
};

/**
 * Individual Name group curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 * @param {string} displayNote
 */
function IndividualName(displayNote) {
    let individual = this.state.individual;
    let family = this.state.family;
    let familyProbandExists = false;
    let probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
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
            <Input type="text" ref="individualname" label={<span>{probandLabel}Individual Label:</span>} handleChange={this.handleChange}
                value={individual && individual.label ? individual.label : ''}
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
}

/**
 * If the individual is being edited (we know this because there was an individual
 * UUID in the query string), then don’t present the ability to specify multiple individuals.
 */
function IndividualCount() {
    let individual = this.state.individual;

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
}

/**
 * Diseases individual curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function IndividualCommonDiseases() {
    let individual = this.state.individual;
    let family = this.state.family;
    let group = this.state.group;
    let associatedGroups, associatedFamilies;
    let probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

    // If we're editing an individual, make editable values of the complex properties
    let hpoidVal = individual && individual.hpoIdInDiagnosis ? individual.hpoIdInDiagnosis.join(', ') : '';
    let nothpoidVal = individual && individual.hpoIdInElimination ? individual.hpoIdInElimination.join(', ') : '';

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
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ? curator.renderDiseaseList(associatedGroups, 'Group') : null}
            {associatedFamilies && associatedFamilies[0].commonDiagnosis && associatedFamilies[0].commonDiagnosis.length > 0 ? curator.renderDiseaseList(associatedFamilies, 'Family') : null}
            <IndividualDisease group={associatedGroups && associatedGroups[0] ? associatedGroups[0] : null}
                family={associatedFamilies && associatedFamilies[0] ? associatedFamilies[0] : null} 
                individual={individual} gdm={this.state.gdm} session={this.props.session}
                updateDiseaseObj={this.updateDiseaseObj} clearErrorInParent={this.clearErrorInParent}
                diseaseObj={this.state.diseaseObj} error={this.state.diseaseError}
                probandLabel={probandLabel} required={this.state.proband_selected} />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'hpo', 'Group')
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'hpo', 'Family') : curator.renderPhenotype(null, 'Individual', 'hpo')
                )
            }
            <Input type="textarea" ref="hpoid" label={LabelHpoId()} rows="4" value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'ft', 'Group')
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'ft', 'Family') : curator.renderPhenotype(null, 'Individual', 'ft')
                )
            }
            <Input type="textarea" ref="phenoterms" label={LabelPhenoTerms()} rows="2"
                value={individual && individual.termsInDiagnosis ? individual.termsInDiagnosis : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                <Input type="button" ref="phenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-copy btn-last btn-sm" title="Copy Phenotype from Associated Group"
                    clickHandler={this.handleClick.bind(this, associatedGroups[0], 'phenotype')} />
                : null}
            {associatedFamilies && ((associatedFamilies[0].hpoIdInDiagnosis && associatedFamilies[0].hpoIdInDiagnosis.length) || associatedFamilies[0].termsInDiagnosis) ?
                <Input type="button" ref="phenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-copy btn-last btn-sm" title="Copy Phenotype from Associated Family"
                    clickHandler={this.handleClick.bind(this, associatedFamilies[0], 'phenotype')} />
                : null}
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Individual</em> if they are specifically noted in the paper.</p>
            {associatedGroups && ((associatedGroups[0].hpoIdInElimination && associatedGroups[0].hpoIdInElimination.length) || associatedGroups[0].termsInElimination) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'nothpo', 'Group') 
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInElimination && associatedFamilies[0].hpoIdInElimination.length) || associatedFamilies[0].termsInElimination) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'nothpo', 'Family') : null
                ) 
            }  
            <Input type="textarea" ref="nothpoid" label={LabelHpoId('not')} rows="4" value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && ((associatedGroups[0].hpoIdInElimination && associatedGroups[0].hpoIdInElimination.length) || associatedGroups[0].termsInElimination) ?
                curator.renderPhenotype(associatedGroups, 'Individual', 'notft', 'Group') 
                :
                (associatedFamilies && ((associatedFamilies[0].hpoIdInElimination && associatedFamilies[0].hpoIdInElimination.length) || associatedFamilies[0].termsInElimination) ?
                    curator.renderPhenotype(associatedFamilies, 'Individual', 'notft', 'Family') : null
                )
            }       
            <Input type="textarea" ref="notphenoterms" label={LabelPhenoTerms('not')} rows="2"
                value={individual && individual.termsInElimination ? individual.termsInElimination : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {associatedGroups && ((associatedGroups[0].hpoIdInElimination && associatedGroups[0].hpoIdInElimination.length) || associatedGroups[0].termsInElimination) ?
                <Input type="button" ref="notphenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-copy btn-last btn-sm" title="Copy NOT Phenotype from Associated Group"
                    clickHandler={this.handleClick.bind(this, associatedGroups[0], 'notphenotype')} />
                : null}
            {associatedFamilies && ((associatedFamilies[0].hpoIdInElimination && associatedFamilies[0].hpoIdInElimination.length) || associatedFamilies[0].termsInElimination) ?
                <Input type="button" ref="notphenotypecopygroup" wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-copy btn-last btn-sm" title="Copy NOT Phenotype from Associated Family"
                    clickHandler={this.handleClick.bind(this, associatedFamilies[0], 'notphenotype')} />
                : null}    
        </div>
    );
}

/**
 * HTML labels for inputs follow.
 * @param {string} bool - Value of 'not'
 */
const LabelHpoId = bool => {
    return (
        <span>
            {bool && bool === 'not' ? <span className="emphasis">NOT </span> : ''}
            Phenotype(s) <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
        </span>
    );
};

/**
 * HTML labels for inputs follow.
 * @param {string} bool - Value of 'not'
 */
const LabelPhenoTerms = bool => {
    return (
        <span>
            {bool && bool === 'not' ? <span className="emphasis">NOT </span> : ''}
            Phenotype(s) (<span className="normal">free text</span>):
        </span>
    );
};

/**
 * Demographics individual curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function IndividualDemographics() {
    let individual = this.state.individual;
    let associatedParentObj;
    let associatedParentName = '';
    let hasParentDemographics = false;

    // Retrieve associated "parent" as an array (check for family first, then group)
    if (this.state.family) {
        associatedParentObj = [this.state.family];
        associatedParentName = 'Family';
    } else if (individual && individual.associatedFamilies && individual.associatedFamilies.length) {
        associatedParentObj = individual.associatedFamilies;
        associatedParentName = 'Family';
    } else if (this.state.group) {
        associatedParentObj = [this.state.group];
        associatedParentName = 'Group';
    } else if (individual && individual.associatedGroups && individual.associatedGroups.length) {
        associatedParentObj = individual.associatedGroups;
        associatedParentName = 'Group';
    }

    // Check if associated "parent" has any demographics data
    if (associatedParentObj && (associatedParentObj[0].countryOfOrigin || associatedParentObj[0].ethnicity || associatedParentObj[0].race)) {
        hasParentDemographics = true;
    }

    return (
        <div className="row">
            <Input type="select" ref="sex" label="Sex:" defaultValue="none"
                value={individual && individual.sex ? individual.sex : 'none'}
                error={this.getFormError('sex')} clearError={this.clrFormErrors.bind(null, 'sex')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
                <option value="Intersex">Intersex</option>
                <option value="MTF/Transwoman/Transgender Female">MTF/Transwoman/Transgender Female</option>
                <option value="FTM/Transman/Transgender Male">FTM/Transman/Transgender Male</option>
                <option value="Ambiguous">Ambiguous</option>
                <option value="Other">Other</option>
            </Input>
            <div className="col-sm-7 col-sm-offset-5 sex-field-note">
                <div className="alert alert-info">Select "Unknown" for "Sex" if information not provided in publication.</div>
            </div>
            {hasParentDemographics ?
                <Input type="button" ref="copyparentdemographics" wrapperClassName="col-sm-7 col-sm-offset-5 demographics-copy"
                    inputClassName="btn-copy btn-sm" title={'Copy Demographics from Associated ' + associatedParentName}
                    clickHandler={this.handleClick.bind(this, associatedParentObj[0], 'demographics')} />
                : null}
            {hasParentDemographics ? curator.renderParentEvidence('Country of Origin Associated with ' + associatedParentName + ':', associatedParentObj[0].countryOfOrigin) : null}
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none"
                value={individual && individual.countryOfOrigin ? individual.countryOfOrigin : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            {hasParentDemographics ? curator.renderParentEvidence('Ethnicity Associated with ' + associatedParentName + ':', associatedParentObj[0].ethnicity) : null}
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none"
                value={individual && individual.ethnicity ? individual.ethnicity : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            {hasParentDemographics ? curator.renderParentEvidence('Race Associated with ' + associatedParentName + ':', associatedParentObj[0].race) : null}
            <Input type="select" ref="race" label="Race:" defaultValue="none"
                value={individual && individual.race ? individual.race : 'none'}
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
                <Input type="select" ref="agetype" label="Type:" defaultValue="none"
                    value={individual && individual.ageType ? individual.ageType : 'none'}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="number" inputClassName="integer-only" ref="agevalue" label="Value:" maxVal={150}
                    value={individual && individual.ageValue ? individual.ageValue : ''}
                    error={this.getFormError('agevalue')} clearError={this.clrFormErrors.bind(null, 'agevalue')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none"
                    value={individual && individual.ageUnit ? individual.ageUnit : 'none'}
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
}

/**
 * Only called if we have an associated family
 */
function IndividualVariantInfo() {
    let individual = this.state.individual;
    let family = this.state.family;
    let gdm = this.state.gdm;
    let annotation = this.state.annotation;
    let segregation = family && family.segregation;
    let variants = individual && individual.variants;
    let gdmUuid = gdm && gdm.uuid ? gdm.uuid : null;
    let pmidUuid = annotation && annotation.article.pmid ? annotation.article.pmid : null;
    let userUuid = gdm && gdm.submitted_by.uuid ? gdm.submitted_by.uuid : null;
    const semiDom = gdm && gdm.modeInheritance ? gdm.modeInheritance.indexOf('Semidominant') > -1 : false;
    const maxVariants = semiDom ? 3 : MAX_VARIANTS;

    return (
        <div className="row form-row-helper">
            {individual && individual.proband && family ?
                <div>
                    {segregation && segregation.probandIs ? <span><strong>Proband is: </strong>{segregation.probandIs}</span> : null}
                    <p>Variant(s) for a proband associated with a Family can only be edited through the Family page: <a href={"/family-curation/?editsc&gdm=" + gdm.uuid + "&evidence=" + annotation.uuid + "&family=" + family.uuid}>Edit {family.label}</a></p>
                    {variants.map(function(variant, i) {
                        return (
                            <div key={i} className="variant-view-panel variant-view-panel-edit">
                                <h5>Variant {i + 1}</h5>
                                <dl className="dl-horizontal">
                                    {variant.clinvarVariantId ?
                                        <div>
                                            <dt>ClinVar Variation ID</dt>
                                            <dd><a href={`${external_url_map['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`} target="_blank">{variant.clinvarVariantId}</a></dd>
                                        </div>
                                        : null}
                                    {variant.carId ?
                                        <div>
                                            <dt>ClinGen Allele Registry ID</dt>
                                            <dd><a href={`http:${external_url_map['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`} target="_blank">{variant.carId}</a></dd>
                                        </div>
                                        : null}
                                    {renderVariantLabelAndTitle(variant)}
                                    {variant.uuid ?
                                        <div>
                                            <dt className="no-label"></dt>
                                            <dd>
                                                <a href={'/variant-central/?variant=' + variant.uuid} target="_blank">View variant evidence in Variant Curation Interface</a>
                                            </dd>
                                        </div>
                                        : null}
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
                            <Input type="select" ref="individualDeNovo" label={<span>If the individual has one variant, is it <i>de novo</i><br/>OR<br/>If the individual has 2 variants, is at least one <i>de novo</i>?</span>}
                                defaultValue="none" value={individual && individual.denovo ? individual.denovo : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                            <Input type="select" ref="individualMaternityPaternityConfirmed" label={<span>If the answer to the above <i>de novo</i> question is yes, is the variant maternity and paternity confirmed?</span>}
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
                    { semiDom ?  
                        <Input type="select" label="The proband is:" ref="probandIs" handleChange={this.handleChange}
                            defaultValue="none" value={individual && individual.probandIs ? individual.probandIs : 'none'}
                            error={this.getFormError('probandIs')} clearError={this.clrFormErrors.bind(null, 'probandIs')}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required={this.state.proband_selected}>
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            <option value="Monoallelic heterozygous">Monoallelic heterozygous (e.g. autosomal)</option>
                            <option value="Hemizygous">Hemizygous (e.g. X-linked)</option>
                            <option value="Biallelic homozygous">Biallelic homozygous (e.g. the same variant is present on both alleles, autosomal or X-linked)</option>
                            <option value="Biallelic compound heterozygous">Biallelic compound heterozygous (e.g. two different variants are present on the alleles, autosomal or X-linked)</option>
                        </Input>    
                    : 
                    <div>
                        <Input type="checkbox" ref="zygosityHomozygous" label={<span>Check here if homozygous:<br /><i className="non-bold-font">(Note: if homozygous, enter only 1 variant below)</i></span>}
                            error={this.getFormError('zygosityHomozygous')} clearError={this.clrFormErrors.bind(null, 'zygosityHomozygous')}
                            handleChange={this.handleChange} defaultChecked="false" checked={this.state.recessiveZygosity == 'Homozygous'}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        </Input>
                        <Input type="checkbox" ref="zygosityHemizygous" label="Check here if hemizygous:"
                            error={this.getFormError('zygosityHemizygous')} clearError={this.clrFormErrors.bind(null, 'zygosityHemizygous')}
                            handleChange={this.handleChange} defaultChecked="false" checked={this.state.recessiveZygosity == 'Hemizygous'}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        </Input>
                    </div>}
                    {_.range(maxVariants).map(i => {
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
                                        {this.state.variantInfo[i].carId ?
                                            <div className="row">
                                                <span className="col-sm-5 control-label"><label><LabelCARVariant /></label></span>
                                                <span className="col-sm-7 text-no-input"><a href={`https:${external_url_map['CARallele']}${this.state.variantInfo[i].carId}.html`} target="_blank">{this.state.variantInfo[i].carId}</a></span>
                                            </div>
                                            : null}
                                        {renderVariantLabelAndTitle(this.state.variantInfo[i], true)}
                                        <div className="row variant-curation">
                                            <span className="col-sm-5 control-label"><label></label></span>
                                            <span className="col-sm-7 text-no-input">
                                                <a href={'/variant-central/?variant=' + this.state.variantInfo[i].uuid} target="_blank">View variant evidence in Variant Curation Interface</a>
                                            </span>
                                        </div>
                                    </div>
                                    : null}
                                <Input type="text" ref={'variantUuid' + i} value={variant && variant.uuid ? variant.uuid : ''}
                                    error={this.getFormError('variantUuid' + i)} clearError={this.clrFormErrors.bind(null, 'variantUuid' + i)}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" />
                                <div className="row">
                                    <div className="form-group">
                                        <span className="col-sm-5 control-label">{!this.state.variantInfo[i] ? <label>Add Variant:</label> : <label>Clear Variant Selection:</label>}</span>
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
                    {this.state.biallelicHetOrHom || (Object.keys(this.state.variantInfo).length > 0 && this.state.proband_selected) ?
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
                            <Input type="select" ref="individualDeNovo" label={<span>If the individual has one variant, is it <i>de novo</i><br/>OR<br/>If the individual has 2 variants, is at least one <i>de novo</i>?</span>}
                                defaultValue="none" value={individual && individual.denovo ? individual.denovo : 'none'}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </Input>
                            <Input type="select" ref="individualMaternityPaternityConfirmed" label={<span>If the answer to the above <i>de novo</i> question is yes, is the variant maternity and paternity confirmed?</span>}
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
}

const LabelClinVarVariant = () => {
    return <span><strong><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Variation ID:</strong></span>;
};

const LabelCARVariant = () => {
    return <span><strong><a href={external_url_map['CAR']} target="_blank" title="ClinGen Allele Registry in a new tab">ClinGen Allele Registry</a> ID:</strong></span>;
};

const LabelOtherVariant = () => {
    return <span>Other description when a ClinVar VariationID does not exist <span className="normal">(important: use CA ID registered with <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry</a> whenever possible)</span>:</span>;
};

/**
 * Additional Information family curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function IndividualAdditional() {
    var individual = this.state.individual;
    var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);

    // If editing an individual, get its existing articles
    let otherpmidsVal = individual && individual.otherPMIDs ? individual.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : '';

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfoindividual" label={<span>Additional Information about Individual{probandLabel}:</span>}
                rows="5" value={individual && individual.additionalInformation ? individual.additionalInformation : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label={<span>Enter PMID(s) that report evidence about this Individual{probandLabel}:</span>}
                rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

/**
 * Score Proband panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function IndividualScore() {
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
}

const IndividualViewer = createReactClass({
    // Start:: Evidence score submission hanlding for viewer
    mixins: [RestMixin],

    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object,
        href: PropTypes.string,
        affiliation: PropTypes.object
    },

    getInitialState: function() {
        return {
            gdmUuid: queryKeyValue('gdm', this.props.href),
            gdm: null,
            userScoreObj: {}, // Logged-in user's score object
            submitBusy: false, // True while form is submitting
            scoreError: false,
            scoreErrorMsg: ''
        };
    },

    componentDidMount() {
        if (this.state.gdmUuid) {
            return this.getRestData('/gdm/' + this.state.gdmUuid).then(gdm => {
                this.setState({gdm: gdm});
            }).catch(err => {
                console.log('Fetching gdm error =: %o', err);
            });
        }
    },

    // Called by child function props to update user score obj
    handleUserScoreObj: function(newUserScoreObj) {
        this.setState({userScoreObj: newUserScoreObj}, () => {
            if (!newUserScoreObj.hasOwnProperty('score') || (newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && newUserScoreObj.scoreExplanation)) {
                this.setState({scoreError: false, scoreErrorMsg: ''});
            }
        });
    },

    // Redirect to Curation-Central page
    handlePageRedirect: function() {
        let tempGdmPmid = curator.findGdmPmidFromObj(this.props.context);
        let tempGdm = tempGdmPmid[0];
        let tempPmid = tempGdmPmid[1];
        window.location.href = '/curation-central/?gdm=' + tempGdm.uuid + '&pmid=' + tempPmid;
    },

    scoreSubmit: function(e) {
        let individual = this.props.context;
        /*****************************************************/
        /* Proband score status data object                  */
        /*****************************************************/
        let newUserScoreObj = Object.keys(this.state.userScoreObj).length ? this.state.userScoreObj : {};

        /**
         * 1) Make sure there is an explanation for the score selected differently from the default score
         * 2) Make sure there is a selection of the 'Confirm Case Information type' if the 'Select Status'
         *    value equals 'Score'
         */
        if (Object.keys(newUserScoreObj).length) {
            if (newUserScoreObj.hasOwnProperty('score') && newUserScoreObj.score !== false && !newUserScoreObj.scoreExplanation) {
                this.setState({scoreError: true, scoreErrorMsg: 'A reason is required for the changed score.'});
                return false;
            }
            if (newUserScoreObj['scoreStatus'] === 'Score' && !newUserScoreObj['caseInfoType']) {
                this.setState({scoreError: true, scoreErrorMsg: 'A case information type is required for the Score status.'});
                return false;
            }
            this.setState({submitBusy: true});
            /***********************************************************/
            /* Either update or create the user score object in the DB */
            /***********************************************************/
            if (newUserScoreObj.scoreStatus) {
                // Update and create score object when the score object has the scoreStatus key/value pair
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
                        return this.getRestData('/individual/' + individual.uuid, null, true).then(freshIndividual => {
                            // flatten both context and fresh individual
                            let newIndividual = curator.flatten(individual);
                            let freshFlatIndividual = curator.flatten(freshIndividual);
                            // take only the scores from the fresh individual to not overwrite changes
                            // in newIndividual
                            newIndividual.scores = freshFlatIndividual.scores ? freshFlatIndividual.scores : [];
                            // push new score uuid to newIndividual's scores list
                            newIndividual.scores.push(newScoreObjectUuid);

                            return this.putRestData('/individual/' + individual.uuid, newIndividual).then(updatedIndividualObj => {
                                this.setState({submitBusy: false});
                                return Promise.resolve(updatedIndividualObj['@graph'][0]);
                            });
                        });
                    }).then(data => {
                        this.handlePageRedirect();
                    });
                }
            } else if (!newUserScoreObj.scoreStatus) {
                // If an existing score object has no scoreStatus key/value pair, the user likely removed score
                // Then delete the score entry from the score list associated with the evidence
                if (this.state.userScoreObj.uuid) {
                    newUserScoreObj['status'] = 'deleted';
                    return this.putRestData('/evidencescore/' + this.state.userScoreObj.uuid, newUserScoreObj).then(modifiedScoreObj => {
                        let modifiedScoreObjectUuid = null;
                        if (modifiedScoreObj) {
                            modifiedScoreObjectUuid = modifiedScoreObj['@graph'][0]['@id'];
                        }
                        return Promise.resolve(modifiedScoreObjectUuid);
                    }).then(modifiedScoreObjectUuid => {
                        return this.getRestData('/individual/' + individual.uuid, null, true).then(freshIndividual => {
                            // flatten both context and fresh individual
                            let newIndividual = curator.flatten(individual);
                            let freshFlatIndividual = curator.flatten(freshIndividual);
                            // take only the scores from the fresh individual to not overwrite changes
                            // in newIndividual
                            newIndividual.scores = freshFlatIndividual.scores ? freshFlatIndividual.scores : [];
                            // push new score uuid to newIndividual's scores list
                            if (newIndividual.scores.length) {
                                newIndividual.scores.forEach(score => {
                                    if (score === modifiedScoreObjectUuid) {
                                        let index = newIndividual.scores.indexOf(score);
                                        newIndividual.scores.splice(index, 1);
                                    }
                                });
                            }
                            return this.putRestData('/individual/' + individual.uuid, newIndividual).then(updatedIndividualObj => {
                                this.setState({submitBusy: false});
                                return Promise.resolve(updatedIndividualObj['@graph'][0]);
                            });
                        });
                    }).then(data => {
                        this.handlePageRedirect();
                    });
                }
            }
        }
    },
    // End:: Evidence score submission hanlding for viewer

    render() {
        var individual = this.props.context;
        var user = this.props.session && this.props.session.user_properties;
        var userIndividual = user && individual && individual.submitted_by && user.uuid === individual.submitted_by.uuid ? true : false;
        let affiliation = this.props.affiliation;
        let affiliatedIndividual = affiliation && Object.keys(affiliation).length && individual && individual.affiliation && affiliation.affiliation_id === individual.affiliation ? true : false;
        var method = individual.method;
        var variants = (individual.variants && individual.variants.length) ? individual.variants : [];
        var i = 0;
        var groupRenders = [];
        var probandLabel = (individual && individual.proband ? <i className="icon icon-proband"></i> : null);
        let evidenceScores = individual && individual.scores && individual.scores.length ? individual.scores : [];
        let isEvidenceScored = false;
        if (evidenceScores.length) {
            evidenceScores.map(scoreObj => {
                if (scoreObj.scoreStatus && scoreObj.scoreStatus.match(/Score|Review|Contradicts/ig)) {
                    isEvidenceScored = true;
                }
            });
        }
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
        var probandIs = individual && individual.probandIs;

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
                        <Panel title={LabelPanelTitleView(individual, 'Disease & Phenotype(s)')} panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Common Diagnosis</dt>
                                    <dd>{individual.diagnosis && individual.diagnosis.map(function(disease, i) {
                                        return <span key={disease.diseaseId}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank">{disease.diseaseId.replace('_', ':')}</a> : null}</span>;
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

                        <Panel title={LabelPanelTitleView(individual, 'Demographics')} panelClassName="panel-data">
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

                        <Panel title={LabelPanelTitleView(individual, 'Methods')} panelClassName="panel-data">
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

                                {method && (method.entireGeneSequenced === true || method.entireGeneSequenced === false) ?
                                    <div>
                                        <dt>Entire gene sequenced</dt>
                                        <dd>{method.entireGeneSequenced === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                {method && (method.copyNumberAssessed === true || method.copyNumberAssessed === false) ?
                                    <div>
                                        <dt>Copy number assessed</dt>
                                        <dd>{method.copyNumberAssessed === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                {method && (method.specificMutationsGenotyped === true || method.specificMutationsGenotyped === false) ?
                                    <div>
                                        <dt>Specific mutations genotyped</dt>
                                        <dd>{method.specificMutationsGenotyped === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                <div>
                                    <dt>Description of genotyping method</dt>
                                    <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                                </div>
                            </dl>
                        </Panel>
                        <Panel title={LabelPanelTitleView(individual, '', true)} panelClassName="panel-data">
                            {probandIs 
                                ? <div>
                                    <dl className="dl-horizontal">
                                        <dt>The proband is</dt>
                                        <dd>{probandIs}</dd>
                                    </dl>
                                </div>
                                :
                                <div>
                                    <dl className="dl-horizontal">
                                        <dt>Zygosity</dt>
                                        <dd>{individual && individual.recessiveZygosity ? individual.recessiveZygosity : "None selected"}</dd>
                                    </dl>
                                </div>
                            }   
                            {variants.map(function(variant, i) {
                                return (
                                    <div key={i} className="variant-view-panel">
                                        <h5>Variant {i + 1}</h5>
                                        {variant.clinvarVariantId ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinVar VariationID</dt>
                                                    <dd><a href={`${external_url_map['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`} target="_blank">{variant.clinvarVariantId}</a></dd>
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
                                        {renderVariantLabelAndTitle(variant)}
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
                            {variants && variants.length && individual.proband ?
                                <div className="variant-view-panel family-associated">
                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If there are 2 variants described, are they both located in <i>trans</i> with respect to one another?</dt>
                                            <dd>{individual.bothVariantsInTrans}</dd>
                                        </dl>
                                    </div>

                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If the individual has one variant, is it <i>de novo</i> OR If the individual has 2 variants, is at least one <i>de novo</i>?</dt>
                                            <dd>{individual.denovo}</dd>
                                        </dl>
                                    </div>

                                    <div>
                                        <dl className="dl-horizontal">
                                            <dt>If the answer to the above <i>de novo</i> question is yes, is the variant maternity and paternity confirmed?</dt>
                                            <dd>{individual.maternityPaternityConfirmed}</dd>
                                        </dl>
                                    </div>
                                </div>
                                : null}
                        </Panel>

                        <Panel title={LabelPanelTitleView(individual, 'Additional Information')} panelClassName="panel-data">
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
                            <div>
                                <Panel title={LabelPanelTitleView(individual, 'Other Curator Scores')} panelClassName="panel-data">
                                    <ScoreViewer evidence={individual} otherScores={true} session={this.props.session} affiliation={affiliation} />
                                </Panel>
                                <Panel title={LabelPanelTitleView(individual, 'Score Proband')} panelClassName="proband-evidence-score-viewer" open>
                                    {isEvidenceScored || (!isEvidenceScored && affiliation && affiliatedIndividual) || (!isEvidenceScored && !affiliation && userIndividual) ?
                                        <ScoreIndividual evidence={individual} modeInheritance={tempGdm? tempGdm.modeInheritance : null} evidenceType="Individual"
                                            session={this.props.session} handleUserScoreObj={this.handleUserScoreObj} scoreSubmit={this.scoreSubmit}
                                            scoreError={this.state.scoreError} scoreErrorMsg={this.state.scoreErrorMsg} affiliation={affiliation}
                                            variantInfo={variants} gdm={this.state.gdm} pmid={tempPmid ? tempPmid : null} />
                                        : null}
                                    {!isEvidenceScored && ((affiliation && !affiliatedIndividual) || (!affiliation && !userIndividual)) ?
                                        <div className="row">
                                            <p className="alert alert-warning creator-score-status-note">The creator of this evidence has not yet scored it; once the creator has scored it, the option to score will appear here.</p>
                                        </div>
                                        : null}
                                </Panel>
                            </div>
                            : null}
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(IndividualViewer, 'individual');

/**
 * HTML labels for inputs follow.
 * @param {object} individual - Individual's data object
 * @param {string} labelText - Value of label
 * @param {boolean} hasVariant - Flag for associated variant
 */
const LabelPanelTitleView = (individual, labelText, hasVariant) => {
    if (hasVariant) {
        labelText = (individual && individual.associatedFamilies.length && individual.proband) ?
            'Variant(s) segregating with Proband' :
            'Associated Variant(s)';
    }

    return (
        <h4>
            <span className="panel-title-std">
                Individual{<span>{individual && individual.proband ? <i className="icon icon-proband"></i> : null}</span>} — {labelText}
            </span>
        </h4>
    );
};

/**
 * Make a starter individual from the family and write it to the DB; always called from
 * family curation. Pass an array of disease objects to add, as well as an array of variants.
 * Returns a promise once the Individual object is written.
 * @param {string} label 
 * @param {object} diseases 
 * @param {object} variants 
 * @param {object} zygosity 
 * @param {object} context 
 */
export function makeStarterIndividual(label, diseases, variants, zygosity, affiliation, context) {
    let newIndividual = {};
    newIndividual.label = label;
    newIndividual.diagnosis = diseases;
    newIndividual.proband = true;
    if (variants) {
        // It's possible to create a proband w/o variants at the moment
        newIndividual.variants = variants;
    }
    if (zygosity) newIndividual.recessiveZygosity = zygosity;
    if (affiliation) newIndividual.affiliation = affiliation.affiliation_id;
    const newMethod = {dateTime: moment().format()};
    newIndividual.method = newMethod;

    // We created an individual; post it to the DB and return a promise with the new individual
    return context.postRestData('/individuals/', newIndividual).then(data => {
        return Promise.resolve(data['@graph'][0]);
    });
}

/**
 * Update the individual with the variants, and write the updated individual to the DB.
 * @param {object} individual 
 * @param {object} variants 
 * @param {object} zygosity 
 * @param {object} context 
 */
export function updateProbandVariants(individual, variants, zygosity, context) {
    let updateNeeded = true;

    // Check whether the variants from the family are different from the variants in the individual
    if (individual.variants && (individual.variants.length === variants.length)) {
        // Same number of variants; see if the contents are different.
        // Need to convert individual variant array to array of variant @ids, because that's what's in the variants array.
        var missing = _.difference(variants, individual.variants.map(function(variant) { return variant['@id']; }));
        updateNeeded = !!missing.length;
    } else if ((individual.variants && individual.variants.length !== variants.length)
        || (!individual.variants && individual.variants && individual.variants.length > 0)) {
        // Update individual's variant object if the number of variants do not match
        updateNeeded = true;
    }

    /***********************************************************/
    /* Update individual's recessiveZygosity property if:      */
    /* The passed argument is different from the strored value */
    /***********************************************************/
    let tempZygosity = zygosity ? zygosity : null;
    let tempIndivZygosity = individual.recessiveZygosity ? individual.recessiveZygosity : null;
    if (tempZygosity !== tempIndivZygosity) {
        updateNeeded = true;
    }

    if (updateNeeded) {
        let writerIndividual = curator.flatten(individual);
        let updatedScores = [];
        // manage variants variable in individual object
        if (!variants || (variants && variants.length === 0)) {
            // if all variants are removed, prepare evidenceScore objects so their
            // status can be set to 'deleted'
            if (individual.scores && individual.scores.length) {
                individual.scores.map(score => {
                    let flatScore = curator.flatten(score);
                    flatScore.status = 'deleted';
                    updatedScores.push(context.putRestData(score['@id'] + '?render=false', flatScore));
                });
            }
            // delete relevant fields from updated individual object
            delete writerIndividual['variants'];
            delete writerIndividual['scores'];
        } else {
            writerIndividual.variants = variants;
        }
        // manage zygosity variable in individual object
        if (zygosity) {
            writerIndividual.recessiveZygosity = zygosity;
        } else {
            delete writerIndividual['recessiveZygosity'];
        }

        return context.putRestData('/individuals/' + individual.uuid, writerIndividual).then(data => {
            // update any evidenceScore objects, if any
            return Promise.all(updatedScores);
        });
    }
    return Promise.resolve(null);
}

export function recordIndividualHistory(gdm, annotation, individual, group, family, modified, context) {
    // Add to the user history. data.individual always contains the new or edited individual. data.group contains the group the individual was
    // added to, if it was added to a group. data.annotation contains the annotation the individual was added to, if it was added to
    // the annotation, and data.family contains the family the individual was added to, if it was added to a family. If none of data.group,
    // data.family, nor data.annotation exist, data.individual holds the existing individual that was modified.
    let meta, historyPromise;

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
}

/**
 * Display a history item for adding an individual
 */
class IndividualAddHistory extends Component {
    render() {
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
}

history_views.register(IndividualAddHistory, 'individual', 'add');

/**
 * Display a history item for modifying an individual
 */
class IndividualModifyHistory extends Component {
    render() {
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
}

history_views.register(IndividualModifyHistory, 'individual', 'modify');

/**
 * Display a history item for deleting an individual
 */
class IndividualDeleteHistory extends Component {
    render() {
        var history = this.props.history;
        var individual = history.primary;

        return (
            <div>
                <span>Individual {individual.label} deleted</span>
                <span>; {moment(history.last_modified).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(IndividualDeleteHistory, 'individual', 'delete');
