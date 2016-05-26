'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');
var form = require('../../../libs/bootstrap/form');

var external_url_map = globals.external_url_map;
var queryKeyValue = globals.queryKeyValue;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [FormMixin, RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        shouldFetchData: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar JSON response from NCBI
            interpretationUuid: this.props.interpretationUuid,
            shouldFetchData: false
        };
    },

    getDefaultProps: function() {
        return {
            stateFilterKeys: []
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretationUuid: nextProps.interpretationUuid});
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

    render: function() {
        return (
            <div className="variant-interpretation population">
                <ul className="section-external-data clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ExAC">
                            <h4>ExAC</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="1000G">
                            <h4>1000G</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ESP">
                            <h4>ESP</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                </ul>
                {(this.state.interpretationUuid) ?
                <ul className="section-criteria-evaluation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <Form formClassName="form-horizontal form-std">
                            <div className="evaluation">
                                <h4>Evaluation Criteria</h4>
                                <Input type="select" ref="evaluation" label="Does this meet your criteria?" defaultValue="No Selection"
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                    <option value="No Selection">No Selection</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </Input>
                                <Input type="textarea" ref="evaluation-desc" label="Description:" rows="5" placeholder="e.g. free text"
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                            </div>
                        </Form>
                    </li>
                </ul>
                : null}
            </div>
        );
    }
});
