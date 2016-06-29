'use strict';
var React = require('react');
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
        session: React.PropTypes.object
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretationUuid = this.props.interpretationUuid;
        var session = this.props.session;

        return (
            <div>
                <div className="curation-data-title">
                    <div className="container">
                        <Title data={variant} />
                    </div>
                </div>
                <div className="container curation-data curation-variant">
                    <div className="row equal-height">
                        <CurationRecordVariant data={variant} />
                        <CurationRecordGeneDisease data={variant} />
                        <CurationRecordCurator data={variant} interpretationUuid={interpretationUuid} session={session} />
                    </div>
                </div>
            </div>
        );
    }
});
