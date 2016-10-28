'use strict';

import React, {PropTypes} from 'react';
import url from 'url';
import _ from 'underscore';
import moment from 'moment';

import * as curator from './curator';
import * as methods from './methods';
import * as CaseControlEvalScore from './case_control/evaluation_score';
import * as CuratorHistory from './curator_history';

import { RestMixin } from './rest';
import { queryKeyValue, country_codes, external_url_map, curator_page } from './globals';
import { Form, FormMixin, Input, InputMixin } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parsePubmed } from '../libs/parse-pubmed';

const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const DeleteButton = curator.DeleteButton;
const PmidDoiButtons = curator.PmidDoiButtons;

const CaseControlCuration = React.createClass({
    contextTypes: {
        navigate: React.PropTypes.func
    },

    mixins: [
        FormMixin, RestMixin, CurationMixin, CuratorHistory
    ],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            caseControl: null,
            caseControlUuid: null,
            evidenceScore: null,
            evidenceScoreUuid: null,
            caseGroup: null,
            caseGroupUuid: null,
            controlGroup: null,
            controlGroupUuid: null,
            caseControlName: null,
            caseGroupName: null,
            controlGroupName: null,
            group: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            groupName: '', // Currently entered name of the group
            caseCohort_genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            controlCohort_genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            statisticOtherType: 'collapsed',
            submitBusy: false // True while form is submitting
        };
    },

    // After the Group Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        this.loadData();
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData() {

        let caseControlUuid = this.queryValues.caseControlUuid ? this.queryValues.caseControlUuid : queryKeyValue('casecontrol', this.props.href);
        let evidenceScoreUuid = this.queryValues.evidenceScoreUuid ? this.queryValues.evidenceScoreUuid : queryKeyValue('evidencescore', this.props.href);
        let caseGroupUuid = this.queryValues.caseGroupUuid ? this.queryValues.caseGroupUuid : queryKeyValue('casecohort', this.props.href);
        let controlGroupUuid = this.queryValues.controlGroupUuid ? this.queryValues.controlGroupUuid : queryKeyValue('controlcohort', this.props.href);
        let gdmUuid = this.queryValues.gdmUuid;
        let annotationUuid = this.queryValues.annotationUuid;


        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        let uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            caseGroupUuid ? '/groups/' + caseGroupUuid : '',
            controlGroupUuid ? '/groups/' + controlGroupUuid : '',
            annotationUuid ? '/evidence/' + annotationUuid : '',
            caseControlUuid ? '/casecontrol/' + caseControlUuid : '',
            evidenceScoreUuid ? '/evidencescore/' + evidenceScoreUuid : ''
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
                        if (data['groupType'][0] === 'Case cohort') {
                            stateObj.caseGroup = data;
                        }
                        if (data['groupType'][0] === 'Control cohort') {
                            stateObj.controlGroup = data;
                        }
                        break;

                    case 'annotation':
                        stateObj.annotation = data;
                        break;

                    case 'caseControl':
                        stateObj.caseControl = data;
                        break;

                    case 'evidenceScore':
                        stateObj.evidenceScore = data;
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
            if (stateObj.caseGroup) {
                stateObj.caseCohort_genotyping2Disabled = !(stateObj.caseGroup.method && stateObj.caseGroup.method.genotypingMethods && stateObj.caseGroup.method.genotypingMethods.length);
                this.setState({caseGroupName: stateObj.caseGroup.label});
            }
            if (stateObj.controlGroup) {
                stateObj.controlCohort_genotyping2Disabled = !(stateObj.controlGroup.method && stateObj.controlGroup.method.genotypingMethods && stateObj.controlGroup.method.genotypingMethods.length);
                this.setState({controlGroupName: stateObj.controlGroup.label});
            }
            if (stateObj.caseControl) {
                this.setState({caseControlName: stateObj.caseControl.label});
            }

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No one’s waiting but the user; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // Handle value changes in genotyping method 1 and evaluation-score statistic value type
    handleChange(ref, e) {
        if (ref === 'caseCohort_genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({caseCohort_genotyping2Disabled: false});
        }
        if (ref === 'controlCohort_genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({controlCohort_genotyping2Disabled: false});
        }
        if (ref === 'caseControlName') {
            this.setState({caseControlName: this.refs[ref].getValue()});
        }
        if (ref === 'caseCohort_groupName') {
            this.setState({caseGroupName: this.refs[ref].getValue()});
        }
        if (ref === 'controlCohort_groupName') {
            this.setState({controlGroupName: this.refs[ref].getValue()});
        }
        if (ref === 'statisticVauleType') {
            this.refs[ref].getValue() === 'Other' ? this.setState({statisticOtherType: 'expanded'}) : this.setState({statisticOtherType: 'collapsed'});
        }
    },

    submitForm(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            let groupDiseases, caseCohort_groupGenes, caseCohort_groupArticles;
            let controlCohort_groupGenes, controlCohort_groupArticles;
            let savedCaseControl;
            let formError = false;

            /***********************************************************************/
            /* Prepare data objects, either from pre-existing data or from scratch */
            /***********************************************************************/
            let newCaseControl = this.state.caseControl ? curator.flatten(this.state.caseControl) : {};
            let newCaseGroup = this.state.caseGroup ? curator.flatten(this.state.caseGroup) : {};
            let newControlGroup = this.state.controlGroup ? curator.flatten(this.state.controlGroup) : {};
            let newEvidenceScore = this.state.evidenceScore ? curator.flatten(this.state.evidenceScore) : {};

            // Parse comma-separated list fields
            /**********************************/
            /* Only applicable to Case Cohort */
            /**********************************/
            let orphaIds = curator.capture.orphas(this.getFormValue('caseCohort_orphanetId'));
            let hpoids = curator.capture.hpoids(this.getFormValue('caseCohort_hpoId'));
            let hpotext = curator.capture.hpoids(this.getFormValue('caseCohort_phenoTerms'));
            let nothpoids = curator.capture.hpoids(this.getFormValue('caseCohort_nothpoId'));

            let valid_orphaId = false,
                valid_phoId = false;

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (orphaIds && orphaIds.length && _(orphaIds).any(function(id) { return id === null; })) {
                // ORPHA list is bad
                formError = true;
                this.setFormErrors('caseCohort_orphanetId', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
            } else if (orphaIds && orphaIds.length && !_(orphaIds).any(function(id) { return id === null; })) {
                valid_orphaId = true;
            }

            // Check HPO ID format
            if (hpoids && hpoids.length && _(hpoids).any(function(id) { return id === null; })) {
                // HPOID list is bad
                formError = true;
                this.setFormErrors('caseCohort_hpoId', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            } else if (hpoids && hpoids.length && !_(hpoids).any(function(id) { return id === null; })) {
                valid_phoId = true;
            }

            // Check Orphanet ID, HPO ID and HPO text
            if (!formError && !valid_orphaId && !valid_phoId && (!hpotext || !hpotext.length)) {
                // Can not empty at all of them
                formError = true;
                this.setFormErrors('caseCohort_orphanetId', 'Enter Orphanet ID(s) and/or HPO Id(s) and/or Phenotype free text.');
                this.setFormErrors('caseCohort_hpoId', 'Enter Orphanet ID(s) and/or HPO Id(s) and/or Phenotype free text.');
                this.setFormErrors('caseCohort_phenoTerms', 'Enter Orphanet ID(s) and/or HPO Id(s) and/or Phenotype free text.');
            }

            // Check 'NOT Phenotype(s)' HPO ID format
            if (nothpoids && nothpoids.length && _(nothpoids).any(function(id) { return id === null; })) {
                // NOT HPOID list is bad
                formError = true;
                this.setFormErrors('caseCohort_nothpoId', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            /*****************************************************/
            /* Applicable to both Case Cohort and Control Cohort */
            /*****************************************************/
            let caseCohort_geneSymbols = curator.capture.genes(this.getFormValue('caseCohort_otherGeneVariants')),
                controlCohort_geneSymbols = curator.capture.genes(this.getFormValue('controlCohort_otherGeneVariants'));
            let caseCohort_pmids = curator.capture.pmids(this.getFormValue('caseCohort_otherPmids')),
                controlCohort_pmids = curator.capture.pmids(this.getFormValue('controlCohort_otherPmids'));

            // Check that all gene symbols (both Case Cohort and Control Cohort) have the proper format (will check for existence later)
            if (caseCohort_geneSymbols && caseCohort_geneSymbols.length && _(caseCohort_geneSymbols).any(function(id) { return id === null; })) {
                // Gene symbol list is bad
                formError = true;
                this.setFormErrors('caseCohort_otherGeneVariants', 'Use gene symbols (e.g. SMAD3) separated by commas');
            }
            if (controlCohort_geneSymbols && controlCohort_geneSymbols.length && _(controlCohort_geneSymbols).any(function(id) { return id === null; })) {
                // Gene symbol list is bad
                formError = true;
                this.setFormErrors('controlCohort_otherGeneVariants', 'Use gene symbols (e.g. SMAD3) separated by commas');
            }

            // Check that all pmids (both Case Cohort and Control Cohort) have the proper format (will check for existence later)
            if (caseCohort_pmids && caseCohort_pmids.length && _(caseCohort_pmids).any(function(id) { return id === null; })) {
                // PMID list is bad
                formError = true;
                this.setFormErrors('caseCohort_otherPmids', 'Use PubMed IDs (e.g. 12345678) separated by commas');
            }
            if (controlCohort_pmids && controlCohort_pmids.length && _(controlCohort_pmids).any(function(id) { return id === null; })) {
                // PMID list is bad
                formError = true;
                this.setFormErrors('controlCohort_otherPmids', 'Use PubMed IDs (e.g. 12345678) separated by commas');
            }

            /*****************************************************/
            /* 1) Validate disease(s) given the Orphanet IDs     */
            /* 2) 'then' #1 returning gene data by symbols       */
            /* 3) 'then' #2 returning articles by pmids          */
            /* 4) 'then' #3 get Group object property values     */
            /*    and put/post the data object to 'groups'       */
            /*****************************************************/
            if (!formError) {
                // Build search string from given ORPHA IDs
                var searchStr;
                if (valid_orphaId) {
                    searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');
                }
                else {
                    searchStr = '';
                }
                this.setState({submitBusy: true});

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (valid_orphaId) {
                        if (diseases['@graph'].length === orphaIds.length) {
                            // Successfully retrieved all diseases
                            groupDiseases = diseases;
                            return Promise.resolve(diseases);
                        } else {
                            // Get array of missing Orphanet IDs
                            this.setState({submitBusy: false}); // submit error; re-enable submit button
                            var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                            this.setFormErrors('caseCohort_orphanetId', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                            throw diseases;
                        }
                    }
                    else {
                        // when no Orphanet id entered.
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setFormErrors('caseCohort_orphanetId', 'The given diseases not found');
                    throw e;
                }).then(diseases => {
                    if (caseCohort_geneSymbols && caseCohort_geneSymbols.length) {
                        // At least one gene symbol entered; search the DB for them.
                        searchStr = '/search/?type=gene&' + caseCohort_geneSymbols.map(function(symbol) { return 'symbol=' + symbol; }).join('&');
                        return this.getRestData(searchStr).then(genes => {
                            if (genes['@graph'].length === caseCohort_geneSymbols.length) {
                                // Successfully retrieved all genes
                                caseCohort_groupGenes = genes;
                                return Promise.resolve(genes);
                            } else {
                                this.setState({submitBusy: false}); // submit error; re-enable submit button
                                var missingGenes = _.difference(caseCohort_geneSymbols, genes['@graph'].map(function(gene) { return gene.symbol; }));
                                this.setFormErrors('caseCohort_otherGeneVariants', missingGenes.join(', ') + ' not found');
                                throw genes;
                            }
                        });
                    } else {
                        // No genes entered; just pass null to the next then
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (caseCohort_pmids && caseCohort_pmids.length) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + caseCohort_pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === caseCohort_pmids.length) {
                                // Successfully retrieved all PMIDs, so just set groupArticles and return
                                caseCohort_groupArticles = articles;
                                return Promise.resolve(articles);
                            } else {
                                // some PMIDs were not in our db already
                                // generate list of PMIDs and pubmed URLs for those PMIDs
                                var missingPmids = _.difference(caseCohort_pmids, articles['@graph'].map(function(article) { return article.pmid; }));
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
                                        this.setFormErrors('caseCohort_otherPmids', 'PMID(s) ' + invalidPmids.join(', ') + ' not found');
                                        throw invalidPmids;
                                    }
                                    // otherwise, post the valid PMIDs
                                    if (newArticles.length > 0) {
                                        return this.postRestDatas('/articles', newArticles).then(data => {
                                            for (var dataIndex = 0; dataIndex < data.length; dataIndex++) {
                                                articles['@graph'].push(data[dataIndex]['@graph'][0]);
                                            }
                                            caseCohort_groupArticles = articles;
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
                    let prefix = 'caseCohort_';

                    /*****************************************************/
                    /* Set Group Type                                    */
                    /*****************************************************/
                    newCaseGroup.groupType = ['Case cohort'];

                    /*****************************************************/
                    /* Group Label form field                            */
                    /* Get input value for group property                */
                    /*****************************************************/
                    newCaseGroup.label = this.getFormValue(prefix + 'groupName');

                    /*****************************************************/
                    /* Group Method form fields                          */
                    /* Get input values for group properties             */
                    /* If a method object was created (at least          */
                    /* one method field set), get its new object's       */
                    /*****************************************************/
                    var newMethod = methods.create.call(this, prefix);
                    if (newMethod) {
                        newCaseGroup.method = newMethod;
                    }

                    /*****************************************************/
                    /* Group Common Diseases & Phenotypes form fields    */
                    /* Get input values for group properties             */
                    /*****************************************************/
                    // Get an array of all given disease IDs
                    if (groupDiseases) {
                        newCaseGroup.commonDiagnosis = groupDiseases['@graph'].map(function(disease) { return disease['@id']; });
                    } else {
                        delete newCaseGroup.commonDiagnosis;
                    }
                    if (hpoids && hpoids.length) {
                        newCaseGroup.hpoIdInDiagnosis = hpoids;
                    } else if (newCaseGroup.hpoIdInDiagnosis) {
                        delete newCaseGroup.hpoIdInDiagnosis;
                    }
                    var phenoterms = this.getFormValue(prefix + 'phenoTerms');
                    if (phenoterms) {
                        newCaseGroup.termsInDiagnosis = phenoterms;
                    } else if (newCaseGroup.termsInDiagnosis) {
                        delete newCaseGroup.termsInDiagnosis;
                    }
                    if (nothpoids && nothpoids.length) {
                        newCaseGroup.hpoIdInElimination = nothpoids;
                    }
                    phenoterms = this.getFormValue(prefix + 'notphenoTerms');
                    if (phenoterms) {
                        newCaseGroup.termsInElimination = phenoterms;
                    }

                    /*****************************************************/
                    /* Group Demographics form fields                    */
                    /* Get input values for group properties             */
                    /*****************************************************/
                    var value = this.getFormValue(prefix + 'maleCount');
                    if (value) {
                        newCaseGroup.numberOfMale = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'femaleCount');
                    if (value) {
                        newCaseGroup.numberOfFemale = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'country');
                    if (value !== 'none') {
                        newCaseGroup.countryOfOrigin = value;
                    }
                    value = this.getFormValue(prefix + 'ethnicity');
                    if (value !== 'none') {
                        newCaseGroup.ethnicity = value;
                    }
                    value = this.getFormValue(prefix + 'race');
                    if (value !== 'none') {
                        newCaseGroup.race = value;
                    }
                    value = this.getFormValue(prefix + 'ageRangeType');
                    if (value !== 'none') {
                        newCaseGroup.ageRangeType = value + '';
                    }
                    value = this.getFormValue(prefix + 'ageFrom');
                    if (value) {
                        newCaseGroup.ageRangeFrom = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'ageTo');
                    if (value) {
                        newCaseGroup.ageRangeTo = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'ageUnit');
                    if (value !== 'none') {
                        newCaseGroup.ageRangeUnit = value;
                    }

                    /*****************************************************/
                    /* Group Additional Information form fields          */
                    /* Get input values for group properties             */
                    /*****************************************************/
                    // newGroup.totalNumberIndividuals = parseInt(this.getFormValue('indcount'), 10); /* Not needed in Case-Control */
                    if (this.getFormValue(prefix + 'indFamilyCount')) newCaseGroup.numberOfIndividualsWithFamilyInformation = parseInt(this.getFormValue(prefix + 'indFamilyCount'), 10);
                    // if (this.getFormValue('notindfamilycount')) newGroup.numberOfIndividualsWithoutFamilyInformation = parseInt(this.getFormValue('notindfamilycount'), 10);
                    // if (this.getFormValue(prefix + 'otherGeneVariants')) newCaseGroup.numberOfIndividualsWithVariantInCuratedGene = parseInt(this.getFormValue(prefix + 'otherGeneVariants'), 10);
                    // if (this.getFormValue('notindvariantgenecount')) newGroup.numberOfIndividualsWithoutVariantInCuratedGene = parseInt(this.getFormValue('notindvariantgenecount'), 10);
                    if (this.getFormValue(prefix + 'indVariantOtherCount')) newCaseGroup.numberOfIndividualsWithVariantInOtherGene = parseInt(this.getFormValue(prefix + 'indVariantOtherCount'), 10);

                    // Add array of 'Other genes found to have variants in them'
                    if (caseCohort_groupGenes) {
                        newCaseGroup.otherGenes = caseCohort_groupGenes['@graph'].map(function(article) { return article['@id']; });
                    }

                    // Add array of other PMIDs
                    if (caseCohort_groupArticles) {
                        newCaseGroup.otherPMIDs = caseCohort_groupArticles['@graph'].map(function(article) { return article['@id']; });
                    }

                    value = this.getFormValue(prefix + 'additionalInfoGroup');
                    if (value) {
                        newCaseGroup.additionalInformation = value;
                    }

                    /*****************************************************/
                    /* Group Power form fields                           */
                    /* Get input values for group properties             */
                    /* Case/Control Allele Frequency is calculated       */
                    /*****************************************************/
                    if (this.getFormValue(prefix + 'numGroupVariant')) newCaseGroup.numberWithVariant = parseInt(this.getFormValue(prefix + 'numGroupVariant'), 10);
                    if (this.getFormValue(prefix + 'numGroupGenotyped')) newCaseGroup.numberAllGenotypedSequenced = parseInt(this.getFormValue(prefix + 'numGroupGenotyped'), 10);
                    if (this.getFormValue(prefix + 'calcAlleleFreq')) newCaseGroup.alleleFrequency = parseFloat(this.getFormValue(prefix + 'calcAlleleFreq'));

                    /******************************************************/
                    /* Either update or create the group object in the DB */
                    /******************************************************/
                    if (this.state.caseGroup) {
                        // We're editing a group. PUT the new group object to the DB to update the existing one.
                        return this.putRestData('/groups/' + this.state.caseGroup.uuid, newCaseGroup).then(data => {
                            this.setState({caseGroupUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        // We created a group; post it to the DB
                        return this.postRestData('/groups/', newCaseGroup).then(data => {
                            this.setState({caseGroupUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }).then(newCaseCohort => {
                    let prefix = 'controlCohort_';

                    /*****************************************************/
                    /* Set Group Type                                    */
                    /*****************************************************/
                    newControlGroup.groupType = ['Control cohort'];

                    /*****************************************************/
                    /* Group Label form field                            */
                    /* Get input value for group property                */
                    /*****************************************************/
                    newControlGroup.label = this.getFormValue(prefix + 'groupName');

                    /*****************************************************/
                    /* Group Method form fields                          */
                    /* Get input values for group properties             */
                    /* If a method object was created (at least          */
                    /* one method field set), get its new object's       */
                    /*****************************************************/
                    var newMethod = methods.create.call(this, prefix);
                    if (newMethod) {
                        newControlGroup.method = newMethod;
                    }

                    /*****************************************************/
                    /* Group Demographics form fields                    */
                    /* Get input values for group properties             */
                    /*****************************************************/
                    var value = this.getFormValue(prefix + 'maleCount');
                    if (value) {
                        newControlGroup.numberOfMale = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'femaleCount');
                    if (value) {
                        newControlGroup.numberOfFemale = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'country');
                    if (value !== 'none') {
                        newControlGroup.countryOfOrigin = value;
                    }
                    value = this.getFormValue(prefix + 'ethnicity');
                    if (value !== 'none') {
                        newControlGroup.ethnicity = value;
                    }
                    value = this.getFormValue(prefix + 'race');
                    if (value !== 'none') {
                        newControlGroup.race = value;
                    }
                    value = this.getFormValue(prefix + 'ageRangeType');
                    if (value !== 'none') {
                        newControlGroup.ageRangeType = value + '';
                    }
                    value = this.getFormValue(prefix + 'ageFrom');
                    if (value) {
                        newControlGroup.ageRangeFrom = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'ageTo');
                    if (value) {
                        newControlGroup.ageRangeTo = parseInt(value, 10);
                    }
                    value = this.getFormValue(prefix + 'ageUnit');
                    if (value !== 'none') {
                        newControlGroup.ageRangeUnit = value;
                    }

                    /*****************************************************/
                    /* Group Additional Information form fields          */
                    /* Get input values for group properties             */
                    /*****************************************************/
                    if (this.getFormValue(prefix + 'indFamilyCount')) newControlGroup.numberOfIndividualsWithFamilyInformation = parseInt(this.getFormValue(prefix + 'indFamilyCount'), 10);
                    if (this.getFormValue(prefix + 'indVariantOtherCount')) newControlGroup.numberOfIndividualsWithVariantInOtherGene = parseInt(this.getFormValue(prefix + 'indVariantOtherCount'), 10);

                    // Add array of 'Other genes found to have variants in them'
                    if (controlCohort_groupGenes) {
                        newControlGroup.otherGenes = controlCohort_groupGenes['@graph'].map(function(article) { return article['@id']; });
                    }

                    // Add array of other PMIDs
                    if (controlCohort_groupArticles) {
                        newControlGroup.otherPMIDs = controlCohort_groupArticles['@graph'].map(function(article) { return article['@id']; });
                    }

                    value = this.getFormValue(prefix + 'additionalInfoGroup');
                    if (value) {
                        newCaseGroup.additionalInformation = value;
                    }

                    /*****************************************************/
                    /* Group Power form fields                           */
                    /* Get input values for group properties             */
                    /* Case/Control Allele Frequency is calculated       */
                    /*****************************************************/
                    if (this.getFormValue(prefix + 'numGroupVariant')) newControlGroup.numberWithVariant = parseInt(this.getFormValue(prefix + 'numGroupVariant'), 10);
                    if (this.getFormValue(prefix + 'numGroupGenotyped')) newControlGroup.numberAllGenotypedSequenced = parseInt(this.getFormValue(prefix + 'numGroupGenotyped'), 10);
                    if (this.getFormValue(prefix + 'calcAlleleFreq')) newControlGroup.alleleFrequency = parseFloat(this.getFormValue(prefix + 'calcAlleleFreq'));

                    /******************************************************/
                    /* Either update or create the group object in the DB */
                    /******************************************************/
                    if (this.state.controlGroup) {
                        // We're editing a group. PUT the new group object to the DB to update the existing one.
                        return this.putRestData('/groups/' + this.state.controlGroup.uuid, newControlGroup).then(data => {
                            this.setState({controlGroupUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        // We created a group; post it to the DB
                        return this.postRestData('/groups/', newControlGroup).then(data => {
                            this.setState({controlGroupUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }).then(newControlCohort => {
                    /*****************************************************/
                    /* Evidence score data object                        */
                    /*****************************************************/
                    let newScoreObj = CaseControlEvalScore.handleScoreObj.call(this);
                    if (newScoreObj) {
                        newEvidenceScore = newScoreObj;
                    }

                    /*************************************************************/
                    /* Either update or create the case-control object in the DB */
                    /*************************************************************/
                    if (this.state.evidenceScore) {
                        return this.putRestData('/evidencescore/' + this.state.evidenceScore.uuid, newEvidenceScore).then(data => {
                            this.setState({evidenceScoreUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        return this.postRestData('/evidencescore/', newEvidenceScore).then(data => {
                            this.setState({evidenceScoreUuid: data['@graph'][0]['@id']});
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }).then(newScore => {
                    /*****************************************************/
                    /* Get Case-Control object property values           */
                    /* and put/post the data object to 'casecontrol'     */
                    /*****************************************************/
                    let newCaseControlObj = CaseControlEvalScore.handleCaseControlObj.call(this);
                    if (newCaseControlObj) {
                        newCaseControl = newCaseControlObj;
                    }

                    /*****************************************************/
                    /* Case-Control Label form field                     */
                    /* Append input value to other group properties      */
                    /*****************************************************/
                    newCaseControl.label = this.getFormValue('caseControlName');

                    /*****************************************************/
                    /* Append caseCohort, controlCohort & evidenceScore  */
                    /* objects to caseControlStudies object              */
                    /*****************************************************/
                    if (this.state.caseGroupUuid) {
                        newCaseControl.caseCohort = this.state.caseGroupUuid;
                    }
                    if (this.state.controlGroupUuid) {
                        newCaseControl.controlCohort = this.state.controlGroupUuid;
                    }
                    if (this.state.evidenceScoreUuid) {
                        newCaseControl.scores = [this.state.evidenceScoreUuid];
                    }

                    /*************************************************************/
                    /* Either update or create the case-control object in the DB */
                    /*************************************************************/
                    if (this.state.caseControl) {
                        return this.putRestData('/casecontrol/' + this.state.caseControl.uuid, newCaseControl).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        return this.postRestData('/casecontrol/', newCaseControl).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }).then(newCaseControl => {
                    savedCaseControl = newCaseControl;
                    if (!this.state.caseControl) {
                        return this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                            // Get a flattened copy of the fresh annotation object and put our new group into it,
                            // ready for writing.
                            var annotation = curator.flatten(freshAnnotation);
                            if (!annotation.caseControlStudies) {
                                annotation.caseControlStudies = [];
                            }
                            annotation.caseControlStudies.push(newCaseControl['@id']);

                            // Post the modified annotation to the DB
                            return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(data => {
                                return Promise.resolve({caseControl: newCaseControl, annotation: data['@graph'][0]});
                            });
                        });
                    }

                    // Modifying an existing group; don't need to modify the annotation
                    return Promise.resolve({caseControl: newCaseControl, annotation: null});
                }).then(data => {
                    var meta;

                    // Record history of the Case-Control creation
                    if (data.annotation) {
                        // Record the creation of a new group
                        meta = {
                            caseControl: {
                                gdm: this.state.gdm['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        this.recordHistory('add', data.caseControl, meta);
                    } else {
                        // Record the modification of an existing group
                        this.recordHistory('modify', data.caseControl);
                    }

                    // Navigate to Curation Central or Family Submit page, depending on previous page
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        this.context.navigate('/case-control-submit/?gdm=' + this.state.gdm.uuid + '&casecontrol=' + savedCaseControl.uuid + '&evidence=' + this.state.annotation.uuid);
                    }
                }).catch(function(e) {
                    console.log('GROUP CREATION ERROR=: %o', e);
                });
            }
        }
    },

    // Method to render header labels for Case-Control, Case Cohort, & Control Cohort
    renderLabels(caseControlName, caseGroupName, controlGroupName) {
        if (caseControlName && caseGroupName && controlGroupName) {
            return (
                <span> {caseControlName + ' (Case: ' + caseGroupName + '; Control: ' + controlGroupName + ')'}</span>
            );
        } else if (!caseControlName && caseGroupName && controlGroupName) {
            return (
                <span> {'(Case: ' + caseGroupName + '; Control: ' + controlGroupName + ')'}</span>
            );
        } else if (caseControlName && !caseGroupName && !controlGroupName) {
            return (
                <span> {caseControlName}</span>
            );
        } else if (caseControlName && caseGroupName && !controlGroupName) {
            return (
                <span> {caseControlName + ' (Case: ' + caseGroupName + ')'}</span>
            );
        } else if (!caseControlName && caseGroupName && !controlGroupName) {
            return (
                <span> {'(Case: ' + caseGroupName + ')'}</span>
            );
        } else if (caseControlName && !caseGroupName && controlGroupName) {
            return (
                <span> {caseControlName + ' (Control: ' + controlGroupName + ')'}</span>
            );
        } else if (!caseControlName && !caseGroupName && controlGroupName) {
            return (
                <span> {'(Control: ' + controlGroupName + ')'}</span>
            );
        } else {
            return (
                <span className="no-entry">No entry</span>
            );
        }
    },

    render() {
        let gdm = this.state.gdm;
        let annotation = this.state.annotation;
        let pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        let caseControl = this.state.caseControl,
            evidenceScore = this.state.evidenceScore,
            caseGroup = this.state.caseGroup,
            controlGroup = this.state.controlGroup;
        let caseGroupMethod = (caseGroup && caseGroup.method && Object.keys(caseGroup.method).length) ? caseGroup.method : {};
        let controlGroupMethod = (controlGroup && controlGroup.method && Object.keys(controlGroup.method).length) ? controlGroup.method : {};
        let submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.caseControlUuid = queryKeyValue('casecontrol', this.props.href);
        this.queryValues.evidenceScoreUuid = queryKeyValue('evidencescore', this.props.href);
        this.queryValues.caseGroupUuid = queryKeyValue('casecohort', this.props.href);
        this.queryValues.controlGroupUuid = queryKeyValue('controlcohort', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === '';

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.caseControlUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/case-control-submit/?gdm=' + gdm.uuid + (caseControl ? '&casecontrol=' + caseControl.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        return (
            <div>
                {(!this.queryValues.caseControlUuid || caseControl) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(caseControl ? 'Edit' : 'Curate') + ' Case-Control Evidence'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    <span> &#x2F;&#x2F; {this.renderLabels(this.state.caseControlName, this.state.caseGroupName, this.state.controlGroupName)}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <div className="col-sm-12 case-control-label">
                                        <PanelGroup accordion>
                                            <Panel title="Case-Control Label" panelClassName="case-control-label-panel" open>
                                                {CaseControlName.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                    <div className="col-sm-6 case-cohort-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Case Cohort" panelClassName="case-cohort" open>
                                                {GroupName.call(this, 'case-cohort')}
                                                {GroupCommonDiseases.call(this, 'case-cohort')}
                                                {GroupDemographics.call(this, 'case-cohort')}
                                                {methods.render.call(this, caseGroupMethod, false, true, 'caseCohort_')}
                                                {GroupPower.call(this, 'case-cohort')}
                                                {GroupAdditional.call(this, 'case-cohort')}
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                    <div className="col-sm-6 control-cohort-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Control Cohort" panelClassName="control-cohort" open>
                                                {GroupName.call(this, 'control-cohort')}
                                                {GroupCommonDiseases.call(this, 'control-cohort')}
                                                {GroupDemographics.call(this, 'control-cohort')}
                                                {methods.render.call(this, controlGroupMethod, false, true, 'controlCohort_')}
                                                {GroupPower.call(this, 'control-cohort')}
                                                {GroupAdditional.call(this, 'control-cohort')}
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                    <div className="col-sm-12 case-control-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Case-Control Evaluation & Score" panelClassName="case-control-eval-score" open>
                                                {CaseControlEvalScore.render.call(this, caseControl, evidenceScore)}
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {caseControl ?
                                                <DeleteButton gdm={gdm} parent={annotation} item={caseControl} pmid={pmid} />
                                            : null}
                                            <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});

curator_page.register(CaseControlCuration, 'curator_page', 'case-control-curation');

// Case-Control Name above other group curation panels.
// Call with .call(this) to run in the same context as the calling component.
function CaseControlName() {
    const caseControl = this.state.caseControl;

    return (
        <div className="row section section-label">
            <Input type="text" ref="caseControlName" label="Case-Control Label" value={caseControl && caseControl.label} maxLength="60" handleChange={this.handleChange}
                error={this.getFormError('caseControlName')} clearError={this.clrFormErrors.bind(null, 'caseControlName')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" required />
        </div>
    );
}

// Group Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupName(groupType) {
    let label, groupName, group;
    if (groupType === 'case-cohort') {
        label = 'Case Cohort Label:';
        groupName = 'caseCohort_groupName';
        group = this.state.caseGroup;
    }
    if (groupType === 'control-cohort') {
        label = 'Control Cohort Label:';
        groupName = 'controlCohort_groupName';
        group = this.state.controlGroup;
    }

    return (
        <div className="row section section-label">
            <Input type="text" ref={groupName} label={label} value={group && group.label} maxLength="60" handleChange={this.handleChange}
                error={this.getFormError(groupName)} clearError={this.clrFormErrors.bind(null, groupName)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">{curator.renderLabelNote('Group')}</p>
        </div>
    );
}

// Common diseases group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupCommonDiseases(groupType) {
    let orphanetidVal, hpoidVal, nothpoidVal;
    let inputDisabled = (groupType === 'control-cohort') ? true : false;
    let orphanetId, hpoId, phenoTerms, nothpoId, notphenoTerms, group, cohortLabel;
    if (groupType === 'case-cohort') {
        orphanetId = 'caseCohort_orphanetId';
        hpoId = 'caseCohort_hpoId';
        phenoTerms = 'caseCohort_phenoTerms';
        nothpoId = 'caseCohort_nothpoId';
        notphenoTerms = 'caseCohort_notphenoTerms';
        cohortLabel = 'Case Cohort';
        group = this.state.caseGroup;
    }
    if (groupType === 'control-cohort') {
        orphanetId = 'controlCohort_orphanetId';
        hpoId = 'controlCohort_hpoId';
        phenoTerms = 'controlCohort_phenoTerms';
        nothpoId = 'controlCohort_nothpoId';
        notphenoTerms = 'controlCohort_notphenoTerms';
        cohortLabel = 'Control Cohort';
        group = this.state.controlGroup;
    }
    if (group) {
        orphanetidVal = group.commonDiagnosis ? group.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join(', ') : null;
        hpoidVal = group.hpoIdInDiagnosis ? group.hpoIdInDiagnosis.join(', ') : null;
        nothpoidVal = group.hpoIdInElimination ? group.hpoIdInElimination.join(', ') : null;
    }

    return (
        <div className="row section section-disease">
            <h3><i className="icon icon-chevron-right"></i> Common Disease(s) & Phenotype(s)</h3>
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-warning">Please enter an Orphanet ID(s) and/or HPO ID(s) and/or Phenotype free text (required).</p>
            </div>
            <Input type="text" ref={orphanetId} label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15" inputDisabled={inputDisabled}
                error={this.getFormError(orphanetId)} clearError={this.clrMultiFormErrors.bind(null, [orphanetId, hpoId, phenoTerms])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="text" ref={hpoId} label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300" inputDisabled={inputDisabled}
                error={this.getFormError(hpoId)} clearError={this.clrMultiFormErrors.bind(null, [orphanetId, hpoId, phenoTerms])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref={phenoTerms} label={<LabelPhenoTerms />} rows="5" value={group && group.termsInDiagnosis} inputDisabled={inputDisabled}
                error={this.getFormError(phenoTerms)} clearError={this.clrMultiFormErrors.bind(null, [orphanetId, hpoId, phenoTerms])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in {cohortLabel}</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref={nothpoId} label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300" inputDisabled={inputDisabled}
                error={this.getFormError(nothpoId)} clearError={this.clrFormErrors.bind(null, nothpoId)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref={notphenoTerms} label={<LabelPhenoTerms not />} rows="5" value={group && group.termsInElimination} inputDisabled={inputDisabled}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Disease(s) in Common (<span className="normal"><a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet home page in a new tab">Orphanet</a> term</span>):</span>;
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
                (<span className="normal">free text</span>):
            </span>
        );
    }
});

// Demographics group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupDemographics(groupType) {
    let maleCount, femaleCount, country, ethnicity, race, ageRangeType, ageFrom, ageTo, ageUnit, headerLabel, group;
    if (groupType === 'case-cohort') {
        maleCount = 'caseCohort_maleCount';
        femaleCount = 'caseCohort_femaleCount';
        country = 'caseCohort_country';
        ethnicity = 'caseCohort_ethnicity';
        race = 'caseCohort_race';
        ageRangeType = 'caseCohort_ageRangeType';
        ageFrom = 'caseCohort_ageFrom';
        ageTo = 'caseCohort_ageTo';
        ageUnit = 'caseCohort_ageUnit';
        headerLabel = 'CASE';
        group = this.state.caseGroup;
    }
    if (groupType === 'control-cohort') {
        maleCount = 'controlCohort_maleCount';
        femaleCount = 'controlCohort_femaleCount';
        country = 'controlCohort_country';
        ethnicity = 'controlCohort_ethnicity';
        race = 'controlCohort_race';
        ageRangeType = 'controlCohort_ageRangeType';
        ageFrom = 'controlCohort_ageFrom';
        ageTo = 'controlCohort_ageTo';
        ageUnit = 'controlCohort_ageUnit';
        headerLabel = 'CONTROL';
        group = this.state.controlGroup;
    }

    return (
        <div className="row section section-demographics">
            <h3><i className="icon icon-chevron-right"></i> Demographics <span className="label label-group">{headerLabel}</span></h3>
            <Input type="number" ref={maleCount} label="# males:" value={group && group.numberOfMale}
                error={this.getFormError(maleCount)} clearError={this.clrFormErrors.bind(null, maleCount)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref={femaleCount} label="# females:" value={group && group.numberOfFemale}
                error={this.getFormError(femaleCount)} clearError={this.clrFormErrors.bind(null, femaleCount)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref={country} label="Country of Origin:" defaultValue="none" value={group && group.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref={ethnicity} label="Ethnicity:" defaultValue="none" value={group && group.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <Input type="select" ref={race} label="Race:" defaultValue="none" value={group && group.race}
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
                <Input type="select" ref={ageRangeType} label="Type:" defaultValue="none" value={group && group.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="number" ref={ageFrom} inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError(ageFrom)} clearError={this.clrFormErrors.bind(null, ageFrom)} value={group && group.ageRangeFrom} />
                    <span className="group-age-inter">to</span>
                    <Input type="number" ref={ageTo} inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError(ageTo)} clearError={this.clrFormErrors.bind(null, ageTo)} value={group && group.ageRangeTo} />
                </Input>
                <Input type="select" ref={ageUnit} label="Unit:" defaultValue="none" value={group && group.ageRangeUnit}
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

// Group information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupPower(groupType) {
    let type, controlGroupType, numGroupVariant, numGroupGenotyped, calcAlleleFreq, headerLabel, group;
    if (groupType === 'case-cohort') {
        type = 'Case';
        numGroupVariant = 'caseCohort_numGroupVariant';
        numGroupGenotyped = 'caseCohort_numGroupGenotyped';
        calcAlleleFreq = 'caseCohort_calcAlleleFreq';
        headerLabel = 'CASE';
        group = this.state.caseGroup;
    }
    if (groupType === 'control-cohort') {
        type = 'Control';
        controlGroupType = 'controlCohort_controlGroupType';
        numGroupVariant = 'controlCohort_numGroupVariant';
        numGroupGenotyped = 'controlCohort_numGroupGenotyped';
        calcAlleleFreq = 'controlCohort_calcAlleleFreq';
        headerLabel = 'CONTROL';
        group = this.state.controlGroup;
    }

    return(
        <div className="row section section-power">
            <h3><i className="icon icon-chevron-right"></i> Power <span className="label label-group">{headerLabel}</span></h3>
            {/**** Not ready to be made available to current release
            {(groupType === 'control-cohort') ?
                <Input type="select" ref={controlGroupType} label="Select Control Group Type:" defaultValue="none" value={group && group.numberOfIndividualsWithVariantInCuratedGene}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="New">New</option>
                    <option value="Aggregate variant analysis">Generic population database</option>
                </Input>
                :
                <Input type="select" label="Select Control Group Type:" defaultValue="none" inputDisabled={true}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group invisible-placeholder">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                </Input>
            }
            ****/}
            <Input type="number" ref={numGroupVariant} label={'Numeric value of ' + type + 's with variants in the gene in question:'} value={group && group.numberWithVariant}
                error={this.getFormError(numGroupVariant)} clearError={this.clrFormErrors.bind(null, numGroupVariant)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref={numGroupGenotyped} label={'Numeric value of all ' + type + 's genotyped/sequenced:'} value={group && group.numberAllGenotypedSequenced}
                error={this.getFormError(numGroupGenotyped)} clearError={this.clrFormErrors.bind(null, numGroupGenotyped)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref={calcAlleleFreq} label={type + ' Allele Frequency:'} value={group && group.alleleFrequency}
                error={this.getFormError(calcAlleleFreq)} clearError={this.clrFormErrors.bind(null, calcAlleleFreq)} inputDisabled={true}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for inputs follow.
var LabelOtherGenes = React.createClass({
    render: function() {
        return <span>Other genes found to have variants in them (<a href={external_url_map['HGNCHome']} title="HGNC home page in a new tab" target="_blank">HGNC</a> symbol):</span>;
    }
});

// Additional Information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupAdditional(groupType) {
    let otherpmidsVal, othergenevariantsVal;
    let indFamilyCount, indVariantOtherCount, otherGeneVariants, additionalInfoGroup, otherPmids, headerLabel, group;
    if (groupType === 'case-cohort') {
        indFamilyCount = 'caseCohort_indFamilyCount';
        indVariantOtherCount = 'caseCohort_indVariantOtherCount';
        otherGeneVariants = 'caseCohort_otherGeneVariants';
        additionalInfoGroup = 'caseCohort_additionalInfoGroup';
        otherPmids = 'caseCohort_otherPmids';
        headerLabel = 'CASE';
        group = this.state.caseGroup;
    }
    if (groupType === 'control-cohort') {
        indFamilyCount = 'controlCohort_indFamilyCount';
        indVariantOtherCount = 'controlCohort_indVariantOtherCount';
        otherGeneVariants = 'controlCohort_otherGeneVariants';
        additionalInfoGroup = 'controlCohort_additionalInfoGroup';
        otherPmids = 'controlCohort_otherPmids';
        headerLabel = 'CONTROL';
        group = this.state.controlGroup;
    }
    othergenevariantsVal = group && group.otherGenes ? group.otherGenes.map(function(gene) { return gene.symbol; }).join() : null;
    if (group) {
        otherpmidsVal = group.otherPMIDs ? group.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : null;
    }

    return (
        <div className="row section section-additional-info">
            <h3><i className="icon icon-chevron-right"></i> Additional Information <span className="label label-group">{headerLabel}</span></h3>
            <Input type="number" ref={indFamilyCount} label="Number of individuals with family information:" value={group && group.numberOfIndividualsWithFamilyInformation}
                error={this.getFormError(indFamilyCount)} clearError={this.clrFormErrors.bind(null, indFamilyCount)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref={indVariantOtherCount} label="Number of individuals with variant found in other gene:" value={group && group.numberOfIndividualsWithVariantInOtherGene}
                error={this.getFormError(indVariantOtherCount)} clearError={this.clrFormErrors.bind(null, indVariantOtherCount)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref={otherGeneVariants} label={<LabelOtherGenes />} inputClassName="uppercase-input" value={othergenevariantsVal} placeholder="e.g. DICER1, SMAD3"
                error={this.getFormError(otherGeneVariants)} clearError={this.clrFormErrors.bind(null, otherGeneVariants)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref={additionalInfoGroup} label="Additional Information about Group:" rows="5" value={group && group.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref={otherPmids} label="Enter PMID(s) that report evidence about this same Group:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError(otherPmids)} clearError={this.clrFormErrors.bind(null, otherPmids)}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">
                Note: Any variants associated with probands that will be counted towards the Classification are not
                captured at the Group level - variants and their association with probands are required to be captured
                at the Family or Individual level. Once you submit the Group information, you will be prompted to enter
                Family/Individual information.
            </p>
        </div>
    );
}
