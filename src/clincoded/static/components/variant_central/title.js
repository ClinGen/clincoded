'use strict';
var React = require('react');

// General purpose title rendering
var Title = module.exports.Title = React.createClass({
    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string
    },

    render: function() {
        var variant = this.props.data;
        var variantTitle = (variant && variant.clinvarVariantTitle) ? variant.clinvarVariantTitle : null;
        if (variant && !variantTitle && variant.hgvsNames && variant.hgvsNames != {}) {
            variantTitle = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38+' (GRCh38)': (variant.carId ? variant.carId : null);
        } else if (!variantTitle) {
            variantTitle = 'A preferred title is not available';
        }

        if (variant) {
            var associatedDisease = (variant.disease) ? variant.disease : 'Not yet associated with a disease';
        }
        var calculatePatho_button = false;
        if (this.props.interpretationUuid) {
            calculatePatho_button = true;
        }

        return (
            <div>
                <h1>{variantTitle}{this.props.children}</h1>
                <h2>{associatedDisease}</h2>
                {variant && calculatePatho_button ?
                    <div className="btn-vertical-space">
                        <div className="interpretation-record clearfix">
                            <button type="button-button" className="btn btn-primary pull-right non-function">
                                Calculate Pathogenicity
                            </button>
                        </div>
                    </div>
                    :
                    null
                }
            </div>
        );
    }
});
