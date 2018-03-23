'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import * as curator from '../curator';
import { content_views, history_views, truncateString, queryKeyValue, editQueryValue } from '../globals';
import { RestMixin } from '../rest';

// Import individual tab components
import { CurationInterpretationCriteria } from './interpretation/criteria';
import { CurationInterpretationBasicInfo } from './interpretation/basic_info';
import { CurationInterpretationPopulation } from './interpretation/population';
import { CurationInterpretationComputational } from './interpretation/computational';
import { CurationInterpretationFunctional } from './interpretation/functional';
import { CurationInterpretationSegregation } from './interpretation/segregation';
import { CurationInterpretationGeneSpecific } from './interpretation/gene_specific';

import { getAffiliationName } from '../../libs/get_affiliation_name';

// Import pathogenicity calculator
import { PathogenicityCalculator } from './interpretation/shared/calculator';

var validTabs = ['basic-info', 'population', 'predictors', 'experimental', 'segregation-case', 'gene-centric'];

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = createReactClass({
    propTypes: {
        variantData: PropTypes.object, // ClinVar data payload
        interpretation: PropTypes.object,
        ext_myGeneInfo: PropTypes.object,
        href_url: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        getSelectedTab: PropTypes.func,
        ext_pageData: PropTypes.object,
        ext_myVariantInfo: PropTypes.object,
        ext_ensemblVariation: PropTypes.object,
        ext_ensemblHgvsVEP: PropTypes.array,
        ext_clinvarEutils: PropTypes.object,
        ext_clinVarEsearch: PropTypes.object,
        ext_clinVarSCV: PropTypes.array,
        ext_clinvarInterpretationSummary: PropTypes.object,
        ext_ensemblGeneId: PropTypes.string,
        ext_geneSynonyms: PropTypes.array,
        ext_singleNucleotide: PropTypes.bool,
        loading_clinvarEutils: PropTypes.bool,
        loading_clinvarEsearch: PropTypes.bool,
        loading_clinvarSCV: PropTypes.bool,
        loading_ensemblHgvsVEP: PropTypes.bool,
        loading_ensemblVariation: PropTypes.bool,
        loading_pageData: PropTypes.bool,
        loading_myVariantInfo: PropTypes.bool,
        loading_myGeneInfo: PropTypes.bool,
        setCalculatedPathogenicity: PropTypes.func,
        selectedTab: PropTypes.string,
        affiliation: PropTypes.object
    },

    getInitialState: function() {
        return {
            variantData: this.props.variantData,
            interpretation: this.props.interpretation,
            ext_myGeneInfo: this.props.ext_myGeneInfo,
            ext_pageData: this.props.ext_pageData,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            ext_clinVarSCV: this.props.ext_clinVarSCV,
            ext_clinvarInterpretationSummary: this.props.ext_clinvarInterpretationSummary,
            ext_ensemblGeneId: this.props.ext_ensemblGeneId,
            ext_geneSynonyms: this.props.ext_geneSynonyms,
            ext_singleNucleotide: this.props.ext_singleNucleotide,
            loading_clinvarEutils: this.props.loading_clinvarEutils,
            loading_clinvarEsearch: this.props.loading_clinvarEsearch,
            loading_clinvarSCV: this.props.loading_clinvarSCV,
            loading_ensemblHgvsVEP: this.props.loading_ensemblHgvsVEP,
            loading_ensemblVariation: this.props.loading_ensemblVariation,
            loading_pageData: this.props.loading_pageData,
            loading_myVariantInfo: this.props.loading_myVariantInfo,
            loading_myGeneInfo: this.props.loading_myGeneInfo,
            //remember current tab/subtab so user will land on that tab when interpretation starts
            selectedTab: (this.props.href_url.href ? (queryKeyValue('tab', this.props.href_url.href) ? (validTabs.indexOf(queryKeyValue('tab', this.props.href_url.href)) > -1 ? queryKeyValue('tab', this.props.href_url.href) : 'basic-info') : 'basic-info')  : 'basic-info')
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        this.setState({variantData: nextProps.variantData, interpretation: nextProps.interpretation});
        if (nextProps.ext_myGeneInfo) {
            this.setState({ext_myGeneInfo: nextProps.ext_myGeneInfo});
        }
        if (nextProps.ext_pageData) {
            this.setState({ext_pageData: nextProps.ext_pageData});
        }
        if (nextProps.ext_myVariantInfo) {
            this.setState({ext_myVariantInfo: nextProps.ext_myVariantInfo});
        }
        if (nextProps.ext_ensemblVariation) {
            this.setState({ext_ensemblVariation: nextProps.ext_ensemblVariation});
        }
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({ext_ensemblHgvsVEP: nextProps.ext_ensemblHgvsVEP});
        }
        if (nextProps.ext_clinvarEutils) {
            this.setState({ext_clinvarEutils: nextProps.ext_clinvarEutils});
        }
        if (nextProps.ext_clinVarEsearch) {
            this.setState({ext_clinVarEsearch: nextProps.ext_clinVarEsearch});
        }
        if (nextProps.ext_clinVarSCV) {
            this.setState({ext_clinVarSCV: nextProps.ext_clinVarSCV});
        }
        if (nextProps.ext_clinvarInterpretationSummary) {
            this.setState({ext_clinvarInterpretationSummary: nextProps.ext_clinvarInterpretationSummary});
        }
        if (nextProps.ext_ensemblGeneId) {
            this.setState({ext_ensemblGeneId: nextProps.ext_ensemblGeneId});
        }
        if (nextProps.ext_geneSynonyms) {
            this.setState({ext_geneSynonyms: nextProps.ext_geneSynonyms});
        }
        if (nextProps.selectedTab) {
            this.setState({selectedTab: nextProps.selectedTab});
        }
        this.setState({
            ext_singleNucleotide: nextProps.ext_singleNucleotide,
            loading_myGeneInfo: nextProps.loading_myGeneInfo,
            loading_pageData: nextProps.loading_pageData,
            loading_myVariantInfo: nextProps.loading_myVariantInfo,
            loading_ensemblVariation: nextProps.loading_ensemblVariation,
            loading_ensemblHgvsVEP: nextProps.loading_ensemblHgvsVEP,
            loading_clinvarEutils: nextProps.loading_clinvarEutils,
            loading_clinvarEsearch: nextProps.loading_clinvarEsearch,
            loading_clinvarSCV: nextProps.loading_clinvarSCV
        });
    },

    // set selectedTab to whichever tab the user switches to, and update the address accordingly
    handleSelect: function (tab) {
        if (tab == 'basic-info' || validTabs.indexOf(tab) == -1) {
            this.setState({selectedTab: 'basic-info'});
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'tab', null));
        } else {
            this.setState({selectedTab: tab});
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'tab', tab));
        }
        this.props.getSelectedTab(tab);
    },

    render: function() {
        var variant = this.state.variantData;
        var interpretation = this.state.interpretation;
        var completedSections = this.state.interpretation && this.state.interpretation.completed_sections ? this.state.interpretation.completed_sections : [];
        var populationTabChecked = false;

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <PathogenicityCalculator interpretation={interpretation} setCalculatedPathogenicity={this.props.setCalculatedPathogenicity} />
                <div className="vci-tabs">
                    <ul className="vci-tabs-header tab-label-list" role="tablist">
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('basic-info')} aria-selected={this.state.selectedTab == 'basic-info'}>Basic Information</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('population')} aria-selected={this.state.selectedTab == 'population'}>Population {completedSections.indexOf('population') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('predictors')} aria-selected={this.state.selectedTab == 'predictors'}>Predictors {completedSections.indexOf('predictors') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('experimental')} aria-selected={this.state.selectedTab == 'experimental'}>Experimental {completedSections.indexOf('experimental') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Case/Segregation {completedSections.indexOf('segregation-case') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-centric')} aria-selected={this.state.selectedTab == 'gene-centric'}>Gene-centric</li>
                    </ul>

                    {this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarSCV={this.state.ext_clinVarSCV}
                            ext_clinvarInterpretationSummary={this.state.ext_clinvarInterpretationSummary}
                            loading_clinvarEutils={this.state.loading_clinvarEutils}
                            loading_clinvarSCV={this.state.loading_clinvarSCV}
                            loading_ensemblHgvsVEP={this.state.loading_ensemblHgvsVEP} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'population' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationPopulation data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_pageData={this.state.ext_pageData}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_pageData={this.state.pageData}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_ensemblVariation={this.state.loading_ensemblVariation}
                            affiliation={this.props.affiliation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'predictors' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_clinvarEsearch={this.state.loading_clinvarEsearch}
                            affiliation={this.props.affiliation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'experimental' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationFunctional data={variant} data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} affiliation={this.props.affiliation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'segregation-case' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationSegregation data={variant} data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} affiliation={this.props.affiliation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'gene-centric' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationGeneSpecific data={variant} data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myGeneInfo={this.state.ext_myGeneInfo}
                            ext_ensemblGeneId={this.state.ext_ensemblGeneId}
                            ext_geneSynonyms={this.state.ext_geneSynonyms}
                            loading_myGeneInfo={this.state.loading_myGeneInfo} />
                    </div>
                    : null}
                </div>
            </div>
        );
    },
});

