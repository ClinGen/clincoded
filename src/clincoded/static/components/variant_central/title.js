'use strict';
var React = require('react');
var _ = require('underscore');

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            interpretation: null // parent interpretation object
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
        }
    },

    renderSubtitle: function(interpretation, variant) {
        var associatedDisease = 'Not yet associated with a disease';
        if (interpretation) {
            if (interpretation.disease) {
                if (interpretation.disease.term) {
                    associatedDisease = 'This interpretation is associated with disease: ' + interpretation.disease.term;
                }
            }
        }
        if (variant && !interpretation) {
            if (variant.associatedInterpretations.length) {
                if (variant.associatedInterpretations[0].disease) {
                    if (variant.associatedInterpretations[0].disease.term) {
                        associatedDisease = 'This interpretation is associated with disease: ' + variant.associatedInterpretations[0].disease.term;
                    }
                }
            }
        }
        return associatedDisease;
    },

    render: function() {
        var variant = this.props.data;
        var interpretation = this.state.interpretation;

        var variantTitle = (variant && variant.clinvarVariantTitle) ? variant.clinvarVariantTitle : null;
        if (variant && !variantTitle && variant.hgvsNames && variant.hgvsNames != {}) {
            variantTitle = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38+' (GRCh38)': (variant.carId ? variant.carId : null);
        } else if (!variantTitle) {
            variantTitle = 'A preferred title is not available';
        }

        return (
            <div>
                <h1>{variantTitle}{this.props.children}</h1>
                <h2>{this.renderSubtitle(interpretation, variant)}</h2>
            </div>
        );
    }
});
