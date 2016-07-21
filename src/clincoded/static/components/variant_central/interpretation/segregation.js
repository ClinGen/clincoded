'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;

// Display the curator data of the curation data
var CurationInterpretationSegregation = module.exports.CurationInterpretationSegregation = React.createClass({
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
            <div className="variant-interpretation segregation">
                <ul className="section-segregation-interpretation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <span className="wip">IN PROGRESS</span>
                            <br /><br />
                            <div>Segregation (Family) information associated with this variant as part of gene curation will appear here. Also included will be the ability to curate additional segregation (Family) information for this variant.</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