// Display a history item for adding an interpretation
class InterpretationAddHistory extends Component {
    render() {
        const history = this.props.history;
        const interpretation = history.primary,
            variant = history.meta && history.meta.interpretation && history.meta.interpretation.variant,
            disease = history.meta && history.meta.interpretation && history.meta.interpretation.disease;
        return (
            <div>
                <span>Interpretation added to Variant <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}><strong>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : variant.hgvsNames.GRCh38)}</strong></a></span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(InterpretationAddHistory, 'interpretation', 'add');

// Display a history item for adding an individual
class InterpretationModifyHistory extends Component {
    render() {
        const history = this.props.history;
        const interpretation = history.primary,
            variant = history.meta && history.meta.interpretation && history.meta.interpretation.variant,
            disease = history.meta && history.meta.interpretation && history.meta.interpretation.disease,
            modeInheritance = history.meta && history.meta.interpretation && history.meta.interpretation.modeInheritance && history.meta.interpretation.modeInheritance.indexOf('(') > -1 ? history.meta.interpretation.modeInheritance.substring(0, history.meta.interpretation.modeInheritance.indexOf('(') - 1) : history.meta.interpretation.modeInheritance;
        const interpretationName = <span><strong>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : variant.hgvsNames.GRCh37)}{disease ? `–${disease.term}` : null}</strong>{modeInheritance ? <span><strong>–</strong><i>{modeInheritance}</i></span> : null}</span>;
        return (
            <div>
                {history.meta.interpretation.mode == 'edit-disease' ?
                    disease ?
                        <span>Disease <strong>{disease.term}</strong> associated with Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                        : <span>Disease association removed from Variant <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                    : null}
                {history.meta.interpretation.mode == 'edit-inheritance' ?
                    modeInheritance ?
                        <span>Mode of inheritance <i>{modeInheritance}</i> associated with Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                        : <span>Mode of inheritance association removed from Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                    : null}
                {history.meta.interpretation.mode == 'update-eval' ?
                    <span>Evaluation(s) updated for Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                    : null}
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(InterpretationModifyHistory, 'interpretation', 'modify');


// Map Interpretation statuses from
var statusMappings = {
//  Status from Interpretation        CSS class                Short name for screen display
    'In Progress':                    {cssClass: 'in-progress', shortName: 'In Progress'},
    'Provisional':                    {cssClass: 'provisional', shortName: 'Provisional'}
};

var InterpretationCollection = module.exports.InterpretationCollection = createReactClass({
    mixins: [RestMixin],

    getInitialState() {
        return {
            sortCol: 'variant',
            reversed: false,
            searchTerm: '', // User input to filter interpretations
            allInterpretations: [], // Source of complete list of parsed and unfiltered interpretations
            filteredInterpretations: [] // List of parsed and filtered/unfiltered interpretations
        };
    },

    componentDidMount() {
        // this.filterInterpretations();
        this.parseInterpretations();
    },

    componentDidUpdate(prevProps, prevState) {
        // Remove header and notice bar (if any) from DOM
        let siteHeader = document.querySelector('.site-header');
        siteHeader.setAttribute('style', 'display:none');
        let demoNoticeBar = document.querySelector('.notice-bar');
        if (demoNoticeBar) {
            demoNoticeBar.setAttribute('style', 'display:none');
        }
        let affiliationUtilityBar = document.querySelector('.affiliation-utility-container');
        if (affiliationUtilityBar) {
            affiliationUtilityBar.setAttribute('style', 'display:none');
        }
    },

    filterInterpretations() {
        this.getRestData('/search/?type=interpretation&provisional_count=1', null).then(data => {
            let vciInterpURLs = [];
            // go through VCI interpretation results and get their data
            vciInterpURLs = data['@graph'].map(res => { return res['@id']; });
            if (vciInterpURLs.length > 0) {
                this.getRestDatas(vciInterpURLs, null, true).then(vciInterpResults => {
                    let filteredInterpretations = vciInterpResults.filter(function(interpretation) {
                        return (
                            (interpretation.variant && interpretation.variant.clinvarVariantTitle && interpretation.variant.clinvarVariantTitle.indexOf('PAH') > -1) &&
                            (interpretation.hasOwnProperty('markAsProvisional') && interpretation.markAsProvisional) &&
                            (interpretation.status === 'in progress')
                        );
                    });
                    console.log('filteredInterpretations === ' + JSON.stringify(filteredInterpretations));
                });
            }
        }).catch(err => {
            console.log('Filter interpretation error = %', err);
        });
    },

    // Method to parse interpretation and form the shape of the data object containing only the properties needed to
    // render each interpretation item in the table. Also as a workaround fix for the failing pytest_bdd assertion on
    // Travis CI, since having the 'moment' date parsing logic in the render() method would still cause
    // the python test to fail in the build.
    parseInterpretations() {
        let interpretationObjList = [];
        // let interpretations = this.props.context['@graph'];
        this.getRestData('/search/?type=interpretation', null).then(interpretations => {
            let interpretationObj = {};
            if (interpretations['@graph'] && interpretations['@graph'].length) {
                interpretations['@graph'].forEach(interpretation => {
                    if (interpretation.status !== 'deleted') {
                        let allRecordOwners = findAllParticipants(interpretation);
                        let participants = allRecordOwners ? allRecordOwners.map(owner => { return owner.title; }).join(', ') : '';
    
                        interpretationObj = {
                            interpretation_uuid: interpretation.uuid,
                            interpretation_status: interpretation.interpretation_status,
                            variantUuid: interpretation.variant.uuid,
                            clinvarVariantId: interpretation.variant.clinvarVariantId ? interpretation.variant.clinvarVariantId : null,
                            clinvarVariantTitle: interpretation.variant.clinvarVariantTitle ? interpretation.variant.clinvarVariantTitle : null,
                            carId: interpretation.variant.carId ? interpretation.variant.carId : null,
                            grch38: interpretation.variant.hgvsNames && interpretation.variant.hgvsNames.GRCh38 ? interpretation.variant.hgvsNames.GRCh38 : null,
                            diseaseId: interpretation.disease && interpretation.disease.diseaseId ? interpretation.disease.diseaseId : null,
                            disease_term: interpretation.disease && interpretation.disease.term ? interpretation.disease.term : null,
                            modeInheritance: interpretation.modeInheritance ? interpretation.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null,
                            participants: participants,
                            submitter_last_name: interpretation.submitted_by.last_name,
                            submitter_first_name: interpretation.submitted_by.first_name,
                            evaluations: interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [],
                            extra_evidence_list: interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [],
                            provisional_variant: interpretation.provisional_variant && interpretation.provisional_variant.length ? interpretation.provisional_variant : []
                        };
                        interpretationObjList.push(interpretationObj);
                    }
                });
                // Set the initial states upon component mounted
                this.setState({allInterpretations: interpretationObjList, filteredInterpretations: interpretationObjList});
            }
        }).catch(err => {
            console.log('Parsing interpretation error = %', err);
        });
    },

    // Method to handle user input to filter/unfilter interpretations
    handleChange(e) {
        this.setState({searchTerm: e.target.value}, () => {
            // Filter Interpretations
            let interpretations = this.state.allInterpretations;
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredInterpretations = interpretations.filter(function(interpretation) {
                    return (
                        (interpretation.clinvarVariantId && interpretation.clinvarVariantId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.clinvarVariantTitle && interpretation.clinvarVariantTitle.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.carId && interpretation.carId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.grch38 && interpretation.grch38.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.diseaseId && interpretation.diseaseId.indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.disease_term && interpretation.disease_term.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1)
                    );
                });
                this.setState({filteredInterpretations: filteredInterpretations});
            } else {
                this.setState({filteredInterpretations: this.state.allInterpretations});
            }

            this.filterInterpretations();
        });
    },

    // Handle clicks in the table header for sorting
    sortDir(colName) {
        let reversed = colName === this.state.sortCol ? !this.state.reversed : false;
        let sortCol = colName;
        this.setState({sortCol: sortCol, reversed: reversed});
    },

    // Call-back for the JS sorting function. Expects Interpretations (the parsed interpretation state objects) to compare in a and b.
    // Depending on the column currently selected for sorting, this function sorts on the relevant parts of the Interpretation.
    sortCol(a, b) {
        var diff;

        switch (this.state.sortCol) {
            case 'status':
                var statuses = Object.keys(statusMappings);
                var statusIndexA = statuses.indexOf(a.interpretation_status);
                var statusIndexB = statuses.indexOf(b.interpretation_status);
                diff = statusIndexA - statusIndexB;
                break;
            case 'variant':
                diff = (a.clinvarVariantId ? a.clinvarVariantId : a.carId) > (b.clinvarVariantId ? b.clinvarVariantId : b.carId) ? 1 : -1;
                break;
            case 'disease':
                diff = (a.disease_term ? a.disease_term : "") > (b.disease_term ? b.disease_term : "") ? 1 : -1;
                break;
            case 'moi':
                diff = (a.modeInheritance ? a.modeInheritance : "") > (b.modeInheritance ? b.modeInheritance : "") ? 1 : -1;
                break;
            case 'last':
                var aAnnotation = a.latestEvaluation;
                var bAnnotation = b.latestEvaluation;
                diff = aAnnotation && bAnnotation ? Date.parse(aAnnotation.date_created) - Date.parse(bAnnotation.date_created) : (aAnnotation ? 1 : -1);
                break;
            case 'creator':
                var aLower = a.submitter_last_name.toLowerCase();
                var bLower = b.submitter_last_name.toLowerCase();
                diff = aLower > bLower ? 1 : (aLower === bLower ? 0 : -1);
                break;
            case 'created':
                diff = Date.parse(a.date_created) - Date.parse(b.date_created);
                break;
            default:
                diff = 0;
                break;
        }
        return this.state.reversed ? -diff : diff;
    },

    findLatestEvaluations(interpretation) {
        let evaluations = interpretation && interpretation.evaluations;
        let latestEvaluation = null;
        let latestTime = 0;
        if (evaluations && evaluations.length) {
            evaluations.forEach(function(evaluation) {
                // Get Unix timestamp version of evaluations's time and compare against the saved version.
                let evaluationCreatedDate = new Date(evaluation.date_created);
                let time = moment(evaluationCreatedDate).format('x');
                if (latestTime < time) {
                    latestEvaluation = evaluation;
                    latestTime = time;
                }
            });
        }
        return latestEvaluation;
    },

    render() {
        let filteredInterpretations = this.state.filteredInterpretations;
        // Pre-sort the interpretation list
        let interpretations = filteredInterpretations && filteredInterpretations.length ? filteredInterpretations.sort(this.sortCol) : [];
        let sortIconClass = {
            status: 'tcell-sort', variant: 'tcell-sort', disease: 'tcell-sort', moi: 'tcell-sort',
            last: 'tcell-sort', creator: 'tcell-sort', created: 'tcell-sort'
        };
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="table-responsive">
                <h2>Interpretations</h2>
                <div className="table-gdm">
                    <div className="table-header-gdm">
                        <div className="table-cell-gdm">
                            Variant ID(s)
                        </div>
                        <div className="table-cell-gdm">
                            Variant Title
                        </div>
                        <div className="table-cell-gdm">
                            Disease ID
                        </div>
                        <div className="table-cell-gdm">
                            Disease Term
                        </div>
                        <div className="table-cell-gdm">
                            Mode of Inheritance
                        </div>
                        <div className="table-cell-gdm">
                            Creator
                        </div>
                        <div className="table-cell-gdm">
                            Participants
                        </div>
                    </div>
                    {interpretations && interpretations.length ? interpretations.map((interpretation, i) => {
                        return (
                            <div key={i} className="table-row-gdm">
                                <div className="table-cell-gdm">
                                    <div>
                                        {interpretation.clinvarVariantId ? <span>ClinVar Variation ID: <strong>{interpretation.clinvarVariantId}</strong></span> : null}
                                        {interpretation.clinvarVariantId && interpretation.carId ? "; " : null}
                                        {interpretation.carId ? <span>ClinGen Allele Registry ID: <strong>{interpretation.carId}</strong></span> : null}
                                    </div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{interpretation.clinvarVariantTitle ? interpretation.clinvarVariantTitle : interpretation.grch38}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    {interpretation.diseaseId ? <span>{interpretation.diseaseId.replace('_', ':')}</span> : null}
                                </div>
                                <div className="table-cell-gdm">
                                    {interpretation.disease_term ? <span>{interpretation.disease_term}</span> : null}
                                </div>
                                <div className="table-cell-gdm">
                                    {interpretation.modeInheritance ? <span>{interpretation.modeInheritance}</span> : null}
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{interpretation.submitter_last_name}, {interpretation.submitter_first_name} {interpretation.affiliation ? <span>({getAffiliationName(interpretation.affiliation)})</span> : null}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{interpretation.participants}</div>
                                </div>
                            </div>
                        );
                    }) : null}
                </div>
            </div>
        );
    }
});

