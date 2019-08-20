'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import createReactClass from 'create-react-class';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { RestMixin } from '../../rest';
import * as curator from '../../curator';
import * as evidenceCodes from './mapping/evidence_code.json';
import PopOverComponent from '../../../libs/bootstrap/popover';
import AlertMessage from '../../../libs/bootstrap/alert';
import { ProvisionalApproval } from '../../provisional_classification/provisional';
import { ClassificationApproval } from '../../provisional_classification/approval';
import { PublishApproval } from '../../provisional_classification/publish';
import CurationSnapshots from '../../provisional_classification/snapshots';
import { renderSelectedModeInheritance } from '../../../libs/render_mode_inheritance';
import { sortListByDate } from '../../../libs/helpers/sort';
import { allowPublishGlobal } from '../../../libs/allow_publish';
import { sortByStrength } from '../../../libs/sort_eval_criteria';

var EvaluationSummary = module.exports.EvaluationSummary = createReactClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        setProvisionalEvaluation: PropTypes.func,
        calculatedAssertion: PropTypes.string,
        provisionalPathogenicity: PropTypes.string,
        provisionalReason: PropTypes.string,
        evidenceSummary: PropTypes.string,
        affiliation: PropTypes.object,
        session: PropTypes.object,
        demoVersion: PropTypes.bool,
        classificationStatus: PropTypes.string,
        classificationSnapshots: PropTypes.array,
        updateSnapshotList: PropTypes.func,
        updateProvisionalObj: PropTypes.func,
        publishProvisionalReady: PropTypes.bool,
        publishSnapshotListReady: PropTypes.bool,
        publishClassification: PropTypes.bool,
        resetPublishReadyState: PropTypes.func
    },

    getInitialState() {
        return {
            interpretation: this.props.interpretation,
            calculatedAssertion: this.props.calculatedAssertion || 'Uncertain significance - insufficient evidence',
            autoClassification: null,
            modifiedPathogenicity: null,
            provisionalPathogenicity: this.props.provisionalPathogenicity,
            provisionalReason: this.props.provisionalReason,
            evidenceSummary: this.props.evidenceSummary,
            disabledFormSumbit: false,
            submitBusy: false, // spinner for Save button
            alertMsg: null, // status message for Save/Update button
            alertType: null,
            showAlertMessage: false,
            classificationStatus: this.props.classificationStatus,
            classificationSnapshots: this.props.classificationSnapshots,
            isClassificationViewOnly: false,
            shouldProvisionClassification: false,
            isClassificationSaved: false,
            isApprovalActive: null,
            isPublishActive: null,
            isUnpublishActive: null,
            showProvisional: false,
            showApproval: false,
            publishSnapshotUUID: null,
            showPublish: false,
            showUnpublish: false,
            showPublishLinkAlert: false
        };
    },

    componentDidMount() {
        if (this.props.interpretation && this.props.calculatedAssertion) {
            // Reset form values to last saved values
            let interpretation = this.props.interpretation;
            let provisional_variant = interpretation.provisional_variant ? interpretation.provisional_variant : null;
            let alteredClassification, reason, evidenceSummary, classificationStatus;
            if (interpretation) {
                if (provisional_variant && provisional_variant.length) {
                    alteredClassification = provisional_variant[0].alteredClassification;
                    reason = provisional_variant[0].reason;
                    evidenceSummary = provisional_variant[0].evidenceSummary ? provisional_variant[0].evidenceSummary : null;
                    classificationStatus = provisional_variant[0].classificationStatus;
                    this.setState({isClassificationViewOnly: false});
                }
            }
            // FIXME: Why do we need to update parent component immediately after mounting?
            this.props.setProvisionalEvaluation('provisional-pathogenicity', alteredClassification ? alteredClassification : null);
            this.props.setProvisionalEvaluation('provisional-reason', reason ? reason : null);
            this.props.setProvisionalEvaluation('evidence-summary', evidenceSummary);
        }
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.calculatedAssertion) {
            this.setState({calculatedAssertion: nextProps.calculatedAssertion});
        }
        if (nextProps.classificationStatus) {
            this.setState({classificationStatus: nextProps.classificationStatus});
        }
        if (nextProps.classificationSnapshots) {
            this.setState({classificationSnapshots: nextProps.classificationSnapshots});
        }
        // Because we accept null values for modified pathogenicity and reason,
        // the "if (nextProps.provisionalPathogenicity')" check doesn't apply
        this.setState({
            provisionalPathogenicity: nextProps.provisionalPathogenicity,
            provisionalReason: nextProps.provisionalReason,
            evidenceSummary: nextProps.evidenceSummary
        }, () => {
            const interpretation = this.state.interpretation;
            if (!this.state.isClassificationViewOnly) {
                if (interpretation && interpretation.evaluations && interpretation.evaluations.length) {
                    if (!this.state.provisionalPathogenicity) {
                        this.refs['provisional-pathogenicity'].resetSelectedOption();
                        this.refs['provisional-reason'].resetValue();
                    } else {
                        this.refs['provisional-pathogenicity'].setValue(this.state.provisionalPathogenicity);
                        this.refs['provisional-reason'].setValue(this.state.provisionalReason);
                    }
                }
                if (!this.state.evidenceSummary) {
                    this.refs['evaluation-evidence-summary'].resetValue();
                } else {
                    this.refs['evaluation-evidence-summary'].setValue(this.state.evidenceSummary);
                }
            }
            this.handleProvisionalApprovalVisibility();
        });
    },

    componentWillUnmount() {
        this.setState({
            isClassificationViewOnly: false,
            shouldProvisionClassification: false,
            isApprovalActive: null,
            isClassificationSaved: false,
            showProvisional: false,
            showApproval: false,
            showPublish: false,
            showUnpublish: false,
            showPublishLinkAlert: false
        });
    },

    /**
     * Method to evaluate whether we should render the provisional approval form
     * @param {object} interpretation - The interpretation data object
     */
    handleShouldProvisionClassificaton(interpretation) {
        let calculatedAssertion = this.state.autoClassification ? this.state.autoClassification : this.state.calculatedAssertion;
        let modifiedPathogenicity = this.state.modifiedPathogenicity ? this.state.modifiedPathogenicity : this.state.provisionalPathogenicity;
        // Should generally allow users to provision an interpretation classificaion unless the following conditions are present
        if (modifiedPathogenicity) {
            if (modifiedPathogenicity === 'Pathogenic' || modifiedPathogenicity === 'Likely pathogenic') {
                this.setState({shouldProvisionClassification: interpretation.disease && interpretation.disease.term ? true : false});
            } else {
                this.setState({shouldProvisionClassification: true});
            }
        } else if (calculatedAssertion) {
            if (calculatedAssertion === 'Pathogenic' || calculatedAssertion === 'Likely pathogenic') {
                this.setState({shouldProvisionClassification: interpretation.disease && interpretation.disease.term ? true : false});
            } else {
                this.setState({shouldProvisionClassification: true});
            }
        }
    },

    // Method to alert users about requied input missing values
    handleRequiredInput(action) {
        const inputElement = document.querySelector('.provisional-pathogenicity textarea');
        if (action === 'setAttribute') {
            if (!inputElement.getAttribute('required')) {
                inputElement.setAttribute('required', 'required');
            }
        }
        if (action === 'removeAttribute') {
            inputElement.removeAttribute('required');
        }
    },

    // Handle value changes in provisional form
    handleChange(ref, e) {
        // Handle modified pathogenicity dropdown
        if (ref === 'provisional-pathogenicity') {
            if (this.refs[ref].getValue() && this.refs[ref].getValue() !== 'none') {
                this.setState({provisionalPathogenicity: this.refs[ref].getValue()}, () => {
                    // Pass dropdown state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-pathogenicity', this.state.provisionalPathogenicity);
                    // Disable save button if a reason is not provided for the modification
                    if (!this.state.provisionalReason) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                    // If no disease is associated, we disable provisional checkbox
                    // when modified pathogenicity is either 'Likely pathogenic' or 'Pathogenic'
                    /* this.handleProvisionalCheckBox(this.state.provisionalPathogenicity); */
                });
            } else {
                this.setState({provisionalPathogenicity: null}, () => {
                    // Pass null dropdown state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-pathogenicity', this.state.provisionalPathogenicity);
                    // Disable save button if a reason is provided without the modification
                    if (this.state.provisionalReason) {
                        this.props.setProvisionalEvaluation('provisional-reason', null);
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                    // If no disease is associated, we disable provisional checkbox
                    // when modified pathogenicity is either 'Likely pathogenic' or 'Pathogenic'
                    /* this.handleProvisionalCheckBox(this.state.provisionalPathogenicity); */
                });
            }
        }
        // Handle reason/explanation for pathogenicity modification/change
        if (ref === 'provisional-reason') {
            if (this.refs[ref].getValue()) {
                this.setState({provisionalReason: this.refs[ref].getValue()}, () => {
                    // Pass textarea state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-reason', this.state.provisionalReason);
                    // Disable save button if a modification is not provided for the reason
                    if (!this.state.provisionalPathogenicity) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                });
            } else {
                this.setState({provisionalReason: null}, () => {
                    // Pass null textarea state change back to parent component
                    this.props.setProvisionalEvaluation('provisional-reason', this.state.provisionalReason);
                    // Disable save button if a modification is provided without the reason
                    if (this.state.provisionalPathogenicity) {
                        this.setState({disabledFormSumbit: true});
                        this.handleRequiredInput('setAttribute');
                    } else {
                        this.setState({disabledFormSumbit: false});
                        this.handleRequiredInput('removeAttribute');
                    }
                });
            }
        }
        // Handle freetext evaluation evidence summary
        if (ref === 'evaluation-evidence-summary') {
            let summary = this.refs[ref].getValue();
            this.setState({evidenceSummary: summary ? summary : null}, () => {
                this.props.setProvisionalEvaluation('evidence-summary', this.state.evidenceSummary);
            });
        }
    },

    // Handle the showing of alert message
    showAlertMessage(alertType, alertMsg) {
        this.setState({
            showAlertMessage: true,
            alertType: alertType,
            alertMsg: alertMsg
        }, () => {
            setTimeout(this.hideAlertMessage, 6000);
        });
    },

    // Handle the hiding of alert message
    hideAlertMessage() {
        this.setState({showAlertMessage: false});
    },

    /**
     * Method to handle editing interpretation classification form
     */
    handleEditClassification() {
        this.setState({
            isClassificationViewOnly: false,
            shouldProvisionClassification: false,
            isApprovalActive: null,
            isClassificationSaved: false,
            showProvisional: false,
            showApproval: false,
            showPublish: false,
            showUnpublish: false
        });
    },

    submitForm(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({submitBusy: true});

        const interpretation = this.state.interpretation;

        if (interpretation) {
            // Flattened interpretation object
            let flatInterpretationObj = curator.flatten(interpretation);
            if (!interpretation.provisional_variant || (interpretation.provisional_variant && !interpretation.provisional_variant.length)) {
                // Configure 'provisional-variant' object properties
                // Use case #1: user makes pathogenicity modification and saves the interpretation classification
                // Use case #2: user saves the interpretation classification without any modification
                let provisionalObj = {};
                // Reset the interpretation classification status to 'In progress' whenever the user saves it
                provisionalObj['classificationStatus'] = 'In progress';
                provisionalObj['classificationDate'] = moment().toISOString();
                // At least save the calculated assertion
                provisionalObj['autoClassification'] = this.state.calculatedAssertion;
                // If evidence summary is not nil, save it as well
                if (this.state.evidenceSummary && this.state.evidenceSummary.length) {
                    provisionalObj['evidenceSummary'] = this.state.evidenceSummary;
                }
                // If the modified pathogenicity selection is not nil, save it as well along with its explanation
                if (this.state.provisionalPathogenicity) {
                    provisionalObj['alteredClassification'] = this.state.provisionalPathogenicity;
                    provisionalObj['reason'] = this.state.provisionalReason;
                }
                // Add affiliation if the user is associated with an affiliation
                // and if the data object has no affiliation
                if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                    if (!provisionalObj.affiliation) {
                        provisionalObj.affiliation = this.props.affiliation.affiliation_id;
                    }
                }

                this.postRestData('/provisional-variant/', provisionalObj).then(result => {
                    this.setState({
                        submitBusy: false,
                        isClassificationViewOnly: true,
                        isClassificationSaved: true,
                        autoClassification: result['@graph'][0]['autoClassification'],
                        modifiedPathogenicity: result['@graph'][0]['alteredClassification']
                    });
                    // Evaluate the pathognicity/disease criteria
                    this.handleShouldProvisionClassificaton(this.state.interpretation);
                    let provisionalObjUuid = result['@graph'][0]['@id'];
                    if (!('provisional_variant' in flatInterpretationObj)) {
                        flatInterpretationObj.provisional_variant = [provisionalObjUuid];
                        // Return the newly flattened interpretation object in a Promise
                        return Promise.resolve(flatInterpretationObj);
                    } else {
                        flatInterpretationObj.provisional_variant.push(provisionalObjUuid);
                        return Promise.resolve(flatInterpretationObj);
                    }
                }).then(interpretationObj => {
                    this.putRestData('/interpretation/' + interpretation.uuid, interpretationObj).then(data => {
                        this.props.updateInterpretationObj();
                    }).catch(err => {
                        console.log(err);
                    });
                }).catch(err => {
                    this.setState({submitBusy: false});
                    console.log(err);
                });
            } else {
                this.getRestData('/provisional-variant/' + interpretation.provisional_variant[0].uuid).then(provisionalVariantObj => {
                    // Get up-to-date copy of provisional-variant object and flatten it
                    let flatProvisionalVariantObj = curator.flatten(provisionalVariantObj);
                    // Configure 'provisional-variant' object properties
                    // Use case #1: user updates pathogenicity modification and saves the interpretation classification
                    // Use case #2: user removes pre-existing modification and updates the form
                    flatProvisionalVariantObj['classificationStatus'] = 'In progress';
                    flatProvisionalVariantObj['classificationDate'] = moment().toISOString();
                    flatProvisionalVariantObj['autoClassification'] = this.state.calculatedAssertion;
                    // If evidence summary is not nil, save it as well
                    if (this.state.evidenceSummary && this.state.evidenceSummary.length) {
                        flatProvisionalVariantObj['evidenceSummary'] = this.state.evidenceSummary;
                    } else {
                        if ('evidenceSummary' in flatProvisionalVariantObj) {
                            delete flatProvisionalVariantObj['evidenceSummary'];
                        }
                    }
                    // If the modified pathogenicity selection is not nil, save it as well along with its explanation
                    if (this.state.provisionalPathogenicity) {
                        flatProvisionalVariantObj['alteredClassification'] = this.state.provisionalPathogenicity;
                        flatProvisionalVariantObj['reason'] = this.state.provisionalReason;
                    } else {
                        if ('alteredClassification' in flatProvisionalVariantObj) {
                            delete flatProvisionalVariantObj['alteredClassification'];
                        }
                        if ('reason' in flatProvisionalVariantObj) {
                            delete flatProvisionalVariantObj['reason'];
                        }
                    }
                    // Reset provisional and approval data whenever the evaluation is changed/updated
                    flatProvisionalVariantObj['provisionedClassification'] = false;
                    if (flatProvisionalVariantObj['provisionalSubmitter']) delete flatProvisionalVariantObj['provisionalSubmitter'];
                    if (flatProvisionalVariantObj['provisionalDate']) delete flatProvisionalVariantObj['provisionalDate'];
                    if (flatProvisionalVariantObj['provisionalReviewDate']) delete flatProvisionalVariantObj['provisionalReviewDate'];
                    if (flatProvisionalVariantObj['provisionalComment']) delete flatProvisionalVariantObj['provisionalComment'];
                    flatProvisionalVariantObj['approvedClassification'] = false;
                    if (flatProvisionalVariantObj['approvalSubmitter']) delete flatProvisionalVariantObj['approvalSubmitter'];
                    if (flatProvisionalVariantObj['classificationApprover']) delete flatProvisionalVariantObj['classificationApprover'];
                    if (flatProvisionalVariantObj['approvalDate']) delete flatProvisionalVariantObj['approvalDate'];
                    if (flatProvisionalVariantObj['approvalReviewDate']) delete flatProvisionalVariantObj['approvalReviewDate'];
                    if (flatProvisionalVariantObj['approvalComment']) delete flatProvisionalVariantObj['approvalComment'];
                    flatProvisionalVariantObj['publishClassification'] = false;
                    if (flatProvisionalVariantObj['publishSubmitter']) delete flatProvisionalVariantObj['publishSubmitter'];
                    if (flatProvisionalVariantObj['publishAffiliation']) delete flatProvisionalVariantObj['publishAffiliation'];
                    if (flatProvisionalVariantObj['publishDate']) delete flatProvisionalVariantObj['publishDate'];
                    if (flatProvisionalVariantObj['publishComment']) delete flatProvisionalVariantObj['publishComment'];
                    return Promise.resolve(flatProvisionalVariantObj);
                }).then(newProvisionalVariantObj => {
                    this.putRestData('/provisional-variant/' + interpretation.provisional_variant[0].uuid, newProvisionalVariantObj).then(response => {
                        this.setState({
                            submitBusy: false,
                            isClassificationViewOnly: true,
                            isClassificationSaved: true,
                            classificationStatus: response['@graph'][0]['classificationStatus'],
                            autoClassification: response['@graph'][0]['autoClassification'],
                            modifiedPathogenicity: response['@graph'][0]['alteredClassification']
                        });
                        // Evaluate the pathognicity/disease criteria
                        this.handleShouldProvisionClassificaton(this.state.interpretation);
                        this.props.updateProvisionalObj(response['@graph'][0]['@id']);
                    }).catch(err => {
                        this.setState({submitBusy: false});
                        console.log(err);
                    });
                }).catch(err => {
                    console.log(err);
                });
            }
        }
    },

    /**
     * Method to display classification tag/label in the interpretation header
     * @param {string} status - The status of a given classification in an interpretation
     */
    renderClassificationStatusTag(status) {
        let snapshots = this.state.classificationSnapshots;
        let filteredSnapshots = [];
        // Determine whether the classification had been previously approved
        if (snapshots && snapshots.length) {
            filteredSnapshots = snapshots.filter(snapshot => {
                return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'interpretation';
            });
        }
        if (status === 'In progress') {
            return <span className="label label-warning">IN PROGRESS</span>;
        } else if (status === 'Provisional') {
            if (filteredSnapshots.length) {
                return (
                    <span><span className="label label-success">APPROVED</span><span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span></span>
                );
            } else {
                return <span className="label label-info">PROVISIONAL</span>;
            }
        } else if (status === 'Approved') {
            return <span className="label label-success">APPROVED</span>;
        }
    },

    /**
     * Method to show the Approval form entry panel
     * Passed to the <Snapshots /> component as a prop
     */
    approveProvisional() {
        this.setState({
            isApprovalActive: 'yes',
            shouldProvisionClassification: false,
            isClassificationViewOnly: true
        }, () => {
            this.handleProvisionalApprovalVisibility();
        });
    },

    handleProvisionalApprovalVisibility() {
        const classificationStatus = this.state.classificationStatus;
        const isApprovalActive = this.state.isApprovalActive;
        const isPublishActive = this.state.isPublishActive;
        const isUnpublishActive = this.state.isUnpublishActive;
        const isClassificationSaved = this.state.isClassificationSaved;

        if (classificationStatus === 'In progress' || classificationStatus === 'Provisional') {
            if (isApprovalActive === 'yes') {
                this.setState({showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false});
            } else if (isPublishActive === 'yes' || isPublishActive === 'auto') {
                this.setState({showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false});
            } else if (isUnpublishActive === 'yes') {
                this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true});
            } else if (isClassificationSaved) {

                // Automatic display of the approval panel (system directing user through approval process)
                if (classificationStatus === 'Provisional') {
                    this.setState({isApprovalActive: 'yes', showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false});

                // Automatic display of the provisional panel (system directing user through approval process)
                } else {
                    this.setState({showProvisional: true, showApproval: false, showPublish: false, showUnpublish: false});
                }
            } else {
                this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false});
            }
        } else if (classificationStatus === 'Approved') {
            const publishProvisionalReady = this.props.publishProvisionalReady;
            const publishSnapshotListReady = this.props.publishSnapshotListReady;
            const publishClassification = this.props.publishClassification;
            const affiliation = this.props.affiliation;
            const allowPublish = allowPublishGlobal(affiliation, 'interpretation');

            if (allowPublish) {

                // Before displaying the publish panel, check that the current interpretation has not been published (!publishClassification)
                if (!publishClassification && (isPublishActive === 'yes' || isPublishActive === 'auto')) {
                    this.setState({showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false});

                // Only update state data (to automatically display publish panel) when the approval step is complete
                } else if (!publishClassification && publishProvisionalReady && publishSnapshotListReady) {
                    this.setState({isApprovalActive: null, isPublishActive: 'auto', showProvisional: false,
                        showApproval: false, showPublish: true, showUnpublish: false}, () => {
                        this.props.resetPublishReadyState();
                    });
                } else if (isUnpublishActive === 'yes') {
                    this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true});
                }

            // End approval process (for users without publication rights)
            } else {
                this.setState({isApprovalActive: null, showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false});
            }
        } else {
            this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false});
        }
    },

    /**
     * Method to add publish-related state data
     * Under certain circumstances (when user clicks the publish/unpublish button), called at the start of a publish event
     * @param {string} snapshotUUID - The UUID of the source snapshot
     * @param {string} eventType - The type of event being initiated (publish or unpublish)
     */
    addPublishState(snapshotUUID, eventType) {
        if (snapshotUUID) {
            if (eventType === 'publish') {
                this.setState({isPublishActive: 'yes', isUnpublishActive: null, publishSnapshotUUID: snapshotUUID}, () => {
                    this.handleProvisionalApprovalVisibility();
                });
            } else if (eventType === 'unpublish') {
                this.setState({isPublishActive: null, isUnpublishActive: 'yes', publishSnapshotUUID: snapshotUUID}, () => {
                    this.handleProvisionalApprovalVisibility();
                });
            }
        }
    },

    /**
     * Method to clear publish-related state data
     * Called at the end of every publish event
     */
    clearPublishState() {
        this.setState({isPublishActive: null, isUnpublishActive: null, publishSnapshotUUID: null, showPublish: false, showUnpublish: false}, () => {
            this.props.resetPublishReadyState();
        });
    },

    /**
     * Method to update state data in order to trigger the display of an alert near the publish link (in the published snapshot panel)
     * Called after publishing an interpretation (to the Evidence Repository)
     */
    triggerPublishLinkAlert() {
        this.setState({showPublishLinkAlert: true});
    },

    /**
     * Method to clear state data responsible for displaying an alert near the publish link (in the published snapshot panel)
     * Called after the state data (to trigger the alert) has been acted upon
     */
    clearPublishLinkAlert() {
        this.setState({showPublishLinkAlert: false});
    },

    render() {
        let interpretation = this.state.interpretation;
        let evaluations = interpretation ? interpretation.evaluations : undefined;
        let sortedEvaluations = sortByStrength(evaluations);
        let calculatedAssertion = this.state.autoClassification ? this.state.autoClassification : this.state.calculatedAssertion;
        let provisionalVariant = null;
        let alteredClassification = null;
        let provisionalStatus = null;
        let provisionalPathogenicity = this.state.provisionalPathogenicity ? this.state.provisionalPathogenicity : 'none';
        let provisionalReason = this.state.provisionalReason ? this.state.provisionalReason : '';
        let disabledFormSumbit = this.state.disabledFormSumbit;
        let evidenceSummary = this.state.evidenceSummary ? this.state.evidenceSummary : '';

        if (interpretation) {
            if (interpretation.provisional_variant && interpretation.provisional_variant.length) {
                provisionalVariant = interpretation.provisional_variant[0];
                if (provisionalVariant.classificationStatus) {
                    provisionalStatus = provisionalVariant.classificationStatus;
                }
                if (provisionalVariant.alteredClassification) {
                    alteredClassification = provisionalVariant.alteredClassification;
                }
            }
        }
        // Modified pathogenicity value gets updated only after the form is saved
        // And thus we pull the stored value (if any) initially from the db
        // Then we pull the updated value from either REST post or put results
        let modifiedPathogenicity = this.state.modifiedPathogenicity ? this.state.modifiedPathogenicity : alteredClassification;
        let sortedSnapshotList = this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];
        const classificationStatus = this.state.classificationStatus;
        const shouldProvisionClassification = this.state.shouldProvisionClassification;
        const isClassificationSaved = this.state.isClassificationSaved;
        const isApprovalActive = this.state.isApprovalActive;
        const isPublishActive = this.state.isPublishActive;
        const isUnpublishActive = this.state.isUnpublishActive;
        const showProvisional = this.state.showProvisional;
        const showApproval = this.state.showApproval;
        const snapshotUUID = this.state.publishSnapshotUUID;
        const showPublish = this.state.showPublish;
        const showUnpublish = this.state.showUnpublish;
        const showPublishLinkAlert = this.state.showPublishLinkAlert;
        const demoVersion = this.props.demoVersion;
        const affiliation = this.props.affiliation;
        const allowPublishButton = allowPublishGlobal(affiliation, 'interpretation');

        return (
            <div className="container evaluation-summary">
                <h2><span>Evaluation Summary</span></h2>
                <div className="summary-content-wrapper">
                    <div className="panel panel-info datasource-evaluation-summary-provision">
                        <div className="panel-body">
                            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                <div className="col-md-12 provisional-static-content-wrapper">
                                    <div className="col-xs-12 col-sm-6">
                                        <dl className="inline-dl clearfix">
                                            <dt>Calculated Pathogenicity:</dt>
                                            <dd>{calculatedAssertion ? calculatedAssertion : 'None'}</dd>
                                        </dl>
                                        <dl className="inline-dl clearfix">
                                            <dt>Modified Pathogenicity:</dt>
                                            <dd>{modifiedPathogenicity ? modifiedPathogenicity : 'None'}</dd>
                                        </dl>
                                    </div>
                                    <div className="col-xs-12 col-sm-6">
                                        <dl className="inline-dl clearfix">
                                            <dt>Disease:</dt>
                                            <dd>{interpretation && interpretation.disease && interpretation.disease.term ? interpretation.disease.term : 'None'}</dd>
                                        </dl>
                                        <dl className="inline-dl clearfix">
                                            <dt>Mode of Inheritance:</dt>
                                            <dd className="modeInheritance">{renderSelectedModeInheritance(interpretation)}</dd>
                                        </dl>
                                    </div>
                                </div>
                                {!this.state.isClassificationViewOnly ?
                                    <div>
                                        <div className="col-md-12 provisional-form-content-wrapper">
                                            <div className="col-xs-12 col-sm-6">
                                                <div className="evaluation-provision provisional-pathogenicity">
                                                    <Input type="select" ref="provisional-pathogenicity" label={<span>Modify Pathogenicity:<i>(optional)</i></span>}
                                                        defaultValue={provisionalPathogenicity} handleChange={this.handleChange}
                                                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                                                        <option value='none'>No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="Benign">Benign</option>
                                                        <option value="Likely benign">Likely Benign</option>
                                                        <option value="Uncertain significance">Uncertain Significance</option>
                                                        <option value="Likely pathogenic">Likely Pathogenic</option>
                                                        <option value="Pathogenic">Pathogenic</option>
                                                    </Input>
                                                    <Input type="textarea" ref="provisional-reason" label={<span>Explain reason(s) for change:<i>(<strong>required</strong> for modified pathogenicity)</i></span>}
                                                        value={provisionalReason} handleChange={this.handleChange} rows="5"
                                                        placeholder="Note: If you selected a pathogenicity different from the Calculated Pathogenicity, you must provide a reason for the change here."
                                                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                                                </div>
                                            </div>
                                            <div className="col-xs-12 col-sm-6">
                                                <div className="evaluation-provision evidence-summary">
                                                    <Input type="textarea" ref="evaluation-evidence-summary" label="Evidence Summary:"
                                                        value={evidenceSummary} handleChange={this.handleChange}
                                                        placeholder="Summary of the evidence and rationale for the clinical significance (optional)." rows="8"
                                                        labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-12 classification-submit clearfix">
                                            <div className="classification-submit-note pull-left">
                                                <i className="icon icon-info-circle"></i> An Interpretation will remain In Progress until Saved as Provisional.
                                            </div>
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                                                submitBusy={this.state.submitBusy} inputDisabled={disabledFormSumbit} />
                                        </div>
                                    </div>
                                    :
                                    <div>
                                        <div className="col-md-12 provisional-form-content-wrapper">
                                            <div className="col-xs-12 col-sm-6">
                                                <div className="evaluation-provision provisional-pathogenicity">
                                                    <div>    
                                                        <dl className="inline-dl clearfix">
                                                            <dt><span>Modify Pathogenicity:</span></dt>
                                                            <dd>{provisionalPathogenicity}</dd>
                                                        </dl>
                                                    </div>
                                                    <div>
                                                        <dl className="inline-dl clearfix">
                                                            <dt><span>Explain reason(s) for change:</span></dt>
                                                            <dd>{provisionalReason && provisionalReason.length ? provisionalReason : 'None'}</dd>
                                                        </dl>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-xs-12 col-sm-6">
                                                <div className="evaluation-provision evidence-summary">
                                                    <dl className="inline-dl clearfix preview-provisional-comment">
                                                        <dt><span>Evidence Summary:</span></dt>
                                                        <dd><span>{evidenceSummary && evidenceSummary.length ? evidenceSummary : 'None'}</span></dd>
                                                    </dl>
                                                </div>
                                            </div>
                                        </div>
                                        {classificationStatus === 'In progress' ?
                                            <div className="col-md-12 classification-edit">
                                                <button type="button" className="btn btn-info btn-inline-spacer pull-right"
                                                    onClick={this.handleEditClassification}>Edit <i className="icon icon-pencil"></i></button>
                                            </div>
                                            : null}
                                    </div>
                                }
                            </Form>
                        </div>
                    </div>
                    {provisionalVariant && showProvisional ?
                        <div className="provisional-approval-content-wrapper">
                            {shouldProvisionClassification ?
                                <div>
                                    <div className="provisional-interpretation-note">
                                        <p className="alert alert-info">
                                            <i className="icon icon-info-circle"></i> Save this Interpretation as Provisional if you have finished all your evaluations and wish to mark it as complete. Once
                                            you have saved it as Provisional, you will not be able to undo it, but you will be able to make a new current Provisional Interpretation, archiving the current
                                            one, with access to its Evaluation Summary.
                                        </p>
                                    </div>
                                    <div className="panel panel-warning approval-process provisional-approval">
                                        <div className="panel-heading">
                                            <h3 className="panel-title">Save Interpretation as Provisional</h3>
                                        </div>
                                        <div className="panel-body">
                                            <ProvisionalApproval
                                                session={this.props.session}
                                                interpretation={interpretation}
                                                classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : calculatedAssertion}
                                                classificationStatus={classificationStatus}
                                                provisional={provisionalVariant}
                                                affiliation={affiliation}
                                                updateSnapshotList={this.props.updateSnapshotList}
                                                updateProvisionalObj={this.props.updateProvisionalObj}
                                                approveProvisional={this.approveProvisional}
                                            />
                                        </div>
                                    </div>
                                </div>
                                :
                                <div className="provisional-interpretation-note">
                                    <p className="alert alert-warning">
                                        <i className="icon icon-exclamation-circle"></i> The option to save an Interpretation as Provisional will not appear when the saved calculated or modified value
                                        is "Likely Pathogenic" or "Pathogenic" and there is no associated disease.
                                    </p>
                                </div>
                            }
                        </div>
                        : null}
                    {provisionalVariant && showApproval ?
                        <div className="final-approval-content-wrapper"> 
                            <div className="final-approval-note">
                                <p className="alert alert-info">
                                    <i className="icon icon-info-circle"></i> When ready, you may save this Provisional Interpretation as Approved. Once you have saved it as Approved it will become
                                    uneditable, but you will be able to save a new current Approved Interpretation, thus archiving this current one and retaining access to its Evaluation Summary.
                                </p>
                            </div>
                            <div className="panel panel-warning approval-process final-approval">
                                <div className="panel-heading">
                                    <h3 className="panel-title">Approve Interpretation</h3>
                                </div>
                                <div className="panel-body">
                                    <ClassificationApproval
                                        session={this.props.session}
                                        interpretation={interpretation}
                                        classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : calculatedAssertion}
                                        classificationStatus={classificationStatus}
                                        provisional={provisionalVariant}
                                        affiliation={affiliation}
                                        updateSnapshotList={this.props.updateSnapshotList}
                                        updateProvisionalObj={this.props.updateProvisionalObj}
                                        snapshots={sortedSnapshotList}
                                    />
                                </div>
                            </div>
                        </div>
                        : null}
                    {provisionalVariant && (showPublish || showUnpublish) ?
                        <div className={'publish-approval-content-wrapper' + (showUnpublish ? ' unpublish' : '')}>
                            <div className="publish-approval-note">
                                {isPublishActive === 'auto' ?
                                    <p className="alert alert-info">
                                        <i className="icon icon-info-circle"></i> Publish the current (<i className="icon icon-flag"></i>)
                                            Approved Interpretation to the Evidence Repository.
                                    </p>
                                    :
                                    <p className="alert alert-info">
                                        <i className="icon icon-info-circle"></i> {showUnpublish ? 'Unpublish' : 'Publish'} the selected
                                            Approved Interpretation {showUnpublish ? 'from' : 'to'} the Evidence Repository.
                                    </p>
                                }
                            </div>
                            <div className={'panel panel-warning approval-process publish-approval' + (showUnpublish ? ' unpublish' : '')}>
                                <div className="panel-heading">
                                    <h3 className="panel-title">{showUnpublish ? 'Unpublish Interpretation from' : 'Publish Interpretation to'} the Evidence Repository</h3>
                                </div>
                                <div className="panel-body">
                                    <PublishApproval
                                        session={this.props.session}
                                        interpretation={interpretation}
                                        classification={provisionalPathogenicity && provisionalPathogenicity !== 'none' ? provisionalPathogenicity : calculatedAssertion}
                                        classificationStatus={classificationStatus}
                                        provisional={provisionalVariant}
                                        affiliation={affiliation}
                                        updateSnapshotList={this.props.updateSnapshotList}
                                        updateProvisionalObj={this.props.updateProvisionalObj}
                                        snapshots={sortedSnapshotList}
                                        selectedSnapshotUUID={snapshotUUID}
                                        triggerPublishLinkAlert={this.triggerPublishLinkAlert}
                                        clearPublishState={this.clearPublishState}
                                    />
                                </div>
                            </div>
                        </div>
                        : null}
                    {!showProvisional && !showApproval && !allowPublishButton ?
                        <div className="publish-unavailable-note">
                            <p className="alert alert-info">
                                <i className="icon icon-info-circle"></i> The option to publish an approved interpretation to the Evidence Repository is
                                    currently only available for VCEPs that have guidelines approved by the Sequence Variant Interpretation Working Group.
                            </p>
                        </div>
                        : null}
                    {sortedSnapshotList.length ?
                        <div className="panel panel-info snapshot-list">
                            <div className="panel-heading">
                                <h3 className="panel-title">Saved Provisional and Approved Interpretation(s)</h3>
                            </div>
                            <div className="panel-body">
                                <CurationSnapshots
                                    snapshots={sortedSnapshotList}
                                    approveProvisional={this.approveProvisional}
                                    addPublishState={this.addPublishState}
                                    isApprovalActive={isApprovalActive}
                                    isPublishEventActive={isPublishActive || isUnpublishActive ? true : false}
                                    classificationStatus={classificationStatus}
                                    demoVersion={demoVersion}
                                    allowPublishButton={allowPublishButton}
                                    showPublishLinkAlert={showPublishLinkAlert}
                                    clearPublishLinkAlert={this.clearPublishLinkAlert} />
                            </div>
                        </div>
                        : null}

                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria meeting an evaluation strength</h3>
                        </div>
                        {sortedEvaluations && sortedEvaluations.met && sortedEvaluations.met.length ?
                            <table className="table">
                                <thead>
                                    {tableHeader()}
                                </thead>
                                <tbody>
                                    {sortedEvaluations.met.map(function(item, i) {
                                        return (renderMetCriteriaRow(item, i));
                                    })}
                                </tbody>
                            </table>
                            :
                            <div className="panel-body">
                                <span>No criteria meeting an evaluation strength.</span>
                            </div>
                        }
                    </div>

                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria evaluated as "Not met"</h3>
                        </div>
                        {sortedEvaluations && sortedEvaluations.not_met && sortedEvaluations.not_met.length ?
                            <table className="table">
                                <thead>
                                    {tableHeader()}
                                </thead>
                                <tbody>
                                    {sortedEvaluations.not_met.map(function(item, i) {
                                        return (renderNotMetCriteriaRow(item, i));
                                    })}
                                </tbody>
                            </table>
                            :
                            <div className="panel-body">
                                <span>No criteria evaluated as "Not met".</span>
                            </div>
                        }
                    </div>

                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria "Not yet evaluated"</h3>
                        </div>
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            {sortedEvaluations && sortedEvaluations.not_evaluated && sortedEvaluations.not_evaluated.length ?
                                <tbody>
                                    {sortedEvaluations.not_evaluated.map(function(item, i) {
                                        return (renderNotEvalCriteriaRow(item, i));
                                    })}
                                </tbody>
                                :
                                <div className="panel-body">
                                    <span>No criteria yet to be evaluated.</span>
                                </div>
                            }
                        </table>
                    </div>

                </div>
            </div>
        );
    }
});

