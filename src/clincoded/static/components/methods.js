'use strict';
import React from 'react';
import _ from 'underscore';
import moment from 'moment';
import { Input } from '../libs/bootstrap/form';
import * as curator from './curator';

// Utilities so any pages that have a Methods panel can use this shared code
// To display the panel, and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
// with <method>.call(this).
module.exports = {

    // Render a Methods panel.
    // evidenceType: type of evidence being curated (group, family, individual or case-control)
    // prefix: prefix to default form field names (only necessary for case-control)
    // parentMethod: methods data of "parent" evidence (e.g. a family's associated group)
    // parentName: name of "parent" evidence (Group or Family)
    render: function(method, evidenceType, prefix, parentMethod, parentName) {
        let isFamily = false;
        let isCaseControl = false;
        let hasParentMethods = false;
        let headerLabel;
        let specificMutationPlaceholder = 'Note any aspects of the genotyping method that may impact the strength of this evidence. For example: Was the entire gene sequenced, or were a few specific variants genotyped? Was copy number assessed?';

        if (evidenceType === 'individual' || evidenceType === 'family') {
            if (parentMethod && ((parentMethod.previousTesting === true || parentMethod.previousTesting === false) || parentMethod.previousTestingDescription ||
                (parentMethod.genomeWideStudy === true || parentMethod.genomeWideStudy === false) || parentMethod.genotypingMethods.length ||
                parentMethod.specificMutationsGenotypedMethod) && parentName) {
                hasParentMethods = true;
            }

            if (evidenceType === 'family') {
                isFamily = true;
            }
        } else if (evidenceType === 'case-control') {
            isCaseControl = true;

            if (prefix === 'caseCohort_') {
                headerLabel = 'CASE';
            }
            if (prefix === 'controlCohort_') {
                headerLabel = 'CONTROL';
            }
        }

        return (
            <div className={(isCaseControl) ? 'row section section-method' : 'row'}>
                {(isCaseControl) ? <h3><i className="icon icon-chevron-right"></i> Methods <span className="label label-group">{headerLabel}</span></h3> : null}
                {hasParentMethods ?
                    <Input type="button" ref="copyparentmethods" wrapperClassName="col-sm-7 col-sm-offset-5 methods-copy" inputClassName="btn-copy btn-sm"
                        title={'Copy Methods from Associated ' + parentName} clickHandler={module.exports.copy.bind(this, parentMethod, isCaseControl, prefix)} />
                    : null}
                {hasParentMethods ? curator.renderParentEvidence('Previous Testing Associated with ' + parentName + ':',
                    (parentMethod.previousTesting === true ? 'Yes' : (parentMethod.previousTesting === false ? 'No' : ''))) : null}
                <Input type="select" ref={prefix ? prefix + 'prevtesting' : 'prevtesting'} label="Previous Testing:" defaultValue="none"
                    value={curator.booleanToDropdown(method.previousTesting)} labelClassName="col-sm-5 control-label"
                    wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </Input>
                {hasParentMethods ? curator.renderParentEvidence('Description of Previous Testing Associated with ' + parentName + ':', parentMethod.previousTestingDescription) : null}
                <Input type="textarea" ref={prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'} label="Description of Previous Testing:" rows="5"
                    value={method.previousTestingDescription} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                    groupClassName="form-group" />
                {hasParentMethods ? curator.renderParentEvidence('Answer to Genome-Wide Analysis Methods Question Associated with ' + parentName + ':',
                    (parentMethod.genomeWideStudy === true ? 'Yes' : (parentMethod.genomeWideStudy === false ? 'No' : ''))) : null}
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
                {hasParentMethods ? curator.renderParentEvidence('Method 1 Associated with ' + parentName + ':', parentMethod.genotypingMethods[0]) : null}
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
                {hasParentMethods ? curator.renderParentEvidence('Method 2 Associated with ' + parentName + ':', parentMethod.genotypingMethods[1]) : null}
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
                {hasParentMethods ? curator.renderParentEvidence('Description of genotyping method Associated with ' + parentName + ':', parentMethod.specificMutationsGenotypedMethod) : null}
                <Input type="textarea" ref={prefix ? prefix + 'specificmutation' : 'specificmutation'} label="Description of genotyping method:"
                    rows="5" value={method.specificMutationsGenotypedMethod} placeholder={specificMutationPlaceholder} labelClassName="col-sm-5 control-label"
                    wrapperClassName="col-sm-7" groupClassName="form-group" />
                {isFamily ?
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
    },

    // Copy methods data from source object into form fields (expected to be initiated by a button click)
    copy: function(sourceMethod, isCaseControl, prefix, e) {
        e.preventDefault(); e.stopPropagation();

        if (sourceMethod.previousTesting === true) {
            this.refs[prefix ? prefix + 'prevtesting' : 'prevtesting'].setValue('Yes');
        } else if (sourceMethod.previousTesting === false) {
            this.refs[prefix ? prefix + 'prevtesting' : 'prevtesting'].setValue('No');
        }

        if (sourceMethod.previousTestingDescription) {
            this.refs[prefix ? prefix + 'prevtestingdesc' : 'prevtestingdesc'].setValue(sourceMethod.previousTestingDescription);
        }

        if (sourceMethod.genomeWideStudy === true) {
            this.refs[prefix ? prefix + 'genomewide' : 'genomewide'].setValue('Yes');
        } else if (sourceMethod.genomeWideStudy === false) {
            this.refs[prefix ? prefix + 'genomewide' : 'genomewide'].setValue('No');
        }

        if (sourceMethod.genotypingMethods[0]) {
            this.refs[prefix ? prefix + 'genotypingmethod1' : 'genotypingmethod1'].setValue(sourceMethod.genotypingMethods[0]);

            // Check if the "Method 2" drop-down needs to be enabled
            if (isCaseControl) {
                if (prefix === 'caseCohort_') {
                    if (this.state.caseCohort_genotyping2Disabled === true && sourceMethod.genotypingMethods[0] !== 'none') {
                        this.setState({caseCohort_genotyping2Disabled: false});
                    }
                } else if (this.state.controlCohort_genotyping2Disabled === true && sourceMethod.genotypingMethods[0] !== 'none') {
                    this.setState({controlCohort_genotyping2Disabled: false});
                }
            } else if (this.state.genotyping2Disabled === true && sourceMethod.genotypingMethods[0] !== 'none') {
                this.setState({genotyping2Disabled: false});
            }

            if (sourceMethod.genotypingMethods[1]) {
                this.refs[prefix ? prefix + 'genotypingmethod2' : 'genotypingmethod2'].setValue(sourceMethod.genotypingMethods[1]);
            }
        }

        if (sourceMethod.specificMutationsGenotypedMethod) {
            this.refs[prefix ? prefix + 'specificmutation' : 'specificmutation'].setValue(sourceMethod.specificMutationsGenotypedMethod);
        }
    }
};
