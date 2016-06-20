'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;

var form = require('../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the curator data of the curation data
var CurationInterpretationComputational = module.exports.CurationInterpretationComputational = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        shouldFetchData: React.PropTypes.bool,
        updateInterpretationObj: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
    },

    render: function() {
        return (
            <div className="variant-interpretation computational">
                <ul className="section-calculator clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <h4>Pathogenicity Calculator</h4>
                            <div>Calculator placeholder</div>
                        </div>
                    </li>
                </ul>

                {(this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Criteria Group Xbox"} renderedFormContent={comp_crit_1}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true}
                            formDataUpdater={comp_crit_1_update} variantUuid={this.props.data['@id']} criteria={['xbox1', 'xbox2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
                : null}
            </div>
        );
    }
});

var comp_crit_1 = function() {
    return (
        <div>
            <Input type="checkbox" ref="xbox1-value" label="Xbox1?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox1-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="checkbox" ref="xbox2-value" label="Xbox2?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox2-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

var comp_crit_1_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaulation => {
                if (evaulation.criteria == 'xbox1') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox1-value'] = evaulation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
                }
                if (evaulation.criteria == 'xbox2') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox2-value'] = evaulation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
                }
            });
        }
    }
};
