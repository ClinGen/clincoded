'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import ModalComponent from '../../libs/bootstrap/modal';
import { FormMixin, Form, Input } from '../../libs/bootstrap/form';
import { queryKeyValue, editQueryValue, addQueryKey } from '../globals';
import { renderVariantTitle } from '../../libs/render_variant_title';
import { renderVariantTitleExplanation } from '../../libs/render_variant_title_explanation';

// General purpose title rendering
var Title = module.exports.Title = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretationUuid: PropTypes.string,
        interpretation: PropTypes.object,
        setSummaryVisibility: PropTypes.func,
        summaryVisible: PropTypes.bool,
        getSelectedTab: PropTypes.func
    },

    getInitialState: function() {
        return {
            interpretation: null, // parent interpretation object
            summaryVisible: this.props.summaryVisible
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
        }
        this.setState({
            summaryVisible: nextProps.summaryVisible
        });
    },

    renderSubtitle: function(interpretation, variant) {
        var associatedDisease = 'Evidence View';
        let mode = interpretation && interpretation.modeInheritance ? interpretation.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        let modeInheritanceAdjective = interpretation && interpretation.modeInheritanceAdjective ? interpretation.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        if (interpretation) {
            if (interpretation.disease && interpretation.disease.term && interpretation.modeInheritance) {
                associatedDisease = <span>This interpretation is associated with <strong>{interpretation.disease.term}</strong><span className="subtitle-mode-of-inheritance">{modeInheritanceAdjective ? mode + ' (' + modeInheritanceAdjective + ')' : mode}</span></span>;
            } else if (interpretation.disease && interpretation.disease.term) {
                associatedDisease = <span>This interpretation is associated with <strong>{interpretation.disease.term}</strong></span>;
            } else if (interpretation.modeInheritance) {
                associatedDisease = <span>This interpretation is associated with <strong>no disease</strong><span className="subtitle-mode-of-inheritance">{modeInheritanceAdjective ? mode + ' (' + modeInheritanceAdjective + ')' : mode}</span></span>;
            } else {
                associatedDisease = 'This interpretation is not yet associated with a disease or mode of inheritance';
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

    handleViewSummaryResponse: function(e, buttonSelected) {
        this.child.closeModal();

        if (buttonSelected === 'Continue') {
            this.handleSummaryButtonEvent(e);
        } else {
            e.preventDefault(); e.stopPropagation();
        }
    },

    // handler for 'View Summary' & 'Return to Interpretation' button click events
    handleSummaryButtonEvent: function(e) {
        e.preventDefault(); e.stopPropagation();
        let summaryVisible = this.state.summaryVisible;
        let summaryKey = queryKeyValue('summary', window.location.href);
        if (!summaryVisible) {
            this.props.setSummaryVisibility(true);
            if (!summaryKey) {
                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'summary', 'true'));
            }
        }
        if (summaryVisible) {
            this.props.setSummaryVisibility(false);
            if (summaryKey) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'summary', null));
                let tabKey = queryKeyValue('tab', window.location.href);
                if (tabKey) {
                    this.props.getSelectedTab(tabKey);
                }
            }
        }
    },

    render() {
        const variant = this.props.data;
        const interpretation = this.state.interpretation;
        const provisionalCount = interpretation ? interpretation.provisional_count : 0;
        const evaluations = interpretation ? interpretation.evaluations : null;
        let calculatePatho_button = this.props.interpretationUuid ? true : false;
        let summaryButtonTitle = this.state.summaryVisible ? 'Return to Interpretation' : 'View Summary';
        return (
            <div className="variant-interpretation-header">
                <div className="variant-interpretation-header-item title">
                    <h1>{renderVariantTitle(variant)}{renderVariantTitleExplanation()}{this.props.children}</h1>
                    <h2>{this.renderSubtitle(interpretation, variant)}</h2>
                </div>
                <div className="variant-interpretation-header-item button-box">
                    {variant && calculatePatho_button ?
                        <div className="btn-vertical-space">
                            <div className="interpretation-record clearfix">
                                <div className="pull-right">
                                    {this.state.summaryVisible || (evaluations && evaluations.length) || provisionalCount > 0 ? 
                                        <Input type="button-button" inputClassName="btn btn-primary pull-right view-summary"
                                            title={summaryButtonTitle} clickHandler={this.handleSummaryButtonEvent} />
                                        :
                                        <ModalComponent modalClass="modal-default" modalWrapperClass="confirm-evaluation-summary"
                                            bootstrapBtnClass="btn btn-primary pull-right view-summary" actuatorTitle={<span>{summaryButtonTitle}</span>}
                                            onRef={ref => (this.child = ref)}>
                                            <div className="modal-body">
                                                You have not applied any criteria, are you sure you want to finish this interpretation?
                                            </div>
                                            <div className="modal-footer">
                                                <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={(e) => this.handleViewSummaryResponse(e, 'Cancel')} title="Cancel" />
                                                <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={(e) => this.handleViewSummaryResponse(e, 'Continue')} title="Continue" />
                                            </div>
                                        </ModalComponent>
                                    }
                                </div>
                            </div>
                        </div>
                        : null}
                </div>
            </div>
        );
    }
});
