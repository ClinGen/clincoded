'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;

// Display the curator data of the curation data
var CurationInterpretationFunctional = module.exports.CurationInterpretationFunctional = React.createClass({
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
            <div className="variant-interpretation functional">
                <ul className="section-functional-interpretation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <span className="wip">IN PROGRESS</span>
                            <br /><br />
                            <div>Experimental evidence associated with this variant as part of gene curation will appear here. Also included will be the ability to add additional functional evidence for this variant.</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
