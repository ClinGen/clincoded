'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { FormMixin, Form, Input } from '../../libs/bootstrap/form';
import { queryKeyValue, editQueryValue, addQueryKey } from '../globals';

// General purpose title rendering
var Title = module.exports.Title = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretationUuid: PropTypes.string,
        interpretation: PropTypes.object,
        setSummaryVisibility: PropTypes.func,
        summaryVisible: PropTypes.bool,
        getSelectedTab: PropTypes.func,
        ext_ensemblHgvsVEP: PropTypes.array,
        ext_myGeneInfo: PropTypes.object
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

    renderVariantTitle(variant, ensemblTranscripts, myGeneInfo) {
        let variantTitle;
        if (variant && variant.clinvarVariantTitle) {
            variantTitle = variant.clinvarVariantTitle;
        } else if (ensemblTranscripts && ensemblTranscripts.length) {
            variantTitle = this.getCanonicalTranscript(ensemblTranscripts);
        } else if (variant && variant.hgvsNames && Object.keys(variant.hgvsNames).length && !variantTitle) {
            variantTitle = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38+' (GRCh38)': (variant.carId ? variant.carId : 'A preferred title is not available');
        }
        return (
            <span className="header-variant-title-wrapper">
                <span className="header-variant-title">{variantTitle}</span>
                {myGeneInfo && myGeneInfo.symbol ?
                    <span className="header-gene-symbol">Gene: {myGeneInfo.symbol}</span>
                    : null}
            </span>
        );
    },

    // Get the canonical transcript provided by RefSeq in Ensembl response
    getCanonicalTranscript(ensemblTranscripts) {
        let transcript;
        for (let item of ensemblTranscripts) {
            // Only if nucleotide transcripts exist
            if (item.hgvsc && item.source === 'RefSeq' && item.canonical && item.canonical === 1) {
                transcript = item.hgvsc;
                if (item.hgvsp) {
                    let proteinChange = item.hgvsp.split(':')[1];
                    transcript += ' (' + proteinChange + ')';
                }
            }
        }
        return transcript;
    },

    renderSubtitle: function(interpretation, variant) {
        var associatedDisease = 'Evidence View';
        let mode = interpretation && interpretation.modeInheritance ? interpretation.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        let modeInheritanceAdjective = interpretation && interpretation.modeInheritanceAdjective ? interpretation.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        if (interpretation) {
            if (interpretation.disease && interpretation.disease.term && interpretation.modeInheritance) {
                associatedDisease = <span>This interpretation is associated with <strong>{interpretation.disease.term}</strong> - <i>{modeInheritanceAdjective ? mode + ' (' + modeInheritanceAdjective + ')' : mode}</i></span>;
            } else if (interpretation.disease && interpretation.disease.term) {
                associatedDisease = <span>This interpretation is associated with <strong>{interpretation.disease.term}</strong></span>;
            } else if (interpretation.modeInheritance) {
                associatedDisease = <span>This interpretation is associated with <strong>no disease</strong> - <i>{modeInheritanceAdjective ? mode + ' (' + modeInheritanceAdjective + ')' : mode}</i></span>;
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
        let ensemblTranscripts = this.props.ext_ensemblHgvsVEP && this.props.ext_ensemblHgvsVEP.length && this.props.ext_ensemblHgvsVEP[0].transcript_consequences ?
            this.props.ext_ensemblHgvsVEP[0].transcript_consequences : [];
        let myGeneInfo = this.props.ext_myGeneInfo ? this.props.ext_myGeneInfo : null;
        let calculatePatho_button = this.props.interpretationUuid ? true : false;
        let summaryButtonTitle = this.state.summaryVisible ? 'Return to Interpretation' : 'View Summary';

        return (
            <div>
                <h1>{this.renderVariantTitle(variant, ensemblTranscripts, myGeneInfo)}{this.props.children}</h1>
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
