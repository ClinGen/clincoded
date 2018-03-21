'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { Title } from './title';
import { CurationRecordVariant } from './record_variant';
import { CurationRecordGeneDisease } from './record_gene_disease';
import { CurationRecordCurator } from './record_curator';

// Curation data header for Gene:Disease
var VariantCurationHeader = module.exports.VariantCurationHeader = createReactClass({
    propTypes: {
        variantData: PropTypes.object, // ClinVar data payload
        interpretationUuid: PropTypes.string,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        setSummaryVisibility: PropTypes.func,
        summaryVisible: PropTypes.bool,
        getSelectedTab: PropTypes.func,
        calculatedPathogenicity: PropTypes.string,
        affiliation: PropTypes.object,
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

    render: function() {
        var variant = this.props.variantData;
        var interpretationUuid = this.props.interpretationUuid;
        var interpretation = this.state.interpretation;
        var session = this.props.session;

        let calculatedPathogenicity = this.props.calculatedPathogenicity;

        return (
            <div>
                <div className="curation-data-title">
                    <div className="container">
                        <Title data={variant} interpretation={interpretation} interpretationUuid={interpretationUuid}
                            setSummaryVisibility={this.props.setSummaryVisibility} summaryVisible={this.state.summaryVisible}
                            getSelectedTab={this.props.getSelectedTab} selectedTab={this.props.selectedTab}
                            ext_ensemblHgvsVEP={this.props.ext_ensemblHgvsVEP} ext_myGeneInfo={this.props.ext_myGeneInfo} />
                    </div>
                </div>
                <div className="container curation-data curation-variant">
                    <div className="row equal-height">
                        <CurationRecordVariant data={variant} />
                        <CurationRecordGeneDisease data={variant} />
                        <CurationRecordCurator data={variant} interpretationUuid={interpretationUuid} interpretation={interpretation}
                            session={session} calculatedPathogenicity={calculatedPathogenicity} affiliation={this.props.affiliation} />
                    </div>
                    {variant && !variant.hgvsNames.GRCh37 ?
                        <div className="alert alert-warning">
                            <strong>Warning:</strong> Your variant is not associated with a GRCh37 genomic representation. This will
                            currently limit some of the population and predictive evidence retrieved for this variant.
                        </div>
                        : null}
                </div>
            </div>
        );
    }
});
