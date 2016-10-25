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
    // 'caseControl' is boolean value if this is a method for case-control.
    render: function(method, family, caseControl, prefix) {
        return (
            <div className={(caseControl) ? 'row section section-method' : 'row'}>
                {(caseControl) ? <h3><i className="icon icon-chevron-right"></i> Methods</h3> : null}
                <Input type="select" ref={prefix ? prefix + 'prevtesting' : 'prevtesting'} label="Previous Testing:" defaultValue="none"
                    value={curator.booleanToDropdown(method.previousTesting)} labelClassName="col-sm-5 control-label"
                    wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                <Input type="textarea" ref={prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'} label="Description of Previous Testing:" rows="5"
                    value={method.previousTestingDescription} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                    groupClassName="form-group" />
                <Input type="select" ref={prefix ? prefix + 'genomewide' : 'genomewide'} 
                    label="Were genome-wide analysis methods used to identify the variant(s) described in this publication?:"
                    defaultValue="none" value={curator.booleanToDropdown(method.genomeWideStudy)} labelClassName="col-sm-5 control-label"
                    wrapperClassName="col-sm-7 label-box-match-middle" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                <h4 className="col-sm-7 col-sm-offset-5">Genotyping Method</h4>
                <Input type="select" ref={prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'} label="Method 1:" handleChange={this.handleChange}
                    defaultValue="none" value={method.genotypingMethods && method.genotypingMethods[0] ? method.genotypingMethods[0] : null}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Exome sequencing">Exome sequencing</option>
                    <option value="Genotyping">Genotyping</option>
                    <option value="High resolution melting">High resolution melting</option>
                    <option value="PCR">PCR</option>
                    <option value="Sanger sequencing">Sanger sequencing</option>
                    <option value="Whole genome shotgun sequencing">Whole genome shotgun sequencing</option>
                </Input>
                <Input type="select" ref={prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'} label="Method 2:" defaultValue="none"
                    value={method.genotypingMethods && method.genotypingMethods[1] ? method.genotypingMethods[1] : null} labelClassName="col-sm-5 control-label"
                    wrapperClassName="col-sm-7" groupClassName="form-group"
                    inputDisabled={prefix ? (prefix === 'caseCohort_' ? this.state.caseCohort_genotyping2Disabled : this.state.controlCohort_genotyping2Disabled) : this.state.genotyping2Disabled}>
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Exome sequencing">Exome sequencing</option>
                    <option value="Genotyping">Genotyping</option>
                    <option value="High resolution melting">High resolution melting</option>
                    <option value="PCR">PCR</option>
                    <option value="Sanger sequencing">Sanger sequencing</option>
                    <option value="Whole genome shotgun sequencing">Whole genome shotgun sequencing</option>
                </Input>
                <Input type="select" ref={prefix ? prefix + 'entiregene' : 'entiregene'} label="Entire gene sequenced?:" defaultValue="none"
                    value={curator.booleanToDropdown(method.entireGeneSequenced)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                    groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                <Input type="select" ref={prefix ? prefix + 'copyassessed' : 'copyassessed'} label="Copy number assessed?:" defaultValue="none"
                    value={curator.booleanToDropdown(method.copyNumberAssessed)} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                    groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                <Input type="select" ref={prefix ? prefix + 'mutationsgenotyped' : 'mutationsgenotyped'} label="Specific mutations genotyped?:" 
                    defaultValue="none" value={curator.booleanToDropdown(method.specificMutationsGenotyped)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                <Input type="textarea" ref={prefix ? prefix + 'specificmutation' : 'specificmutation'} label="Description of genotyping method:"
                    rows="5" value={method.specificMutationsGenotypedMethod} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                    groupClassName="form-group" />
                {family ?
                    <Input type="textarea" ref={prefix ? prefix + 'additionalinfomethod' : 'additionalinfomethod'} label="Additional Information about Family Method:"
                        rows="8" value={method.additionalInformation} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                        groupClassName="form-group" />
                : null}
            </div>
        );
    },

    // Create method object based on the form values
    create: function(prefix) {
        var newMethod = {};
        var value1, value2;

        // Put together a new 'method' object
        value1 = this.getFormValue(prefix ? prefix + 'prevtesting' : 'prevtesting');
        if (value1 !== 'none') {
            newMethod.previousTesting = value1 === 'Yes';
        }
        value1 = this.getFormValue(prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc');
        if (value1) {
            newMethod.previousTestingDescription = value1;
        }
        value1 = this.getFormValue(prefix ? prefix + 'genomewide' : 'genomewide');
        if (value1 !== 'none') {
            newMethod.genomeWideStudy = value1 === 'Yes';
        }
        value1 = this.getFormValue(prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1');
        value2 = this.getFormValue(prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2');
        if (value1 !== 'none' || value2 !== 'none') {
            newMethod.genotypingMethods = _([value1, value2]).filter(function(val) {
                return val !== 'none';
            });
        }
        value1 = this.getFormValue(prefix ? prefix + 'entiregene' : 'entiregene');
        if (value1 !== 'none') {
            newMethod.entireGeneSequenced = value1 === 'Yes';
        }
        value1 = this.getFormValue(prefix ? prefix + 'copyassessed' : 'copyassessed');
        if (value1 !== 'none') {
            newMethod.copyNumberAssessed = value1 === 'Yes';
        }
        value1 = this.getFormValue(prefix ? prefix + 'mutationsgenotyped' : 'mutationsgenotyped');
        if (value1 !== 'none') {
            newMethod.specificMutationsGenotyped = value1 === 'Yes';
        }
        value1 = this.getFormValue(prefix ? prefix + 'specificmutation' : 'specificmutation');
        if (value1) {
            newMethod.specificMutationsGenotypedMethod = value1;
        }
        value1 = this.getFormValue(prefix ? prefix + 'additionalinfomethod' : 'additionalinfomethod');
        if (value1) {
            newMethod.additionalInformation = value1;
        }
        newMethod.dateTime = moment().format();

        return Object.keys(newMethod).length ? newMethod : null;
    }

};
