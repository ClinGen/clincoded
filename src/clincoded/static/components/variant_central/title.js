'use strict';
var React = require('react');
var _ = require('underscore');

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
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
        var associatedDisease = 'Evidence View Only';
        if (interpretation) {
            if (interpretation.disease && interpretation.disease.term) {
                associatedDisease = <span>This interpretation is associated with the disease <strong>{interpretation.disease.term}</strong></span>;
            } else {
                associatedDisease = 'This interpretation is not yet associated with a disease';
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

        var calculatePatho_button = false;
        if (this.props.interpretationUuid) {
            calculatePatho_button = true;
        }

        return (
            <div>
                <h1>{variantTitle}{this.props.children}</h1>
                <h2>{this.renderSubtitle(interpretation, variant)}</h2>
                {variant && calculatePatho_button ?
                    <div className="btn-vertical-space">
                        <div className="interpretation-record clearfix">
                            <div className="feature-in-development pull-right"> {/* FIXME div for temp yellow UI display */}

                                <button type="button-button" className="btn btn-primary pull-right">
                                    View Summary
                                </button>

                            </div> {/* /FIXME div for temp yellow UI display */}
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});
