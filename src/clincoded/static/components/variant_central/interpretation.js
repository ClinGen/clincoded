'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var form = require('../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;

var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;

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
var calculatePathogenicity = calculator.calculatePathogenicity; // for test only

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        href_url: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_bustamante: React.PropTypes.object,
        ext_ensemblVEP: React.PropTypes.array,
        ext_ensemblVariation: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarEsearch: React.PropTypes.object,
        ext_clinVarRCV: React.PropTypes.array
    },

    getInitialState: function() {
        return {
            // For test pathogenicity calculator only
            criteriaList: null,
            criteria_evaluated: null,
            PVS1: false,
            PS1: false,
            PS2: false,
            PS3: false,
            PS4: false,
            PM1: false,
            PM2: false,
            PM3: false,
            PM4: false,
            PM5: false,
            PM6: false,
            PP1: false,
            PP2: false,
            PP3: false,
            PP4: false,
            PP5: false,
            BA1: false,
            BS1: false,
            BS2: false,
            BS3: false,
            BS4: false,
            BP1: false,
            BP2: false,
            BP3: false,
            BP4: false,
            BP5: false,
            BP6: false,
            BP7: false,
            // Test above

            interpretation: this.props.interpretation,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_bustamante: this.props.ext_bustamante,
            ext_ensemblVEP: this.props.ext_ensemblVEP,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            ext_clinVarRCV: this.props.ext_clinVarRCV,
            selectedTab: (this.props.href_url.href ? (queryKeyValue('tab', this.props.href_url.href) ? queryKeyValue('tab', this.props.href_url.href) : 'basic-info')  : 'basic-info') // set selectedTab to whatever is defined in the address; default to first tab if not set
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.ext_myVariantInfo) {
            this.setState({ext_myVariantInfo: nextProps.ext_myVariantInfo});
        }
        if (nextProps.ext_bustamante) {
            this.setState({ext_bustamante: nextProps.ext_bustamante});
        }
        if (nextProps.ext_ensemblVEP) {
            this.setState({ext_ensemblVEP: nextProps.ext_ensemblVEP});
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
    },

    // set selectedTab to whichever tab the user switches to, and update the address accordingly
    handleSelect: function (tab) {
        this.setState({selectedTab: tab});
        if (tab == 'basic-info') {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', null));
        } else {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', tab));
        }
    },

    // Function for test pathogeinicity calculator only, will be removed later.
    handleChange: function(ref, e) {
        var criteria_value = this.refs[ref].getValue();
        if (!this.state.ref || this.state.ref !== criteria_value) {
            var critObj = {};
            critObj[ref] = criteria_value;
            this.setState(critObj);
        }

        var criteria_evaluated = this.state.criteria_evaluated ? this.state.criteria_evaluated : [];
        var criteriaObj = {};
        criteriaObj.criteria = ref;
        if (criteria_value === 'not-met' || criteria_value === 'met') {
            criteriaObj.criteriaStatus = criteria_value;
            criteriaObj.criteriaModifier = '';
        } else {
            criteriaObj.criteriaStatus = 'met';
            criteriaObj.criteriaModifier = criteria_value;
        }

        var criteria_index = -1;
        criteria_evaluated.map((ct, i) => {
            if (ct.criteria === ref) {
                criteria_index = i;
            }
        });
        if (criteria_index > -1 && criteria_value === 'not-evaluated') {
            criteria_evaluated.splice(criteria_index, 1);
        } else if (criteria_index > -1 ) {
            criteria_evaluated[criteria_index] = criteriaObj;
        } else if (criteria_value !== 'not-evaluated') {
            criteria_evaluated.push(criteriaObj);
        }

        this.setState({
            criteria_evaluated: criteria_evaluated
        });
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretation = this.state.interpretation;

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <PathogenicityCalculator interpretation={interpretation} />
                <br /><br />
                <div className="vci-tabs">
                    <ul className="vci-tabs-header tab-label-list" role="tablist">
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('basic-info')} aria-selected={this.state.selectedTab == 'basic-info'}>Basic Information</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('population')} aria-selected={this.state.selectedTab == 'population'}>Population</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('predictors')} aria-selected={this.state.selectedTab == 'predictors'}>Predictors</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('functional')} aria-selected={this.state.selectedTab == 'functional'}>Functional</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Segregation/Case</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-specific')} aria-selected={this.state.selectedTab == 'gene-specific'}>Gene-specific</li>
                    </ul>

                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ? '' : ' hidden')}>
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarRCV={this.state.ext_clinVarRCV} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'population' ? '' : ' hidden')}>
                        <CurationInterpretationPopulation data={variant}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblVEP={this.state.ext_ensemblVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'predictors' ? '' : ' hidden')}>
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_bustamante={this.state.ext_bustamante}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'functional' ? '' : ' hidden')}>
                        <CurationInterpretationFunctional data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        {this.state.interpretation ? this.pathCalculatorUI() : null}
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'segregation-case' ? '' : ' hidden')}>
                        <CurationInterpretationSegregation data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'gene-specific' ? '' : ' hidden')}>
                        <CurationInterpretationGeneSpecific data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
            </div>
        );
    },

    // Function to add UI for testing pathogenic calculator. Will be removed later.
    pathCalculatorUI: function() {
        var result = calculatePathogenicity(this.state.criteria_evaluated);

        return (
            <div style={{'marginTop':'30px','paddingTop':'10px','borderTop':'solid 1px #aaa'}}>
                <div>
                    <span style={{'fontSize':'18px'}}><b>Test Pathogenicity Calculator</b></span>
                    <br />
                    <span style={{'paddingLeft':'10px','fontSize':'16px'}}><i>Select option values for any combination of criteria and check result in <b>propress bar below</b>.</i></span>
                </div>
                <div className="progress-bar">
                    <div className="benign-box">
                        <dt>Benign:</dt>
                        {result && result.benign_summary && result.benign_summary.length ? result.benign_summary.join(' | ') : 'No criteria met' }
                    </div>
                    <div className="pathogenic-box">
                        <dt>Pathogenic:</dt>
                        {result && result.path_summary && result.path_summary.length ? result.path_summary.join(' | ') : 'No criteria met' }
                    </div>
                    <div className="assertion-box">
                        <dt>Calculated Pathogenicity (ACMG 2015):</dt>
                        {result && result.assertion ? result.assertion : 'None'}
                    </div>
                </div>
                <br />
                <Form>
                    <table style={{'width':'100%', 'marginTop':'20px'}}>
                        <tbody>
                            <tr style={{'backgroundColor':'#f9d8d8'}}>
                                <td style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PVS1')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PS1')}
                                    {this.setDropdown('PS2')}
                                    {this.setDropdown('PS3')}
                                    {this.setDropdown('PS4')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%', 'paddingTop':'20px'}}>
                                    {this.setDropdown('PM1')}
                                    {this.setDropdown('PM2')}
                                    {this.setDropdown('PM3')}
                                    {this.setDropdown('PM4')}
                                    {this.setDropdown('PM5')}
                                    {this.setDropdown('PM6')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('PP1')}
                                    {this.setDropdown('PP2')}
                                    {this.setDropdown('PP3')}
                                    {this.setDropdown('PP4')}
                                    {this.setDropdown('PP5')}
                                </td>
                            </tr>
                            <tr style={{'backgroundColor':'#c7e9c7'}}>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BA1')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BS1')}
                                    {this.setDropdown('BS2')}
                                    {this.setDropdown('BS3')}
                                    {this.setDropdown('BS4')}
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'25%','paddingTop':'20px'}}>
                                    {this.setDropdown('BP1')}
                                    {this.setDropdown('BP2')}
                                    {this.setDropdown('BP3')}
                                    {this.setDropdown('BP4')}
                                    {this.setDropdown('BP5')}
                                    {this.setDropdown('BP6')}
                                    {this.setDropdown('BP7')}
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </Form>
            </div>
        );
    },

    setDropdown: function(criteria) {
        return (
            <Input type="select" ref={criteria} label={criteria + ':'} defaultValue="not-evaluated" handleChange={this.handleChange} labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-9">
                <option value="not-evaluated">Not Evaluated</option>
                <option disabled="disabled"></option>
                <option value="met">Met</option>
                <option value="not-met">Not Met</option>
                {(criteria.indexOf('PP') === 0 || criteria.indexOf('BP') === 0) ? null : <option value="supporting">Supporting</option>}
                {criteria.indexOf('M') === 1 ? null : (criteria.indexOf('P') === 0 ? <option value="moderate">Moderate</option> : null)}
                {criteria.indexOf('S') === 1 ? null : <option value="strong">Strong</option>}
                {criteria.indexOf('VS') === 1 ? null : (criteria.indexOf('P') === 0 ? <option value="very-strong">Very Strong</option> : null)}
            </Input>
        );
    }
});
