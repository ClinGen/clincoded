'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { RestMixin } from '../rest';
import { Input } from '../../libs/bootstrap/form';
import ModalComponent from '../../libs/bootstrap/modal';
import { showActivityIndicator } from '../activity_indicator';

const ClinVarSubmissionData = module.exports.ClinVarSubmissionData = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        affiliationID: PropTypes.string,
        isApprovalActive: PropTypes.string,
        isPublishEventActive: PropTypes.bool,
        resourceUUID: PropTypes.string
    },

    /**
     * Method to initialize component state
     */
    getInitialState: function() {
        return {
            isClinVarSubmissionActive: false,
            generatedClinVarSubmissionData: null,
            failureMessage: null,
            elementIDToCopy: null
        };
    },

    /**
     * Method to handle user's response (Copy/Close) to ClinVar Submission Data modal
     * @param {object} e - The submitted event object
     * @param {string} buttonSelected - String value of the button/response selected by the user
     */
    handleClinVarSubmissionDataResponse: function(e, buttonSelected) {
        e.preventDefault();
        e.stopPropagation();

        if (buttonSelected === 'Copy') {
            try {
                const dataElement = document.getElementById(this.state.elementIDToCopy);

                // Highlight and copy (to clipboard) ClinVar submission data
                dataElement.contentEditable = 'true';
                window.getSelection().selectAllChildren(dataElement);
                document.execCommand('copy');
            } catch (error) {
                console.log('Copying data to clipboard failed');
            }
        }

        this.child.closeModal();
    },

    /**
     * Method to generate ClinVar submission data (for a submission spreadsheet)
     * @param {string} resourceType - The type of the data's source object (e.g. snapshot)
     * @param {string} resourceUUID - The UUID of the data's source object
     */
    generateClinVarSubmissionData: function(resourceType, resourceUUID) {
        return new Promise((resolve, reject) => {
            if (resourceType && resourceUUID) {
                this.getRestData('/generate-clinvar-data?type=' + resourceType + '&uuid=' + resourceUUID, null, false).then(result => {
                    if (result.status === 'Success') {
                        resolve(result);
                    } else {
                        console.log('Data generation failure: %s', result.message);
                        reject(result);
                    }
                }).catch(error => {
                    console.log('Internal data retrieval error: %o', error);
                    if (error && !error.message) {
                        error.message = 'Internal data retrieval error';
                    }
                    reject(error);
                });
            } else {
                reject({'message': 'Missing expected parameters'});
            }
        });
    },

    /**
     * Method to store (as state) ClinVar submission data
     * @param {string} resourceType - The type of the data's source object (e.g. snapshot)
     * @param {string} resourceUUID - The UUID of the data's source object
     */
    storeClinVarSubmissionData: function(resourceType, resourceUUID) {
        const isClinVarSubmissionActive = this.state.isClinVarSubmissionActive;

        if (!isClinVarSubmissionActive && resourceType && resourceUUID) {
            this.setState({isClinVarSubmissionActive: true}, () => {
                this.generateClinVarSubmissionData(resourceType, resourceUUID).then(response => {
                    if (response && response.message) {
                        const elementIDToCopy = response.message.status && response.message.status.errorCount > 0 ?
                            '' : 'generated-clinvar-submission-data';

                        this.setState({isClinVarSubmissionActive: false, generatedClinVarSubmissionData: response.message,
                            failureMessage: null, elementIDToCopy: elementIDToCopy});
                    } else {
                        this.setState({isClinVarSubmissionActive: false, failureMessage: 'Error generating data.'});
                    }
                }).catch(error => {
                    const failureMessage = 'Error generating data' + (error && error.message ? ': ' + error.message : '.');
                    console.log('Data generation error: %o', error);
                    this.setState({isClinVarSubmissionActive: false, failureMessage: failureMessage});
                });
            });
        }
    },

    /**
     * Method to render ClinVar submission data
     */
    renderClinVarSubmissionData: function() {
        const generatedClinVarSubmissionData = this.state.generatedClinVarSubmissionData ? this.state.generatedClinVarSubmissionData : {};

        if (generatedClinVarSubmissionData.status && generatedClinVarSubmissionData.status.totalRecords > 0 &&
            generatedClinVarSubmissionData.variants && Array.isArray(generatedClinVarSubmissionData.variants)) {
            return (
                <table>
                    <tbody>
                        {generatedClinVarSubmissionData.variants.map((variant, variantIndex) => {
                            let submissionErrors = {};

                            // If record/variant has errors, save them (at a key that corresponds to the matching index within the data)
                            if (variant.errors && Array.isArray(variant.errors) && variant.errors.length > 0 &&
                                variant.submission && Array.isArray(variant.submission) && variant.submission.length > 0) {
                                variant.errors.forEach(error => {
                                    if (error.errorCode && typeof error.errorCode === 'string' &&
                                        error.errorMessage && typeof error.errorMessage === 'string') {
                                        variant.submission.forEach((data, dataIndex) => {
                                            if (typeof data === 'string' && data.indexOf(error.errorCode) > -1) {
                                                submissionErrors[dataIndex] = error.errorMessage;
                                            }
                                        });
                                    }
                                });
                            }

                            return (
                                <tr key={'submission-data-row-' + variantIndex}>
                                    {variant.submission && Array.isArray(variant.submission) ?
                                        variant.submission.map((column, columnIndex) => {
                                            if (submissionErrors[columnIndex]) {
                                                return (
                                                    <td key={'submission-data-row-' + variantIndex + '-column-' + columnIndex}
                                                        className="error-column">{column}
                                                        <span data-toggle="tooltip" data-placement="top" data-tooltip={submissionErrors[columnIndex]}>
                                                            <i className="icon icon-info-circle"></i>
                                                        </span>
                                                    </td>
                                                );
                                            } else {
                                                return (<td key={'submission-data-row-' + variantIndex + '-column-' + columnIndex}>{column}</td>);
                                            }
                                        })
                                        :
                                        <td colSpan="96"></td>
                                    }
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            );
        } else {
            return null;
        }
    },

    /**
     * Method to render the component
     */
    render: function() {
        const isClinVarSubmissionActive = this.state.isClinVarSubmissionActive;
        const generatedClinVarSubmissionData = this.state.generatedClinVarSubmissionData;
        const failureMessage = this.state.failureMessage;
        const disableCopyButton = this.state.elementIDToCopy ? false : true;
        const affiliationID = this.props.affiliationID;
        const isPublishEventActive = this.props.isPublishEventActive;
        const isApprovalActive = this.props.isApprovalActive;
        const resourceUUID = this.props.resourceUUID;

        // Criteria to render ClinVar submission button/modal: affiliation has been provided (affiliationID) and neither a publish
        //  event (!isPublishEventActive) nor the approval process (!isApprovalActive) is currently in progress
        if (affiliationID && !isPublishEventActive && !isApprovalActive) {
            return (
                <ModalComponent modalTitle="ClinVar Submission Data" modalClass="modal-clinvar" modalWrapperClass="clinvar-submission-modal"
                    bootstrapBtnClass="btn btn-default clinvar-submission-link-item" actuatorClass="" actuatorTitle="ClinVar Submission Data"
                    onRef={ref => (this.child = ref)}>
                    <div className="modal-body" id="generated-clinvar-submission-data">
                        {generatedClinVarSubmissionData ?
                            this.renderClinVarSubmissionData()
                            : isClinVarSubmissionActive ?
                                showActivityIndicator('Generating... ')
                                :
                                <Input type="button" inputClassName="btn-default btn-inline-spacer"
                                    clickHandler={this.storeClinVarSubmissionData.bind(null, 'snapshot', resourceUUID)} title="Generate" />
                        }{failureMessage ?
                            <div className="clinvar-submission-failure">{failureMessage}</div>
                            : null}
                    </div>
                    <div className="modal-footer">
                        <Input type="button" inputClassName="btn-default btn-inline-spacer clinvar-submission" inputDisabled={disableCopyButton}
                            clickHandler={(e) => this.handleClinVarSubmissionDataResponse(e, 'Copy')} title="Copy (to clipboard)" />
                        <Input type="button" inputClassName="btn-default btn-inline-spacer clinvar-submission"
                            clickHandler={(e) => this.handleClinVarSubmissionDataResponse(e, 'Close')} title="Close" />
                    </div>
                </ModalComponent>
            );
        } else {
            return null;
        }
    }
});