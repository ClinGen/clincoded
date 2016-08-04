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
//var calculateAssertion = calculator.calculateAssertion; // for test only

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
        ext_clinVarEsearch: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            // For test pathogenicity calculator only
            criteriaList: null,
            criteria_met: null,
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
        var critObj = {};
        critObj[ref] = !this.state[ref];
        this.setState(critObj);

        var criteria_met = this.state.criteria_met ? this.state.criteria_met : [];
        var i = criteria_met.indexOf(ref);
        if (i !== -1) {
            criteria_met.splice(i, 1);
        } else {
            criteria_met.push(ref);
        }

        var criteria_list = [];
        for (var crit of criteria_met) {
            var criteriaObj = {};
            criteriaObj.criteria = crit;
            criteriaObj.criteriaStatus = 'met';
            criteria_list.push(criteriaObj);
        }
        this.setState({
            criteria_met: criteria_met,
            criteriaList: criteria_list
        });
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretation = this.state.interpretation;

        // get calculated pathogenicity and criteria summary, test only, will be removed.
        //var result = this.state.criteriaList && this.state.criteriaList.length ? calculateAssertion(this.state.criteriaList) : null;

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <PathogenicityCalculator interpretation={interpretation} />
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
                            calculator={PathogenicityCalculator.calculator} />
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
        return (
            <div style={{'marginTop':'30px','paddingTop':'10px','borderTop':'solid 1px #aaa'}}>
                <span style={{'fontSize':'18px'}}><b>Test Pathogenicity Calculator</b></span>
                <br />
                <Form>
                    <table style={{'width':'100%', 'marginTop':'20px'}}>
                        <tbody>
                            <tr>
                                <td style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="PVS1" label="PVS1" checked={this.state.PVS1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                        <Input type="checkbox" ref="PS1" label="PS1" checked={this.state.PS1} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <be />
                                        <Input type="checkbox" ref="PS2" label="PS2" checked={this.state.PS2} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PS3" label="PS3" checked={this.state.PS3} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <be />
                                        <Input type="checkbox" ref="PS4" label="PS4" checked={this.state.PS4} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                        <Input type="checkbox" ref="PM1" label="PM1" checked={this.state.PM1} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PM2" label="PM2" checked={this.state.PM2} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PM3" label="PM3" checked={this.state.PM3} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PM4" label="PM4" checked={this.state.PM4} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PM5" label="PM5" checked={this.state.PM5} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PM6" label="PM6" checked={this.state.PM6} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                        <Input type="checkbox" ref="PP1" label="PP1" checked={this.state.PP1} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PP2" label="PP2" checked={this.state.PP2} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PP3" label="PP3" checked={this.state.PP3} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PP4" label="PP4" checked={this.state.PP4} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="PP5" label="PP5" checked={this.state.PP5} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td>&nbsp;</td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                    <Input type="checkbox" ref="BA1" label="BA1" checked={this.state.BA1} defaultChecked="false" handleChange={this.handleChange}
                                        labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                        <Input type="checkbox" ref="BS1" label="BS1" checked={this.state.BS1} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BS2" label="BS2" checked={this.state.BS2} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BS3" label="BS3" checked={this.state.BS3} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BS4" label="BS4" checked={this.state.BS4} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                                <td className="clearfix" style={{'verticalAlign':'top','width':'13%'}}>
                                        <Input type="checkbox" ref="BP1" label="BP1" checked={this.state.BP1} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP2" label="BP2" checked={this.state.BP2} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP3" label="BP3" checked={this.state.BP3} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP4" label="BP4" checked={this.state.BP4} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP5" label="BP5" checked={this.state.BP5} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP6" label="BP6" checked={this.state.BP6} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                    <br />
                                        <Input type="checkbox" ref="BP7" label="BP7" checked={this.state.BP7} defaultChecked="false" handleChange={this.handleChange}
                                            labelClassName="col-lg-3 pull-left" wrapperClassName="col-lg-7" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Form>
            </div>
        );
    },
});