content_views.register(InterpretationCollection, 'interpretation_collection');


// Render the Interpretation status legend
class InterpretationStatusLegend extends Component {
    render() {
        return (
            <div className="row">
                <div className="gdm-status-legend">
                    {Object.keys(statusMappings).map(function(status, i) {
                        var iconClass = 'icon gdm-status-icon-' + statusMappings[status].cssClass;

                        return (
                            <div className={"col-sm-2 gdm-status-item" + (i === 0 ? ' col-sm-offset-1' : '')} key={i}>
                                <span className={iconClass}></span>
                                <span className="gdm-status-text">{statusMappings[status].shortName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}

// Return an array of (evaluations, extra_evidence, classification aka provisional_variant)
// submitted_by objects sorted by last name given the interpretation.
function findAllParticipants(interpreatation) {
    let allObjects = getAllObjects(interpreatation);

    let submitters = allObjects.map(object => {
        return object.submitted_by;
    });

    let participants = _.chain(submitters).uniq(submitter => {
        return submitter.uuid;
    }).sortBy('last_name').value();

    return participants;
}

// Method to filter object keys
function filteredObject(record) {
    const allowed = ['date_created', 'last_modified', 'submitted_by', '@type', 'affiliation'];

    const filtered = Object.keys(record)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = record[key];
            return obj;
        }, {});

    return filtered;
}

// Return all record objects flattened in an array,
// including annotations, evidence, scores
function getAllObjects(interpretation) {
    let totalObjects = [];
    // loop through gdms
    let evaluations = interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [];
    evaluations.forEach(evaluation => {
        totalObjects.push(filteredObject(evaluation));
    });
    let extraEvidenceList = interpretation.extra_evidence_list && interpretation.extra_evidence_list.length ? interpretation.extra_evidence_list : [];
    extraEvidenceList.forEach(evidence => {
        totalObjects.push(filteredObject(evidence));
    });
    // Get provisionalClassifications objects
    let classifications = interpretation.provisional_variant && interpretation.provisional_variant.length ? interpretation.provisional_variant : [];
    classifications.forEach(classification => {
        totalObjects.push(filteredObject(classification));
    });

    return totalObjects;
}