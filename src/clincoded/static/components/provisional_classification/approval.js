'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { RestMixin } from '../rest';
import { PanelGroup, Panel } from '../../libs/bootstrap/panel';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';
import * as CuratorHistory from '../curator_history';
import * as curator from '../curator';
const CurationMixin = curator.CurationMixin;

const ClassificationApproval = module.exports.ClassificationApproval = createReactClass({
    mixins: [RestMixin, FormMixin, CurationMixin, CuratorHistory],

    propTypes: {
        gdm: PropTypes.object,
        session: PropTypes.object,
        provisional: PropTypes.object,
        classification: PropTypes.string,
        affiliation: PropTypes.object // User's affiliation
    },

    getInitialState: function() {
        return {
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            classificationApprovalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            affiliatedMembers: undefined,
            isApprovalPreview: false,
            isApprovalEdit: false
        };
    },

    componentDidMount() {
        this.getAffiliatedMembers();
    },

    getAffiliatedMembers() {
        const provisional = this.props.provisional;
        let provisionalAffiliation = provisional && provisional.affiliation ? provisional.affiliation : null;
        let userAffiliation = this.props.affiliation ? this.props.affiliation.affiliation_id : null;
        if (provisionalAffiliation || userAffiliation) {
            this.getRestData('/search/?type=user&affiliation=' + (provisionalAffiliation ? provisionalAffiliation : userAffiliation), null).then(data => {
                // Handle affiliated members result
                let affiliatedMembers = [];
                affiliatedMembers = data['@graph'].map(result => { return result['title']; });
                if (affiliatedMembers.length > 0) {
                    this.setState({affiliatedMembers: affiliatedMembers.sort()}, () => {
                        if (provisional && provisional.classificationApprover) {
                            this.setState({classificationApprover: provisional.classificationApprover}, () => {
                                this.approverInput.setValue(this.state.classificationApprover && this.state.affiliatedMembers ? this.state.classificationApprover : 'none');
                            });
                        }
                    });
                }
            }).catch(err => {
                console.warn('Affiliated users fetch error=: %o', err);
            });
        }
    },

    handleApproverSelect() {
        const approver = this.approverInput.getValue();
        this.setState({classificationApprover: approver});
    },

    handleReviewDateChange(approvalReviewDate) {
        this.setState({approvalReviewDate});
    },

    /**
     * Method to handle previewing classificaiton approval form
     */
    handlePreviewApproval() {
        let approver = this.approverInput.getValue();
        let formErr = false;

        if (approver && approver !== 'none') {
            const approvalComment = this.approvalCommentInput.getValue();
            this.setState({
                classificationApprovalSubmitter: this.props.session.user_properties.title,
                approvalComment: approvalComment.length ? approvalComment : undefined,
                classificationApproverError: false
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
        newProvisional.approvalSubmitter = this.state.classificationApprovalSubmitter;
        newProvisional.classificationApprover = this.state.classificationApprover;
        newProvisional.approvalReviewDate = this.state.approvalReviewDate;
        if (this.state.approvalComment && this.state.approvalComment.length) {
            newProvisional.approvalComment = this.state.approvalComment;
        } else {
            if (newProvisional.approvalComment) {
                delete newProvisional['approvalComment'];
            }
        }
        // Update existing provisional data object
        return this.putRestData('/provisional/' + this.props.provisional.uuid, newProvisional).then(data => {
            let provisionalClassification = data['@graph'][0];
            // Record classification approval history
            let meta = {
                provisionalClassification: {
                    gdm: this.props.gdm['@id'],
                    alteredClassification: provisionalClassification.alteredClassification,
                    classificationStatus: provisionalClassification.classificationStatus
                }
            };
            this.recordHistory('modify', provisionalClassification, meta);
            // Redirect user to the record page
            window.location.href = '/curation-central/?gdm=' + this.props.gdm.uuid;
        }).catch(err => {
            console.log('Classification approval submission error = : %o', err);
        });
    },

    render() {
        const approvalSubmitter = this.state.classificationApprovalSubmitter;
        const classificationApprover = this.state.classificationApprover;
        const approvalReviewDate = this.state.approvalReviewDate ? moment(this.state.approvalReviewDate).format('MM/DD/YYYY') : null;
        const approvalComment = this.state.approvalComment;
        const session = this.props.session;
        const provisional = this.props.provisional;
        const classification = this.props.classification;
        const affiliation = provisional.affiliation ? provisional.affiliation : (this.props.affiliation ? this.props.affiliation : null);
        const affiliatedMembers = this.state.affiliatedMembers;

        return (
            <div className="container classification-approval">
                <PanelGroup>
                    <Panel title="Approve Classification" panelClassName="panel-data">
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            {this.state.isApprovalPreview ?
                                <div className="classification-approval-preview">
                                    <div className="col-md-12 classification-approval-form-content-wrapper">
                                        <div className="col-xs-12 col-sm-4">
                                            <div className="classification-affiliation">
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>ClinGen Affiliation:</span></dt>
                                                    <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                                </dl>
                                            </div>
                                            <div className="classification-approval-submitter">
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Entered by:</span></dt>
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
                                            <div className="classification-review-date">
                                                <dl className="inline-dl clearfix preview-approval-review-date">
                                                    <dt><span>Date reviewed:</span></dt>
                                                    <dd><span>{approvalReviewDate ? formatDate(parseDate(approvalReviewDate), "YYYY MMM DD") : null}</span></dd>
                                                </dl>
                                            </div>
                                        </div>
                                        <div className="col-xs-12 col-sm-5">
                                            <div className="classification-review-comments">
                                                <dl className="inline-dl clearfix preview-approval-comment">
                                                    <dt><span>Additional comments:</span></dt>
                                                    <dd><span>{approvalComment ? approvalComment : null}</span></dd>
                                                </dl>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                :
                                <div className="classification-approval-edit">
                                    <div className="col-md-12 classification-approval-form-content-wrapper">
                                        <div className="col-xs-12 col-sm-4">
                                            <div className="classification-affiliation">
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>ClinGen Affiliation:</span></dt>
                                                    <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                                </dl>
                                            </div>
                                            <div className="classification-approval-submitter">
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Entered by:</span></dt>
                                                    <dd>{approvalSubmitter ? approvalSubmitter : null}</dd>
                                                </dl>
                                            </div>
                                            <div className="classification-approver">
                                                {affiliatedMembers && affiliatedMembers.length ?
                                                    <Input type="select" ref={(input) => { this.approverInput = input; }} label="Approver:"
                                                        error={this.getFormError(this.approverInput)} clearError={this.clrFormErrors.bind(null, this.approverInput)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                                        defaultValue={classificationApprover} handleChange={this.handleApproverSelect}>
                                                        <option value="none">Select Approver</option>
                                                        <option value="" disabled className="divider"></option>
                                                        {affiliatedMembers.map((member, i) => {
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
                                        </div>
                                        <div className="col-xs-12 col-sm-3">
                                            <div className="classification-review-date">
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
                                                                selectedDays: approvalReviewDate ? parseDate(approvalReviewDate) : null,
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
                                            <div className="classification-review-comments">
                                                <Input type="textarea" ref={(input) => { this.approvalCommentInput = input; }}
                                                    label="Additional comments:" value={approvalComment} rows="5"
                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                            <div className="col-md-12 classification-approval-form-buttons-wrapper">
                                {/*
                                <div className="col-xs-12 col-sm-6">
                                    <div className="last-saved-classification-timestamp">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Last Saved Classification:</span></dt>
                                            <dd>
                                                <span>{moment(provisional.last_modified).format("YYYY MMM DD, h:mm a")}</span>
                                                <span>{classification}</span>
                                                <span>{provisional.classificationStatus}</span>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                                */}
                                <div className="classification-approval-buttons">
                                    <button type="button" className="btn btn-default btn-inline-spacer"
                                        onClick={this.handlePreviewApproval} disabled={this.state.isApprovalPreview}>
                                        Preview Approval
                                    </button>
                                    <button type="button" className="btn btn-info btn-inline-spacer"
                                        onClick={this.handleEditApproval} disabled={!this.state.isApprovalPreview}>
                                        Edit <i className="icon icon-pencil"></i>
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-inline-spacer pull-right" disabled={!this.state.isApprovalPreview}>
                                        Submit Approval <i className="icon icon-check-square-o"></i>
                                    </button>
                                </div>
                            </div>
                        </Form>
                    </Panel>
                </PanelGroup>
            </div>
        );
    }
});