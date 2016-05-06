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
        variantData: React.PropTypes.object // ClinVar data payload
    },

    render: function() {
        var variant = this.props.variantData;

        return (
            <div>
                <div className="curation-data-title">
                    <div className="container">
                        <Title data={variant} />
                    </div>
                </div>
                <div className="container curation-data">
                    <div className="row equal-height">
                        <CurationRecordVariant data={variant} />
                        <CurationRecordGeneDisease data={variant} />
                        <CurationRecordCurator data={variant} />
                    </div>
                </div>
            </div>
        );
    }
});
