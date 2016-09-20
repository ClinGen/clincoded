'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var form = require('../../libs/bootstrap/form');

var Input = form.Input;
var Form = form.Form;
var FormMixin = form.FormMixin;
var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;
var addQueryKey = globals.addQueryKey;

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        interpretation: React.PropTypes.object,
        setSummaryVisibility: React.PropTypes.func,
        summaryVisible: React.PropTypes.bool,
        getSelectedTab: React.PropTypes.func,
        persistProvisionalCheckBox: React.PropTypes.func,
        disabledProvisionalCheckbox: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            interpretation: null, // parent interpretation object
            summaryVisible: this.props.summaryVisible,
            disabledProvisionalCheckbox: this.props.disabledProvisionalCheckbox
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
        }
        this.setState({
            summaryVisible: nextProps.summaryVisible,
            disabledProvisionalCheckbox: nextProps.disabledProvisionalCheckbox
        });
    },

    renderSubtitle: function(interpretation, variant) {
        var associatedDisease = 'Evidence View Only';
        if (interpretation) {
            if (interpretation.disease && interpretation.disease.term) {
                associatedDisease = <span>This interpretation is associated with the disease <strong>{interpretation.disease.term}</strong></span>;
            } else {
                associatedDisease = 'This interpretation is not yet associated with a disease';
            }
        }
        return associatedDisease;
    },

    renderSummaryButtonTitle: function() {
        let title = '';
        let summaryKey = queryKeyValue('summary', this.props.href);
        let summaryState = this.state.isSummaryVisible;
        if (summaryKey) {
            title = 'Return to Interpretation';
        } else {
            title = 'View Summary';
        }
        return title;
    },

    // handler for 'View Summary' & 'Return to Interpretation' button click events
    handleSummaryButtonEvent: function(e) {
        e.preventDefault(); e.stopPropagation();
        let summaryVisible = this.state.summaryVisible;
        let summaryKey = queryKeyValue('summary', window.location.href);
        if (!summaryVisible) {
            this.props.setSummaryVisibility(true);
            this.props.persistProvisionalCheckBox(this.state.disabledProvisionalCheckbox);
            if (!summaryKey) {
                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'summary', 'true'));
            }
        }
        if (summaryVisible) {
            this.props.setSummaryVisibility(false);
            this.props.persistProvisionalCheckBox(this.state.disabledProvisionalCheckbox);
            if (summaryKey) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'summary', null));
                let tabKey = queryKeyValue('tab', window.location.href);
                if (tabKey) {
                    this.props.getSelectedTab(tabKey);
                }
            }
        }
    },

    render: function() {
        var variant = this.props.data;
        var interpretation = this.state.interpretation;

        var variantTitle = (variant && variant.clinvarVariantTitle) ? variant.clinvarVariantTitle : null;
        if (variant && !variantTitle && variant.hgvsNames && variant.hgvsNames != {}) {
            variantTitle = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38+' (GRCh38)': (variant.carId ? variant.carId : null);
        } else if (!variantTitle) {
            variantTitle = 'A preferred title is not available';
        }

        var calculatePatho_button = false;
        if (this.props.interpretationUuid) {
            calculatePatho_button = true;
        }

        const summaryButtonTitle = this.state.summaryVisible ? 'Return to Interpretation' : 'View Summary';

        return (
            <div>
                <h1>{variantTitle}{this.props.children}</h1>
                <h2>{this.renderSubtitle(interpretation, variant)}</h2>
                {variant && calculatePatho_button ?
                    <div className="btn-vertical-space">
                        <div className="interpretation-record clearfix">
                            <div className="pull-right">
                                <Input type="button-button" inputClassName="btn btn-primary pull-right view-summary"
                                    title={summaryButtonTitle} clickHandler={this.handleSummaryButtonEvent} />
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});
