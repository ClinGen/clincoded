'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var moment = require('moment');
var form = require('../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;
var curator = require('../curator');

var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;
var truncateString = globals.truncateString;

// Import individual tab components
var CurationInterpretationCriteria = require('./interpretation/criteria').CurationInterpretationCriteria;
var CurationInterpretationBasicInfo = require('./interpretation/basic_info').CurationInterpretationBasicInfo;
var CurationInterpretationPopulation = require('./interpretation/population').CurationInterpretationPopulation;
var CurationInterpretationComputational = require('./interpretation/computational').CurationInterpretationComputational;
var CurationInterpretationFunctional = require('./interpretation/functional').CurationInterpretationFunctional;
var CurationInterpretationSegregation = require('./interpretation/segregation').CurationInterpretationSegregation;
var CurationInterpretationGeneSpecific = require('./interpretation/gene_specific').CurationInterpretationGeneSpecific;

// Import pathogenicity calculator
var calculator = require('./interpretation/shared/calculator');
var PathogenicityCalculator = calculator.PathogenicityCalculator;

var validTabs = ['basic-info', 'population', 'predictors', 'experimental', 'segregation-case', 'gene-centric'];

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        ext_myGeneInfo: React.PropTypes.object,
        href_url: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        getSelectedTab: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_bustamante: React.PropTypes.object,
        ext_ensemblVariation: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarEsearch: React.PropTypes.object,
        ext_clinVarRCV: React.PropTypes.array,
        ext_clinvarInterpretationSummary: React.PropTypes.object,
        ext_ensemblGeneId: React.PropTypes.string,
        ext_geneSynonyms: React.PropTypes.array,
        ext_singleNucleotide: React.PropTypes.bool,
        loading_clinvarEutils: React.PropTypes.bool,
        loading_clinvarEsearch: React.PropTypes.bool,
        loading_clinvarRCV: React.PropTypes.bool,
        loading_ensemblHgvsVEP: React.PropTypes.bool,
        loading_ensemblVariation: React.PropTypes.bool,
        loading_myVariantInfo: React.PropTypes.bool,
        loading_myGeneInfo: React.PropTypes.bool,
        loading_bustamante: React.PropTypes.bool,
        setCalculatedPathogenicity: React.PropTypes.func,
        selectedTab:React.PropTypes.string
    },

    getInitialState: function() {
        return {
            variantData: this.props.variantData,
            interpretation: this.props.interpretation,
            ext_myGeneInfo: this.props.ext_myGeneInfo,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_bustamante: this.props.ext_bustamante,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            ext_clinVarRCV: this.props.ext_clinVarRCV,
            ext_clinvarInterpretationSummary: this.props.ext_clinvarInterpretationSummary,
            ext_ensemblGeneId: this.props.ext_ensemblGeneId,
            ext_geneSynonyms: this.props.ext_geneSynonyms,
            ext_singleNucleotide: this.props.ext_singleNucleotide,
            loading_clinvarEutils: this.props.loading_clinvarEutils,
            loading_clinvarEsearch: this.props.loading_clinvarEsearch,
            loading_clinvarRCV: this.props.loading_clinvarRCV,
            loading_ensemblHgvsVEP: this.props.loading_ensemblHgvsVEP,
            loading_ensemblVariation: this.props.loading_ensemblVariation,
            loading_myVariantInfo: this.props.loading_myVariantInfo,
            loading_myGeneInfo: this.props.loading_myGeneInfo,
            loading_bustamante: this.props.loading_bustamante,
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
        if (nextProps.ext_myVariantInfo) {
            this.setState({ext_myVariantInfo: nextProps.ext_myVariantInfo});
        }
        if (nextProps.ext_bustamante) {
            this.setState({ext_bustamante: nextProps.ext_bustamante});
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
        if (nextProps.ext_clinVarRCV) {
            this.setState({ext_clinVarRCV: nextProps.ext_clinVarRCV});
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
            loading_myVariantInfo: nextProps.loading_myVariantInfo,
            loading_bustamante: nextProps.loading_bustamante,
            loading_ensemblVariation: nextProps.loading_ensemblVariation,
            loading_ensemblHgvsVEP: nextProps.loading_ensemblHgvsVEP,
            loading_clinvarEutils: nextProps.loading_clinvarEutils,
            loading_clinvarEsearch: nextProps.loading_clinvarEsearch,
            loading_clinvarRCV: nextProps.loading_clinvarRCV
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
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Segregation/Case {completedSections.indexOf('segregation-case') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-centric')} aria-selected={this.state.selectedTab == 'gene-centric'}>Gene-centric</li>
                    </ul>

                    {this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarRCV={this.state.ext_clinVarRCV}
                            ext_clinvarInterpretationSummary={this.state.ext_clinvarInterpretationSummary}
                            loading_clinvarEutils={this.state.loading_clinvarEutils}
                            loading_clinvarRCV={this.state.loading_clinvarRCV}
                            loading_ensemblHgvsVEP={this.state.loading_ensemblHgvsVEP} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'population' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationPopulation data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_ensemblVariation={this.state.loading_ensemblVariation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'predictors' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_bustamante={this.state.ext_bustamante}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_bustamante={this.state.loading_bustamante}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_clinvarEsearch={this.state.loading_clinvarEsearch} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'experimental' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationFunctional data={variant} data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'segregation-case' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationSegregation data={variant} data={variant} href_url={this.props.href_url} session={this.props.session}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
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
var InterpretationAddHistory = React.createClass({
    render: function() {
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
});

globals.history_views.register(InterpretationAddHistory, 'interpretation', 'add');

// Display a history item for adding an individual
var InterpretationModifyHistory = React.createClass({
    render: function() {
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
});

globals.history_views.register(InterpretationModifyHistory, 'interpretation', 'modify');


// Map Interpretation statuses from
var statusMappings = {
//  Status from Interpretation        CSS class                Short name for screen display
    'In Progress':                    {cssClass: 'in-progress', shortName: 'In Progress'},
    'Provisional':                    {cssClass: 'provisional', shortName: 'Provisional'}
};

var InterpretationCollection = module.exports.InterpretationCollection = React.createClass({
    getInitialState: function() {
        return {
            sortCol: 'variant',
            reversed: false,
            searchTerm: '',
            filteredInterpretations: []
        };
    },

    componentWillMount() {
        this.setState({filteredInterpretations: this.props.context['@graph']});
    },

    // Handle clicks in the table header for sorting
    sortDir: function(colName) {
        var reversed = colName === this.state.sortCol ? !this.state.reversed : false;
        var sortCol = colName;
        this.setState({sortCol: sortCol, reversed: reversed});
    },

    // Call-back for the JS sorting function. Expects Interpretationss to compare in a and b. Depending on the column currently selected
    // for sorting, this function sorts on the relevant parts of the Interpretation.
    sortCol: function(a, b) {
        var diff;

        switch (this.state.sortCol) {
            case 'status':
                var statuses = Object.keys(statusMappings);
                var statusIndexA = statuses.indexOf(a.interpretation_status);
                var statusIndexB = statuses.indexOf(b.interpretation_status);
                diff = statusIndexA - statusIndexB;
                break;
            case 'variant':
                diff = (a.variant.clinvarVariantId ? a.variant.clinvarVariantId : a.variant.carId) > (b.variant.clinvarVariantId ? b.variant.clinvarVariantId : b.variant.carId) ? 1 : -1;
                break;
            case 'disease':
                diff = (a.disease && a.disease.term ? a.disease.term : "") > (b.disease && b.disease.term ? b.disease.term : "") ? 1 : -1;
                break;
            case 'moi':
                diff = (a.modeInheritance ? a.modeInheritance : "") > (b.modeInheritance ? b.modeInheritance : "") ? 1 : -1;
                break;
            case 'last':
                var aAnnotation = this.findLatestEvaluations(a);
                var bAnnotation = this.findLatestEvaluations(b);
                diff = aAnnotation && bAnnotation ? Date.parse(aAnnotation.date_created) - Date.parse(bAnnotation.date_created) : (aAnnotation ? 1 : -1);
                break;
            case 'creator':
                var aLower = a.submitted_by.last_name.toLowerCase();
                var bLower = b.submitted_by.last_name.toLowerCase();
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

    handleChange(e) {
        this.setState({searchTerm: e.target.value}, () => {
            // Filter Interpretations
            let context = this.props.context;
            let interpretations = context['@graph'];
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredInterpretations = interpretations.filter(function(interpretation) {
                    return (
                        (interpretation.variant.clinvarVariantId && interpretation.variant.clinvarVariantId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.variant.clinvarVariantTitle && interpretation.variant.clinvarVariantTitle.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.variant.carId && interpretation.variant.carId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.variant.hvgsNames && interpretation.variant.hgvsNames.GRCh38 && interpretation.variant.hgvsNames.GRCh38.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.disease && interpretation.disease.orphaNumber && interpretation.disease.orphaNumber.indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.disease && interpretation.disease.term && interpretation.disease.term.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1)
                    );
                });
                this.setState({filteredInterpretations: filteredInterpretations});
            } else {
                this.setState({filteredInterpretations: interpretations});
            }
        });
    },

    findLatestEvaluations: function(interpretation) {
        var evaluations = interpretation && interpretation.evaluations;
        var latestEvaluation = null;
        var latestTime = 0;
        if (evaluations && evaluations.length) {
            evaluations.forEach(function(evaluation) {
                // Get Unix timestamp version of evaluations's time and compare against the saved version.
                var time = moment(evaluation.date_created).format('x');
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
        let sortIconClass = {
            status: 'tcell-sort', variant: 'tcell-sort', disease: 'tcell-sort', moi: 'tcell-sort',
            last: 'tcell-sort', creator: 'tcell-sort', created: 'tcell-sort'
        };
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="container">
                <div className="row gdm-header">
                    <div className="col-sm-12 col-md-8">
                        <h1>All Interpretations</h1>
                    </div>
                    <div className="col-md-1"></div>
                    <div className="col-sm-12 col-md-3">
                        <input type="text" name="filterTerm" id="filterTerm" placeholder="Filter by Variant or Disease"
                            value={this.state.searchTerm} onChange={this.handleChange} className="form-control" />
                    </div>
                </div>
                <InterpretationStatusLegend />
                <div className="table-responsive">
                    <div className="table-gdm">
                        <div className="table-header-gdm">
                            <div className="table-cell-gdm-status tcell-sortable" onClick={this.sortDir.bind(null, 'status')}>
                                <span className="icon gdm-status-icon-header"></span><span className={sortIconClass.status}></span>
                            </div>
                            <div className="table-cell-gdm-main tcell-sortable" onClick={this.sortDir.bind(null, 'variant')}>
                                <div>Variant Preferred Title<span className={sortIconClass.variant}></span></div>
                                <div>Variant ID(s)</div>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'disease')}>
                                Disease<span className={sortIconClass.disease}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'moi')}>
                                Mode of Inheritance<span className={sortIconClass.moi}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'last')}>
                                Last Edited<span className={sortIconClass.last}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'creator')}>
                                Creator<span className={sortIconClass.creator}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'created')}>
                                Created<span className={sortIconClass.created}></span>
                            </div>
                        </div>
                        {filteredInterpretations.sort(this.sortCol).map(interpretation => {
                            let variantUuid = interpretation.variant.uuid;
                            let clinvarVariantId = interpretation.variant.clinvarVariantId ? interpretation.variant.clinvarVariantId : null;
                            let clinvarVariantTitle = interpretation.variant.clinvarVariantTitle ? interpretation.variant.clinvarVariantTitle : null;
                            let carId = interpretation.variant.carId ? interpretation.variant.carId : null;
                            let grch38 = interpretation.variant.hgvsNames && interpretation.variant.hgvsNames.GRCh38 ? interpretation.variant.hgvsNames.GRCh38 : null;
                            let orphanetId = interpretation.disease && interpretation.disease.orphaNumber ? interpretation.disease.orphaNumber : null;
                            let diseaseTerm = interpretation.disease && interpretation.disease.term ? interpretation.disease.term : null;
                            let modeInheritance = interpretation.modeInheritance ? interpretation.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
                            let createdTime = moment(interpretation.date_created);
                            let latestEvaluation = interpretation && this.findLatestEvaluations(interpretation);
                            let latestTime = latestEvaluation ? moment(latestEvaluation.date_created) : '';
                            let statusString = statusMappings[interpretation.interpretation_status].cssClass; // Convert status string to CSS class
                            let iconClass = 'icon gdm-status-icon-' + statusString;

                            return (
                                <a className="table-row-gdm" href={'/variant-central/?variant=' + variantUuid} key={interpretation.uuid}>
                                    <div className="table-cell-gdm-status">
                                        <span className={iconClass} title={interpretation.interpretation_status}></span>
                                    </div>

                                    <div className="table-cell-gdm-main">
                                        <div>{clinvarVariantTitle ? clinvarVariantTitle : grch38}</div>
                                        <div>
                                            {clinvarVariantId ? <span>ClinVar Variation ID: <strong>{clinvarVariantId}</strong></span> : null}
                                            {clinvarVariantId && carId ? " // " : null}
                                            {carId ? <span>ClinGen Allele Registry ID: <strong>{carId}</strong></span> : null}
                                        </div>
                                    </div>

                                    <div className="table-cell-gdm">
                                        {diseaseTerm ? <span>{diseaseTerm} (ORPHA{orphanetId})</span> : null}
                                    </div>

                                    <div className="table-cell-gdm">
                                        {modeInheritance ? modeInheritance : null}
                                    </div>

                                    <div className="table-cell-gdm">
                                        {latestEvaluation ?
                                            <div>
                                                <div>{moment.parseZone(latestEvaluation.date_created).local().format("YYYY MMM DD")}</div>
                                                <div>{moment.parseZone(latestEvaluation.date_created).local().format("h:mm a")}</div>
                                            </div>
                                        : null}
                                    </div>

                                    <div className="table-cell-gdm">
                                        <div>{interpretation.submitted_by.last_name}, {interpretation.submitted_by.first_name}</div>
                                    </div>

                                    <div className="table-cell-gdm">
                                        <div>{moment.parseZone(interpretation.date_created).local().format("YYYY MMM DD")}</div>
                                        <div>{moment.parseZone(interpretation.date_created).local().format("h:mm a")}</div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(InterpretationCollection, 'interpretation_collection');


// Render the Interpretation status legend
var InterpretationStatusLegend = React.createClass({
    render: function() {
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
});
