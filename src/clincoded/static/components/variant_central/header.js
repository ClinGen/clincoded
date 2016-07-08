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
                    {variant && !variant.hgvsNames.GRCh37 ?
                        <div className="alert alert-warning">
                            <strong>Warning:</strong> You registered your allele in the ClinGen Allele Registry using a GRCh38 HGVS term. This will currently limit some of the population and predictive evidence that can be retrieved for this variant until an upcoming version of the ClinGen Allele Registry is available.
                        </div>
                    : null}
                </div>
            </div>
        );
    }
});
