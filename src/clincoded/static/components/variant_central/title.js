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
        if (variant) {
            if (variant.associatedInterpretations.length) {
                if (variant.associatedInterpretations[0].disease) {
                    disease_term = variant.associatedInterpretations[0].disease.term;
                }
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