// Method to render static table header
function tableHeader() {
    return (
        <tr>
            <th className="col-md-1"><span className="label-benign">B</span>/<span className="label-pathogenic">P</span></th>
            <th className="col-md-1">Criteria</th>
            <th className="col-md-3">Criteria Descriptions</th>
            <th className="col-md-1">Modified</th>
            <th className="col-md-2">Evaluation Status</th>
            <th className="col-md-4">Evaluation Explanation</th>
        </tr>
    );
}

// Method to render "met" criteria table rows
function renderMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-met" data-evaltype={getCriteriaType(item)}>
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-check-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1" data-modlevel={getModifiedLevel(item)}>
                {item.criteriaModifier ? 'Yes' : 'No'}
            </td>
            <td className="evaluation-status col-md-2">
                {item.criteriaModifier ? item.criteria + '_' + item.criteriaModifier : getCriteriaStrength(item)}
            </td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-met" criteria table rows
function renderNotMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-met">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-times-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Met</td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-evaluated" criteria table rows
function renderNotEvalCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-evaluated">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-circle-o"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Evaluated</td>
            <td className="evaluation-description col-md-4">{item.explanation ? item.explanation : null}</td>
        </tr>
    );
}

// Method to get critetia type: benign or pathogenic
function getCriteriaType(entry) {
    const keys = Object.keys(evidenceCodes);
    let type;

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                case 'benign-strong':
                case 'benign-supporting':
                    type = 'benign';
                    break;
                case 'pathogenic-supporting':
                case 'pathogenic-moderate':
                case 'pathogenic-strong' :
                case 'pathogenic-very-strong':
                    type = 'pathogenic';
                    break;
                default:
                    type = '';
            }
        }
    });
    return type;
}

