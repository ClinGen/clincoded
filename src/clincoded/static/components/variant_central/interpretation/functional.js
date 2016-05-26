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
        data: React.PropTypes.object
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
                            <h4>Functional Interpretation</h4>
                            <div>Functional Data placeholder</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
