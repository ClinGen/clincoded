'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var vciFormHelper = require('./shared/form');
var CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;

var panel = require('../../../libs/bootstrap/panel');
var form = require('../../../libs/bootstrap/form');

var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the curator data of the curation data
var CurationInterpretationFunctional = module.exports.CurationInterpretationFunctional = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        href_url: React.PropTypes.object
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
            <div className="variant-interpretation functional">
                <PanelGroup accordion><Panel title="Does variant result in LOF?" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="panel panel-info">
                            <div className="panel-body">
                                <CurationInterpretationForm renderedFormContent={criteriaLof1} criteria={['PVS1']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaLof1Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                </Panel></PanelGroup>
                <PanelGroup accordion><Panel title="Is LOF known mechanism for disease of interest?" panelBodyClassName="panel-wide-content" open>
                </Panel></PanelGroup>
            </div>
        );
    }
});
