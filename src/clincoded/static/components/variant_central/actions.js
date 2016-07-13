'use strict';
var React = require('react');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;
var parseAndLogError = require('../mixins').parseAndLogError;
var form = require('../../libs/bootstrap/form');

var Input = form.Input;
var queryKeyValue = globals.queryKeyValue;

// Display the variant curation action bar above the criteria and tabs
var VariantCurationActions = module.exports.VariantCurationActions = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        session: React.PropTypes.object,
        interpretationUuid: React.PropTypes.string,
        editKey: React.PropTypes.bool,
        pageURL: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            variantUuid: null,
            interpretationUuid: null
        };
    },

    /*
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.interpretationUuid !== this.state.interpretationUuid && this.state.interpretationUuid && this.state.variantUuid) {
            this.context.navigate('/curation-variant/?variant=' + this.state.variantUuid + '&interpretation=' + this.state.interpretationUuid);
        } else {
            return false;
        }
    },
    */
    // handler for 'Start new interpreation' button click event
    handleNewInterpretation: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variantObj = this.props.variantData;
        var newInterpretationObj;
        if (variantObj) {
            this.setState({variantUuid: variantObj.uuid});
            // Put together a new interpretation object
            newInterpretationObj = {variant: variantObj.uuid};
        }
        // Post new interpretation to the DB. Once promise returns, go to /curation-variant page with
        // the new interpretation UUID in the query string.
        this.postRestData('/interpretations/', newInterpretationObj).then(data => {
            var newInterpretationUuid = data['@graph'][0].uuid;
            // this.setState({interpretationUuid: newInterpretationUuid});
            window.location.href = '/variant-central/?variant=' + this.state.variantUuid + '&interpretation=' + newInterpretationUuid;
        }).catch(e => {parseAndLogError.bind(undefined, 'postRequest')});
    },

    render: function() {
        /*
        var session = this.props.session;
        if (session) {
            var userId = (session.user_properties.uuid) ? session.user_properties.uuid : '';
        }
        */
        return (
            <div>
                <span>{this.props.pageURL}</span>
                <div className="container curation-actions curation-variant">
                {((this.props.interpretationUuid && this.props.interpretationUuid.length > 0) || (this.props.editKey && this.props.interpretationUuid.length > 0)) ?
                    <div className="interpretation-record clearfix">
                        <Input type="button-button" inputClassName="btn-primary pull-left" title="Return to Evidence Only" />
                        <h2><span>Variant Interpretation Record</span></h2>
                        <Input type="button-button" inputClassName="btn-primary pull-right" title="Associate with Disease" />
                    </div>
                    :
                    <div className="evidence-only clearfix"><Input type="button-button" inputClassName="btn-primary pull-right" title="Start new interpretation" clickHandler={this.handleNewInterpretation} /></div>
                }
                </div>
            </div>
        );
    }
});
