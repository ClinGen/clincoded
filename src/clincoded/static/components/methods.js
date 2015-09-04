'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var form = require('../libs/bootstrap/form');
var curator = require('./curator');

var Input = form.Input;


// Utilities so any pages that have a Methods panel can use this shared code
// To display the panel, and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
// with <method>.call(this).
module.exports = {

    // Render a method panel. 'family' is boolean true if this is a method for family.
    render: function(method, family) {
        return (
            <div className="row">
                <Input type="select" ref="prevtesting" label="Previous Testing:" defaultValue="none" value={curator.booleanToDropdown(method.previousTesting)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Yes</option>
                    <option>No</option>
                </Input>
                <Input type="textarea" ref="prevtestingdesc" label="Description of Previous Testing:" rows="5" value={method.previousTestingDescription}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                <Input type="select" ref="genomewide" label="Genome-wide Study?:" defaultValue="none" value={curator.booleanToDropdown(method.genomeWideStudy)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Yes</option>
                    <option>No</option>
                </Input>
                <h4 className="col-sm-7 col-sm-offset-5">Genotyping Method</h4>
                <Input type="select" ref="genotypingmethod1" label="Method 1:" handleChange={this.handleChange} defaultValue="none" value={method.genotypingMethods && method.genotypingMethods[0] ? method.genotypingMethods[0] : null}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Exome sequencing</option>
                    <option>Genotyping</option>
                    <option>HRM</option>
                    <option>PCR</option>
                    <option>Sanger</option>
                    <option>Whole genome shotgun sequencing</option>
                </Input>
                <Input type="select" ref="genotypingmethod2" label="Method 2:" defaultValue="none" value={method.genotypingMethods && method.genotypingMethods[1] ? method.genotypingMethods[1] : null}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={this.state.genotyping2Disabled}>
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Exome sequencing</option>
                    <option>Genotyping</option>
                    <option>HRM</option>
                    <option>PCR</option>
                    <option>Sanger</option>
                    <option>Whole genome shotgun sequencing</option>
                </Input>
                <Input type="select" ref="entiregene" label="Entire gene sequenced?:" defaultValue="none" value={curator.booleanToDropdown(method.entireGeneSequenced)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Yes</option>
                    <option>No</option>
                </Input>
                <Input type="select" ref="copyassessed" label="Copy number assessed?:" defaultValue="none" value={curator.booleanToDropdown(method.copyNumberAssessed)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Yes</option>
                    <option>No</option>
                </Input>
                <Input type="select" ref="mutationsgenotyped" label="Specific mutations genotyped?:" defaultValue="none" value={curator.booleanToDropdown(method.specificMutationsGenotyped)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Yes</option>
                    <option>No</option>
                </Input>
                <Input type="textarea" ref="specificmutation" label="Description of Methods by which specific mutations genotyped:" rows="5" value={method.specificMutationsGenotypedMethod}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                {family ?
                    <Input type="textarea" ref="additionalinfomethod" label="Additional Information about Family Method:" rows="8" value={method.additionalInformation}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                : null}
            </div>
        );
    },

    // Create method object based on the form values
    create: function() {
        var newMethod = {};
        var value1, value2;

        // Put together a new 'method' object
        value1 = this.getFormValue('prevtesting');
        if (value1 !== 'none') {
            newMethod.previousTesting = value1 === 'Yes';
        }
        value1 = this.getFormValue('prevtestingdesc');
        if (value1) {
            newMethod.previousTestingDescription = value1;
        }
        value1 = this.getFormValue('genomewide');
        if (value1 !== 'none') {
            newMethod.genomeWideStudy = value1 === 'Yes';
        }
        value1 = this.getFormValue('genotypingmethod1');
        value2 = this.getFormValue('genotypingmethod2');
        if (value1 !== 'none' || value2 !== 'none') {
            newMethod.genotypingMethods = _([value1, value2]).filter(function(val) {
                return val !== 'none';
            });
        }
        value1 = this.getFormValue('entiregene');
        if (value1 !== 'none') {
            newMethod.entireGeneSequenced = value1 === 'Yes';
        }
        value1 = this.getFormValue('copyassessed');
        if (value1 !== 'none') {
            newMethod.copyNumberAssessed = value1 === 'Yes';
        }
        value1 = this.getFormValue('mutationsgenotyped');
        if (value1 !== 'none') {
            newMethod.specificMutationsGenotyped = value1 === 'Yes';
        }
        value1 = this.getFormValue('specificmutation');
        if (value1) {
            newMethod.specificMutationsGenotypedMethod = value1;
        }
        value1 = this.getFormValue('additionalinfomethod');
        if (value1) {
            newMethod.additionalInformation = value1;
        }
        newMethod.dateTime = moment().format();

        return Object.keys(newMethod).length ? newMethod : null;
    },

};
