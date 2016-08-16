'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var CompleteSection = require('./shared/complete_section').CompleteSection;

// Display the curator data of the curation data
var CurationInterpretationGeneSpecific = module.exports.CurationInterpretationGeneSpecific = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        href_url: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
    },

    render: function() {
        return (
            <div className="variant-interpretation gene-specific">
                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="gene-specific" updateInterpretationObj={this.props.updateInterpretationObj} />
                : null}
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