// Method to get criteria class
function getCriteriaClass(entry) {
    const keys = Object.keys(evidenceCodes);
    let classification = '';

    keys.map(key => {
        if (key === entry.criteria) {
            classification = evidenceCodes[key].class;
        }
    });
    return classification;
}

// Method to get short critetia description
function getCriteriaDescription(entry) {
    const keys = Object.keys(evidenceCodes);
    let description = '';

    keys.map(key => {
        if (key === entry.criteria) {
            description = evidenceCodes[key].definition;
        }
    });
    return description;
}

// Method to get criteria strength
function getCriteriaStrength(entry) {
    const keys = Object.keys(evidenceCodes);
    let strength = '';

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                    strength = 'stand-alone';
                    break;
                case 'pathogenic-very-strong':
                    strength = 'very-strong';
                    break;
                case 'benign-strong':
                case 'pathogenic-strong':
                    strength = 'strong';
                    break;
                case 'pathogenic-moderate':
                    strength = 'moderate';
                    break;
                case 'benign-supporting':
                case 'pathogenic-supporting':
                    strength = 'supporting';
                    break;
                default:
                    strength = '';
            }
        }
    });
    return strength;
}

// Method to determine the levels a criteria is modified
function getModifiedLevel(entry) {
    let modifiedLevel;
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'very-strong') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'moderate':
                modifiedLevel = '2-down';
                break;
            case 'supporting':
                modifiedLevel = '3-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'stand-alone') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = '2-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'strong') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
            case 'stand-alone':
                modifiedLevel = '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-down' : '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'moderate') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = '1-up';
                break;
            case 'supporting':
                modifiedLevel = '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'supporting') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '3-up';
                break;
            case 'stand-alone':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-up' : '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-up';
                break;
        }
    }
    return modifiedLevel;
}
