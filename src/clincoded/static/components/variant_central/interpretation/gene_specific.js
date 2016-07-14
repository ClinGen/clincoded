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
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null
        };
    },

    render: function() {
        return (
            <div className="variant-interpretation gene-specific">
                <ul className="section-gene-specific-interpretation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <span className="wip">IN PROGRESS</span>
                            <br /><br />
                            <div>This tab will include information about the gene with which this variant is associated, including gene-specific links, ExAC constraint scores for the gene, domain information, hotspots, etc.</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
