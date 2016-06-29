'use strict';
var React = require('react');

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    propTypes: {
        data: React.PropTypes.object // ClinVar data payload
    },

    render: function() {
        var variant = this.props.data;
        if (variant) {
            var clinVarTitle = (variant.clinvarVariantTitle) ? variant.clinvarVariantTitle : 'A preferred title is not available';
            var associatedDisease = (variant.disease) ? variant.disease : 'Not yet associated with a disease';
        }

        return (
            <div>
                <h1>{clinVarTitle}{this.props.children}</h1>
                <h2>{associatedDisease}</h2>
            </div>
        );
    }
});
