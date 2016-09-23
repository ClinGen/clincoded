'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');

var Title = require('./title').Title;
var CurationRecordVariant = require('./record_variant').CurationRecordVariant;
var CurationRecordGeneDisease = require('./record_gene_disease').CurationRecordGeneDisease;
var CurationRecordCurator = require('./record_curator').CurationRecordCurator;

// Curation data header for Gene:Disease
var VariantCurationHeader = module.exports.VariantCurationHeader = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        interpretation: React.PropTypes.object,
        session: React.PropTypes.object,
        setSummaryVisibility: React.PropTypes.func,
        summaryVisible: React.PropTypes.bool,
        getSelectedTab: React.PropTypes.func,
        selectedTab: React.propTypes.string,
        calculatedPathogenicity: React.PropTypes.string
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
                            getSelectedTab={this.props.getSelectedTab} selectedTab={this.props.selectedTab} />
                    </div>
                </div>
                <div className="container curation-data curation-variant">
                    <div className="row equal-height">
                        <CurationRecordVariant data={variant} />
                        <CurationRecordGeneDisease data={variant} />
                        <CurationRecordCurator data={variant} interpretationUuid={interpretationUuid} interpretation={interpretation} session={session} calculatedPathogenicity={calculatedPathogenicity}
                             />
                    </div>
                    {variant && !variant.hgvsNames.GRCh37 ?
                        <div className="alert alert-warning">
                            <strong>Warning:</strong> Your variant is not associated with a GRCh37 genomic representation. This will currently limit some of the population and predictive evidence retrieved for this variant.
                        </div>
                    : null}
                </div>
            </div>
        );
    }
});
