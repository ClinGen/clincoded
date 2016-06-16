'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;

var external_url_map = globals.external_url_map;
var queryKeyValue = globals.queryKeyValue;

var form = require('../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        shouldFetchData: React.PropTypes.bool,
        updateInterpretationObj: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar JSON response from NCBI
            interpretation: this.props.interpretation,
            shouldFetchData: false,
            data: {test: 'hey', test2: 'asdfasfasfdaas'}
        };
    },

    getDefaultProps: function() {
        return {
            stateFilterKeys: []
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            this.fetchData();
        }
    },

    // Retrieve the variant data from NCBI
    fetchData: function() {
        var variant = this.props.data;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            this.getRestData('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&retmode=json&id=' + clinVarId).then(response => {
                var clinvar_data = response.result[clinVarId];
                console.log("clinvar_data is === " + JSON.stringify(clinvar_data));
                this.setState({clinvar_id: clinvar_data.uid});
            }).catch(function(e) {
                console.log('GETGDM ERROR=: %o', e);
            });
        }
    },

    ranodmizeData: function() {
        console.log('randomize data');
        let data = {
            test: Math.floor((Math.random() * 10000000) + 1),
            test2: Math.floor((Math.random() * 1000000) + 1)
        };
        this.setState({data: data});
    },

    render: function() {
        return (
            <div className="variant-interpretation population">
                <ul className="section-external-data clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ExAC">
                            <h4>ExAC</h4>
                            <div>Test: {this.state.data ? this.state.data.test : ''}</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="1000G">
                            <h4>1000G</h4>
                            <div>Test: {this.state.data ? this.state.data.test2 : ''}</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ESP">
                            <h4>ESP</h4>
                            <div><span onClick={this.ranodmizeData}>Randomize data</span></div>
                        </div>
                    </li>
                </ul>
                {(this.state.interpretation) ?
                <ul className="section-criteria-evaluation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <CurationInterpretationForm formTitle={"Criteria Group 1"} renderedFormContent={pop_crit_1} evidenceData={this.state.data}
                            formDataUpdater={pop_crit_1_update} variantUuid={this.props.data['@id']} criteria={['pm2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Criteria Group 2"} renderedFormContent={pop_crit_2} evidenceData={this.state.data}
                            formDataUpdater={pop_crit_2_update} variantUuid={this.props.data['@id']} criteria={['ps4', 'ps5']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </li>
                </ul>
                : null}
            </div>
        );
    }
});


var pop_crit_1 = function() {
    return (
        <div>
            <Input type="select" ref="pm2-value" label="Does this meet criteria PM2?" defaultValue="No Selection" handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
            <Input type="textarea" ref="pm2-description" label="PM2 Description:" rows="5" placeholder="e.g. free text"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

var pop_crit_1_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaulation => {
                if (evaulation.criteria == 'pm2') {
                    this.refs['pm2-value'].setValue(evaulation.value);
                    this.refs['pm2-description'].setValue(evaulation.description);
                    this.setState({submitDisabled: false});
                }
            });
        }
    }
};

var pop_crit_2 = function() {
    return (
        <div>
            <Input type="select" ref="ps4-value" label="Does this meet criteria PS4?" defaultValue="No Selection" handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
            <Input type="text" ref="ps4-description" label="PS4 Description:" rows="5" placeholder="e.g. free text" inputDisabled={true}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="ps5-value" label="Does this meet criteria PS5?" defaultValue="No Selection" handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
        </div>
    );
};

var pop_crit_2_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                switch(evaluation.criteria) {
                    case 'ps4':
                        this.refs['ps4-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                    case 'ps5':
                        this.refs['ps5-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                }
            });
        }
    }
    if (nextProps.extraData) {
        this.refs['ps4-description'].setValue(nextProps.extraData.test2);
    }
};
