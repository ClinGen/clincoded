'use strict';
var React = require('react');
var _ = require('underscore');
var RestMixin = require('../../../rest').RestMixin;
var form = require('../../../../libs/bootstrap/form');
var curator = require('../../../curator');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Recursive function to compare oldObj against newObj and its key:values. Creates diffObj that shares the keys (full-depth) with newObj,
// but with values of true or false depending on whether or not oldObj's values for that key matches newValue's. A value of true means that
// the key:value is different. Also creates diffObjFlag that keeps track of whether or not there is any change in the diffObj. A value of true
// means that there is a difference between newObj and oldObj. Returns array [diffObj, diffObjFlag]
var CompleteSection = module.exports.CompleteSection = React.createClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        interpretation: React.PropTypes.object,
        tabName: React.PropTypes.string,
        updateInterpretationObj: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            submitBusy: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
    },

    setCompleteSection: function() {
        this.setState({submitBusy: true}); // Save button pressed; disable it and start spinner

        var flatInterpretation = null;
        var freshInterpretation = null;
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            // get fresh update of interpretation object so we have newest evaluation list, then flatten it
            flatInterpretation = curator.flatten(freshInterpretation);

            if (!flatInterpretation.completed_sections) {
                flatInterpretation.completed_sections = [];
            }

            if (flatInterpretation.completed_sections.indexOf(this.props.tabName) == -1) {
                flatInterpretation.completed_sections.push(this.props.tabName);
            } else {
                flatInterpretation.completed_sections.splice(flatInterpretation.completed_sections.indexOf(this.props.tabName), 1);
            }

            return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }).then(interpretation => {
            // REST handling is done. Re-enable Save button, and send the interpretation object back to index.js
            this.setState({submitBusy: false});
            this.props.updateInterpretationObj();
        }).catch(error => {
            this.setState({submitBusy: false});
            console.log(error);
        });
    },

    render: function() {
        var checked = this.state.interpretation.completed_sections && this.state.interpretation.completed_sections.indexOf(this.props.tabName) > -1 ? true : false;
        return (
            <div className="alert alert-warning section-complete-bar">
                Set this evidence category as complete <input type="checkbox" onChange={this.setCompleteSection} disabled={this.state.submitBusy} checked={checked} /> {this.state.submitBusy ? <i className="icon icon-spin icon-cog"></i> : null}
            </div>
        );
    }
});
