'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;

// Display the curator data of the curation data
var CurationInterpretationGeneSpecific = module.exports.CurationInterpretationGeneSpecific = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object,
        protocol: React.PropTypes.string,
        ext_clinvarEutils: React.PropTypes.object,
        ext_myVariantInfo: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array
    },

    getInitialState: function() {
        return {
            clinvar_id: null
        };
    },

    render: function() {
        return (
            <div className="variant-interpretation gene-specific">
                <div className="panel panel-info datasource-gene-resources">
                    <div className="panel-heading"><h3 className="panel-title">Gene Resources</h3></div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix">
                            <dt>HGNC</dt>
                            <dd>Symbol: ELMO1</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>Entrez:</dt>
                            <dd>9844</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>Ensembl:</dt>
                            <dd>9844</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>GeneCards:</dt>
                            <dd>9844</dd>
                        </dl>
                    </div>
                </div>

                <div className="panel panel-info datasource-protein-resources">
                    <div className="panel-heading"><h3 className="panel-title">Gene Resources</h3></div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix">
                            <dt>UniProtKB:</dt>
                            <dd>Symbol: ELMO1</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>Domains:</dt>
                            <dd>9844</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>Structure:</dt>
                            <dd>9844</dd>
                        </dl>
                        <dl className="inline-dl clearfix">
                            <dt>Gene ONtology (Function/Process/Cellular Component):</dt>
                            <dd>9844</dd>
                        </dl>
                    </div>
                </div>
            </div>
        );
    }
});
