"use strict";
var React = require('react');
var _ = require('underscore');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var form = require('../libs/bootstrap/form');
var panel = require('../libs/bootstrap/panel');

var RecordHeader = curator.RecordHeader;
var PmidSummary = curator.PmidSummary;
var queryKeyValue = globals.queryKeyValue;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Panel = panel.Panel;


var ExperimentSubmit = React.createClass({
    mixins: [FormMixin, RestMixin],

    render: function() {
        return (
            <div>Bye!</div>
        );
    }
});

globals.curator_page.register(ExperimentSubmit, 'curator_page', 'experiment-submit');
