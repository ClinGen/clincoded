'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { RestMixin } from '../../../rest';
import { Form, FormMixin, Input } from '../../../../libs/bootstrap/form';

var curator = require('../../../curator');

var tabNames = {
    'population': 'Population',
    'predictors': 'Predictors',
    'experimental': 'Experimental',
    'segregation-case': 'Segregation/Case'
};

// Recursive function to compare oldObj against newObj and its key:values. Creates diffObj that shares the keys (full-depth) with newObj,
// but with values of true or false depending on whether or not oldObj's values for that key matches newValue's. A value of true means that
// the key:value is different. Also creates diffObjFlag that keeps track of whether or not there is any change in the diffObj. A value of true
// means that there is a difference between newObj and oldObj. Returns array [diffObj, diffObjFlag]
var CompleteSection = module.exports.CompleteSection = createReactClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        interpretation: PropTypes.object,
        tabName: PropTypes.string,
        updateInterpretationObj: PropTypes.func
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
        let checked = this.state.interpretation.completed_sections && this.state.interpretation.completed_sections.indexOf(this.props.tabName) > -1 ? true : false;
        return (
            <div className="alert alert-warning section-complete-bar">
                The evaluations on the {tabNames[this.props.tabName]} tab have been reviewed to my satisfaction (<i>optional</i>) <input type="checkbox" onChange={this.setCompleteSection} disabled={this.state.submitBusy} checked={checked} /> {this.state.submitBusy ? <i className="icon icon-spin icon-cog"></i> : null}
            </div>
        );
    }
});
