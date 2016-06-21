'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;

// Display the curator data of the curation data
var CurationInterpretationComputational = module.exports.CurationInterpretationComputational = React.createClass({
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
            <div className="variant-interpretation computational">
                <ul className="section-calculator clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <h4>Pathogenicity Calculator</h4>
                            <div>Calculator placeholder</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
