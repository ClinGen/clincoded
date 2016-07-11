'use strict';
var React = require('react');

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object
    },

    render: function() {
        var variant = this.props.data;
        var disease_term = '';
        if (this.props.interpretation) {
            if (this.props.interpretation.disease) {
                disease_term = this.props.interpretation.disease.term;
            }
        }

        if (variant) {
            var clinVarTitle = (variant.clinvarVariantTitle) ? variant.clinvarVariantTitle : 'A preferred title is not available';
            var associatedDisease = (disease_term) ? 'This interpretation is associated with disease: ' + disease_term : 'Not yet associated with a disease';
        }

        return (
            <div>
                <h1>{clinVarTitle}{this.props.children}</h1>
                <h2>{associatedDisease}</h2>
            </div>
        );
    }
});
