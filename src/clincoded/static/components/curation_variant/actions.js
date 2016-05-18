'use strict';
var React = require('react');
var globals = require('../globals');
var form = require('../../libs/bootstrap/form');

var Input = form.Input;
var queryKeyValue = globals.queryKeyValue;

// Display the curator data of the curation data
var VariantCurationActions = module.exports.VariantCurationActions = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        session: React.PropTypes.object
    },

    contextTypes: {
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            interpretationUuid: queryKeyValue('interpretation', this.props.href)
        };
    },

    handleNewInterpretation: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variant = this.props.variantData;
        if (variant) {
            var variantUuid = (variant.uuid) ? variant.uuid : 'Unknown';
        }
        //window.history.replaceState(window.state, '', '/curation-variant/?variant=' + variantUuid + '&interpretation=' + 'f26a694d-5f09-45fd-818a-861e4108e65a');
        this.context.navigate('/curation-variant/?variant=' + variantUuid + '&interpretation=' + 'f26a694d-5f09-45fd-818a-861e4108e65a');
    },

    render: function() {
        /*
        var variant = this.props.data;
        if (variant) {
            var variantUuid = (variant.uuid) ? variant.uuid : 'Unknown';
        }
        var session = this.props.session;
        if (session) {
            var userId = (session.user_properties.uuid) ? session.user_properties.uuid : '';
        }
        */
        return (
            <div>
                <div className="container curation-actions curation-variant">
                {(this.state.interpretationUuid && this.state.interpretationUuid.length > 0) ?
                    <div className="interpretation-record clearfix">
                        <Input type="button-button" inputClassName="btn-primary pull-left" title="Return to evidence-only" />
                        <h3><span>Variant Interpretation Record</span></h3>
                        <Input type="button-button" inputClassName="btn-primary pull-right" title="Associate disease" />
                    </div>
                    :
                    <div className="evidence-only clearfix"><Input type="button-button" inputClassName="btn-primary pull-right" title="Start new interpretation" clickHandler={this.handleNewInterpretation} /></div>
                }
                </div>
            </div>
        );
    }
});
