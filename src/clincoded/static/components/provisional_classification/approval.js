'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { getAffiliationApprover } from '../../libs/get_affiliation_approver';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';
import * as CuratorHistory from '../curator_history';
import * as curator from '../curator';
const CurationMixin = curator.CurationMixin;

const ClassificationApproval = module.exports.ClassificationApproval = createReactClass({
    mixins: [RestMixin, FormMixin, CurationMixin, CuratorHistory],

    propTypes: {
        gdm: PropTypes.object,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        provisional: PropTypes.object,
        classification: PropTypes.string,
        classificationStatus: PropTypes.string,
        affiliation: PropTypes.object, // User's affiliation
        updateSnapshotList: PropTypes.func,
        updateProvisionalObj: PropTypes.func
    },

    getInitialState() {
        return {
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalDate: this.props.provisional && this.props.provisional.approvalDate ? this.props.provisional.approvalDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            approvalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            affiliationApprovers: undefined,
            isApprovalPreview: this.props.provisional && this.props.provisional.classificationStatus === 'Approved' ? true : false,
            isApprovalEdit: false
        };
    },

    componentDidMount() {
        this.getAffiliationApprovers();
    },

    componentWillReceiveProps(nextProps) {
        if (this.props.interpretation && Object.keys(this.props.interpretation).length) {
            if (nextProps.provisional) {
                this.setState({
                    approvalDate: nextProps.provisional.approvalDate,
                    approvalReviewDate: nextProps.provisional.approvalReviewDate,
                    approvalComment: nextProps.provisional.approvalComment,
                    approvalSubmitter: nextProps.provisional.approvalSubmitter,
                    classificationApprover: nextProps.provisional.classificationApprover
                });
            }
        }
    },

    getAffiliationApprovers() {
        const provisional = this.props.provisional;
        let provisionalAffiliation = provisional && provisional.affiliation ? provisional.affiliation : null;
        let userAffiliation = this.props.affiliation ? this.props.affiliation.affiliation_id : null;
        if ((provisionalAffiliation || userAffiliation) && !provisional.approvedClassification) {
            let affiliationId = provisionalAffiliation ? provisionalAffiliation : userAffiliation;
            let approvers = getAffiliationApprover(affiliationId);
            if (approvers.length > 0) {
                this.setState({affiliationApprovers: approvers.sort()}, () => {
                    if (provisional && provisional.classificationApprover) {
                        this.setState({classificationApprover: provisional.classificationApprover}, () => {
                            this.approverInput.setValue(this.state.classificationApprover && this.state.affiliationApprovers ? this.state.classificationApprover : 'none');
                        });
                    }
                });
            } else {
                if (provisional && provisional.classificationApprover) {
                    this.setState({classificationApprover: provisional.classificationApprover});
                } else {
                    this.setState({classificationApprover: getAffiliationName(affiliationId)});
                }
            }
        }
    },

    handleReviewDateChange(approvalReviewDate) {
        this.setState({approvalReviewDate});
    },

    /**
     * Method to handle previewing classificaiton approval form
     */
    handlePreviewApproval() {
        let approver = this.approverInput ? this.approverInput.getValue() : this.props.session.user_properties.title;
        let formErr = false;

        if (approver && approver !== 'none') {
            const approvalComment = this.approvalCommentInput.getValue();
            this.setState({
                approvalSubmitter: this.props.session.user_properties.title,
                approvalComment: approvalComment.length ? approvalComment : undefined,
                classificationApprover: approver
            }, () => {
                this.setState({isApprovalPreview: true});
                formErr = false;
            });
        } else {
            formErr = true;
            this.setFormErrors(this.approverInput, 'Select an approver');
            return false;
        }
    },

    /**
     * Method to handle resetting the approval form data
     */
    handleCancelApproval() {
        this.setState({
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            isApprovalPreview: false
        });
    },

    /**
     * Method to handle editing classificaiton approval form
     */
    handleEditApproval() {
        this.setState({isApprovalPreview: false});
    },

    /**
     * Method to handle submitting classificaiton approval form
     */
    submitForm(e) {
        e.preventDefault();
        e.stopPropagation();
        let newProvisional = this.props.provisional.uuid ? curator.flatten(this.props.provisional) : {};
        newProvisional.classificationStatus = 'Approved';
        newProvisional.approvedClassification = true;
        newProvisional.approvalSubmitter = this.state.approvalSubmitter;
        newProvisional.classificationApprover = this.state.classificationApprover;
        newProvisional.approvalDate = moment().toISOString();
        newProvisional.approvalReviewDate = this.state.approvalReviewDate;
        if (this.state.approvalComment && this.state.approvalComment.length) {
            newProvisional.approvalComment = this.state.approvalComment;
        } else {
            if (newProvisional.approvalComment) {
                delete newProvisional['approvalComment'];
            }
        }

        if (this.props.gdm && Object.keys(this.props.gdm).length) {
            // Update existing provisional data object
            return this.putRestData('/provisional/' + this.props.provisional.uuid, newProvisional).then(data => {
                let provisionalClassification = data['@graph'][0];
                this.props.updateProvisionalObj(provisionalClassification['@id']);
                // Record classification approval history
                let meta = {
                    provisionalClassification: {
                        gdm: this.props.gdm['@id'],
                        alteredClassification: provisionalClassification.alteredClassification,
                        classificationStatus: provisionalClassification.classificationStatus
                    }
                };
                this.recordHistory('modify', provisionalClassification, meta);
                return Promise.resolve(provisionalClassification);
            }).then(result => {
                // get a fresh copy of the gdm object
                this.getRestData('/gdm/' + this.props.gdm.uuid, null, true).then(newGdm => {
                    let newSnapshot = {
                        resourceId: result.uuid,
                        resourceType: 'classification',
                        approvalStatus: 'Approved',
                        resource: result,
                        resourceParent: newGdm,
                        associatedSnapshot: this.state.provisionalSnapshots && this.state.provisionalSnapshots[0],
                        primary: result['@id']
                    };
                    this.postRestData('/snapshot/', newSnapshot).then(response => {
                        let approvalSnapshot = response['@graph'][0];
                        this.props.updateSnapshotList(approvalSnapshot['@id']);
                    }).catch(err => {
                        console.log('Saving approval snapshot error = : %o', err);
                    });
                });
            }).catch(err => {
                console.log('Classification approval submission error = : %o', err);
            });
        } else if (this.props.interpretation && Object.keys(this.props.interpretation).length) {
            // Update existing classification data and its parent interpretation
            return this.putRestData('/provisional-variant/' + this.props.provisional.uuid, newProvisional).then(data => {
                let provisionalClassification = data['@graph'][0];
                this.props.updateProvisionalObj(provisionalClassification['@id']);
                // Record classification approval history
                let meta = {
                    provisionalClassification: {
                        interpretation: this.props.interpretation['@id'],
                        alteredClassification: provisionalClassification.alteredClassification,
                        classificationStatus: provisionalClassification.classificationStatus
                    }
                };
                // this.recordHistory('modify', provisionalClassification, meta);
                return Promise.resolve(provisionalClassification);
            }).then(result => {
                // get a fresh copy of the interpretation object
                this.getRestData('/interpretation/' + this.props.interpretation.uuid, null, true).then(newInterpretation => {
                    let newSnapshot = {
                        resourceId: result.uuid,
                        resourceType: 'interpretation',
                        approvalStatus: 'Approved',
                        resource: result,
                        resourceParent: newInterpretation,
                        associatedSnapshot: this.state.provisionalSnapshots && this.state.provisionalSnapshots[0],
                        primary: result['@id']
                    };
                    this.postRestData('/snapshot/', newSnapshot).then(response => {
                        let approvalSnapshot = response['@graph'][0];
                        this.props.updateSnapshotList(approvalSnapshot['@id']);
                    }).catch(err => {
                        console.log('Saving approval snapshot error = : %o', err);
                    });
                });
            }).catch(err => {
                console.log('Classification approval submission error = : %o', err);
            });
        }
    },

    render() {
        const approvalSubmitter = this.state.approvalSubmitter;
        const classificationApprover = this.state.classificationApprover;
        const approvalReviewDate = this.state.approvalReviewDate ? moment(this.state.approvalReviewDate).format('MM/DD/YYYY') : '';
        const approvalDate = this.state.approvalDate ? moment(this.state.approvalDate).format('YYYY MM DD, h:mm a') : moment().format('YYYY MM DD, h:mm a');
        const approvalComment = this.state.approvalComment && this.state.approvalComment.length ? this.state.approvalComment : '';
        const session = this.props.session;
        const provisional = this.props.provisional;
        const classification = this.props.classification;
        const affiliation = provisional.affiliation ? provisional.affiliation : (this.props.affiliation ? this.props.affiliation : null);
        const affiliationApprovers = this.state.affiliationApprovers;

        return (
            <div className="final-approval-panel-content">
                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                    {this.state.isApprovalPreview ?
                        <div className="approval-preview">
                            <div className="col-md-12 approval-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="approval-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="approval-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Approved Classification entered by:</span></dt>
                                            <dd>{approvalSubmitter ? approvalSubmitter : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="classification-approver">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Approver:</span></dt>
                                            <dd>{classificationApprover}</dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <div className="approval-date">
                                        <dl className="inline-dl clearfix preview-approval-date">
                                            <dt><span>Date saved as Approved:</span></dt>
                                            <dd><span>{approvalDate ? formatDate(parseDate(approvalDate), "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        </dl>
                                    </div>
                                    <div className="approval-review-date">
                                        <dl className="inline-dl clearfix preview-approval-review-date">
                                            <dt><span>Date reviewed:</span></dt>
                                            <dd><span>{approvalReviewDate ? formatDate(parseDate(approvalReviewDate), "YYYY MMM DD") : null}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="approval-comments">
                                        <dl className="inline-dl clearfix preview-approval-comment">
                                            <dt><span>Additional comments:</span></dt>
                                            <dd><span>{approvalComment ? approvalComment : null}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-12 alert alert-warning approval-preview-note">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview; you must Submit.
                                {this.props.interpretation && Object.keys(this.props.interpretation).length ?
                                    <strong>Approving an Interpretation does not submit it to ClinVar.</strong>
                                    : null}
                            </div>
                        </div>
                        :
                        <div className="approval-edit">
                            <div className="col-md-12 approval-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="approval-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="approval-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Entered by:</span></dt>
                                            <dd>{approvalSubmitter ? approvalSubmitter : null}</dd>
                                        </dl>
                                    </div>
                                    {affiliation && affiliation.length ?
                                        <div className="classification-approver">
                                            {affiliationApprovers && affiliationApprovers.length ?
                                                <Input type="select" ref={(input) => { this.approverInput = input; }} label="Approver:"
                                                    error={this.getFormError(this.approverInput)} clearError={this.clrFormErrors.bind(null, this.approverInput)}
                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                                    defaultValue={classificationApprover}>
                                                    <option value="none">Select Approver</option>
                                                    <option value="" disabled className="divider"></option>
                                                    {affiliationApprovers.map((member, i) => {
                                                        return <option key={i} value={member}>{member}</option>;
                                                    })}
                                                </Input>
                                                :
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Approver:</span></dt>
                                                    <dd>{classificationApprover}</dd>
                                                </dl>
                                            }
                                        </div>
                                        : null}
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <div className="approval-review-date">
                                        <div className="form-group">
                                            <label className="col-sm-5 control-label">Date reviewed:</label>
                                            <div className="col-sm-7">
                                                <DayPickerInput
                                                    value={approvalReviewDate}
                                                    onDayChange={this.handleReviewDateChange}
                                                    formatDate={formatDate}
                                                    parseDate={parseDate}
                                                    placeholder={`${formatDate(new Date())}`}
                                                    dayPickerProps={{
                                                        selectedDays: approvalReviewDate ? parseDate(approvalReviewDate) : undefined,
                                                        disabledDays: {
                                                            daysOfWeek: [0, 6]
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="approval-comments">
                                        <Input type="textarea" ref={(input) => { this.approvalCommentInput = input; }}
                                            label="Additional comments:" value={approvalComment} rows="5"
                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    <div className="col-md-12 approval-form-buttons-wrapper">
                        {this.state.isApprovalPreview ?
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer"
                                    onClick={this.handleCancelApproval}>
                                    Cancel Approval
                                </button>
                                <button type="button" className="btn btn-info btn-inline-spacer"
                                    onClick={this.handleEditApproval}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-inline-spacer pull-right">
                                    Submit Approval <i className="icon icon-check-square-o"></i>
                                </button>
                            </div>
                            :
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer pull-right"
                                    onClick={this.handlePreviewApproval}>
                                    Preview Approval
                                </button>
                            </div>
                        }
                    </div>
                </Form>
            </div>
        );
    }
});