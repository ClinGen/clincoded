'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, history_views, userMatch, queryKeyValue, editQueryValue, addQueryKey } from '../globals';
import { RestMixin } from '../rest';
import { PanelGroup, Panel } from '../../libs/bootstrap/panel';
import { ContextualHelp } from '../../libs/bootstrap/contextual_help';
import { ClassificationDefinition } from './definition';
import GeneDiseaseClassificationMatrix from '../../libs/gene_disease_classification_matrix';
import { ProvisionalApproval } from './provisional';
import { ClassificationApproval } from './approval';
import { PublishApproval } from './publish';
import CurationSnapshots from './snapshots';
import { sortListByDate } from '../../libs/helpers/sort';
import { getClassificationSavedDate } from '../../libs/get_saved_date';
import * as methods from '../methods';
import * as curator from '../curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;

const ProvisionalClassification = createReactClass({
    mixins: [RestMixin, CurationMixin],

    queryValues: {},

    propTypes: {
        href: PropTypes.string,
        session: PropTypes.object,
        affiliation: PropTypes.object,
        demoVersion: PropTypes.bool
    },

    getInitialState() {
        // Set state to indicate user intends to publish/unpublish based on URL query parameters
        let isPublishActive, isUnpublishActive;

        if (typeof window !== "undefined" && window.location && window.location.href) {
            isPublishActive = queryKeyValue('publish', window.location.href);
            isUnpublishActive = queryKeyValue('unpublish', window.location.href);
        }

        return {
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: {}, // login user's existing provisional object, must be null initially.
            classificationStatus: 'In progress',
            classificationSnapshots: [],
            isApprovalActive: queryKeyValue('approval', this.props.href),
            isPublishActive: isPublishActive,
            isUnpublishActive: isUnpublishActive,
            showProvisional: false,
            showApproval: false,
            publishProvisionalReady: false,
            publishSnapshotListReady: false,
            publishSnapshotUUID: null,
            showPublish: false,
            showUnpublish: false
        };
    },

    /**
     * Method to retrieve the updated classification object and pass the updated state as a prop
     * back to the child components (e.g. provisional, approval).
     * Called as PropTypes.func in the child components upon the PUT request to update the classification.
     * @param {string} provisionalId - The '@id' of the (provisional) classification object
     * @param {boolean} publishProvisionalReady - Indicator that (provisional) classification is ready for publish component (optional, defaults to false)
     */
    updateProvisionalObj(provisionalId, publishProvisionalReady = false) {
        let provisional = this.state.provisional;
        this.getRestData(provisionalId).then(result => {
            // Get an updated copy of the classification object
            this.setState({provisional: result, classificationStatus: result.classificationStatus, publishProvisionalReady: publishProvisionalReady}, () => {
                this.handleProvisionalApprovalVisibility();
            });
            return Promise.resolve(result);
        }).then(data => {
            // Get an updated copy of the gdm object
            this.getRestData('/gdm/' + this.state.gdm.uuid).then(gdm => {
                this.setState({gdm: gdm});
            });
        });
    },

    /**
     * Method to retrieve the given snapshot object and concat with (or refresh) the existing snapshot list.
     * Then pass the updated state as a prop back to the child components (e.g. provisional, approval).
     * Called as PropTypes.func in the child components upon saving a new snapshot.
     * @param {string} snapshotId - The '@id' of the newly saved snapshot object
     * @param {boolean} publishSnapshotListReady - Indicator that list of snapshots is ready for publish component (optional, defaults to false)
     */
    updateSnapshotList(snapshotId, publishSnapshotListReady = false) {
        let classificationSnapshots = this.state.classificationSnapshots;
        let isNewSnapshot = true;
        this.getRestData(snapshotId).then(result => {
            for (let snapshot of classificationSnapshots) {
                if (snapshot['@id'] === snapshotId) {
                    snapshot = result;
                    isNewSnapshot = false;
                    break;
                }
            }

            if (isNewSnapshot) {
                const newClassificationSnapshots = [result, ...classificationSnapshots];

                if (publishSnapshotListReady) {
                    this.setState({classificationSnapshots: newClassificationSnapshots, publishSnapshotListReady: publishSnapshotListReady}, () => {
                        this.handleProvisionalApprovalVisibility();
                    });
                } else {
                    this.setState({classificationSnapshots: newClassificationSnapshots});
                }
            } else {
                this.setState({classificationSnapshots: classificationSnapshots});
            }
        });
    },

    /**
     * Method to get a list of snapshots of a classification, either provisioned or approved,
     * given the matching UUID of the classificaiton object.
     * Called only once in the componentDidMount() lifecycle method via the loadData() method.
     * @param {string} provisionalUuid - UUID of the saved classification object in a snapshot
     */
    getClassificationSnaphots(provisionalUuid) {
        this.getRestData('/search/?type=snapshot&resourceId=' + provisionalUuid).then(result => {
            this.setState({classificationSnapshots: result['@graph']});
        }).catch(err => {
            console.log('Classification Snapshots Fetch Error=: %o', err);
        });
    },

    loadData() {
        var gdmUuid = this.queryValues.gdmUuid;

        // get gdm from db.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '' // search for entire data set of the gdm
        ]);
        this.getRestDatas(
            uris
        ).then(datas => {
            var stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid;

            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;
                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // search for provisional owned by affiliation or login user
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (let provisionalClassification of stateObj.gdm.provisionalClassifications) {
                    let curatorAffiliation = this.props.affiliation;
                    let affiliation = provisionalClassification.affiliation ? provisionalClassification.affiliation : null;
                    let creator = provisionalClassification.submitted_by;
                    if ((affiliation && curatorAffiliation && affiliation === curatorAffiliation.affiliation_id) || (!affiliation && !curatorAffiliation && creator.uuid === stateObj.user)) {
                        stateObj.provisional = provisionalClassification;
                        stateObj.classificationStatus = stateObj.provisional.hasOwnProperty('classificationStatus') ? stateObj.provisional.classificationStatus : 'In progress';
                    }
                }
            }
            stateObj.previousUrl = url;
            this.setState(stateObj);
            if (stateObj.provisional && stateObj.provisional.uuid) {
                this.getClassificationSnaphots(stateObj.provisional.uuid);
            }

            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    componentDidMount() {
        this.loadData();
        this.handleProvisionalApprovalVisibility();
    },

    componentDidUpdate(prevProps, prevState) {
        // Need to delay the function call until the DOM is rendered
        setTimeout(this.scrollElementIntoView, 500);
    },

    // FIXME: This method is not working as expected in the resulted behavior
    // Need to revisit in the next release
    highlightMatchingSnapshots() {
        // Color code each pair of Approval/Provisional snapshots
        let provisionalList = document.querySelectorAll('li.snapshot-item[data-status="Provisioned"]');
        let approvalList = document.querySelectorAll('li.snapshot-item[data-status="Approved"]');
        let provisionalSnapshotNodes = Array.from(provisionalList);
        let approvalSnapshotNodes = Array.from(approvalList);
        if (approvalSnapshotNodes && approvalSnapshotNodes.length) {
            approvalSnapshotNodes.forEach(approval => {
                let label = document.createElement('LABEL');
                approval.appendChild(label);

                if (approval.getAttribute('data-associated').length) {
                    let matchingProvisional = provisionalSnapshotNodes.filter(provisional => {
                        return provisional.getAttribute('data-key') === approval.getAttribute('data-associated');
                    });
                    if (matchingProvisional && matchingProvisional.length) {
                        matchingProvisional[0].appendChild(label);
                    }
                }
            });
        }
    },

    /**
     * Method to show the saved classification data in viewport
     */
    scrollElementIntoView() {
        const element = document.querySelector('#classification-view');
        if (element) {
            element.scrollIntoView();
        }
    },

    getCurationCentral(e) {
        window.location.href = '/curation-central/?gdm=' + this.state.gdm.uuid;
    },

    editClassification(e) {
        window.location.href = '/provisional-curation/?gdm=' + this.state.gdm.uuid + '&edit=yes&referrer=classification-view';
    },

    viewEvidenceSummary(e) {
        window.open('/gene-disease-evidence-summary/?gdm=' + this.state.gdm.uuid, '_blank');
    },

    /**
     * Method to show the Approval form entry panel
     * Passed to the <Snapshots /> component as a prop
     */
    approveProvisional() {
        const isApprovalActive = this.state.isApprovalActive;
        if (!isApprovalActive) {
            window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'approval', 'yes'));
            this.setState({isApprovalActive: 'yes'}, () => {
                this.handleProvisionalApprovalVisibility();
            });
        }
    },

    /**
     * Method to determine if user is allowed to publish
     */
    isUserAllowedToPublish() {
        const curatorAffiliation = this.props.affiliation;

        if (curatorAffiliation && curatorAffiliation.publish_approval) {
            return true;
        } else {
            return false;
        }
    },

    handleProvisionalApprovalVisibility() {
        const classificationStatus = this.state.classificationStatus;
        const isApprovalActive = this.state.isApprovalActive;
        const isPublishActive = this.state.isPublishActive;
        const isUnpublishActive = this.state.isUnpublishActive;
        const provisional = this.state.provisional;

        if (classificationStatus === 'In progress' || classificationStatus === 'Provisional') {
            if (isApprovalActive && isApprovalActive === 'yes') {
                this.setState({showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false});
            } else if (isPublishActive === 'yes' || isPublishActive === 'auto') {
                this.setState({showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false});
            } else if (isUnpublishActive === 'yes') {
                this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true});

            // Automatic display of the approval panel (system directing user through approval process)
            } else if (classificationStatus === 'Provisional') {
                this.setState({isApprovalActive: 'yes', showProvisional: false, showApproval: true, showPublish: false, showUnpublish: false});

            // Automatic display of the provisional panel (system directing user through approval process)
            } else {
                this.setState({showProvisional: true, showApproval: false, showPublish: false, showUnpublish: false});
            }
        } else if (classificationStatus === 'Approved') {
            if (this.isUserAllowedToPublish()) {

                // Check if the current classification has been published
                if (!provisional || !provisional.publishClassification) {
                    if (isPublishActive === 'yes' || isPublishActive === 'auto') {
                        this.setState({showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false});

                    // Only update state data (to automatically display publish panel) when the approval step is complete
                    } else if (this.state.publishProvisionalReady && this.state.publishSnapshotListReady) {
                        this.setState({isApprovalActive: undefined, isPublishActive: 'auto', publishProvisionalReady: false,
                            publishSnapshotListReady: false, showProvisional: false, showApproval: false, showPublish: true, showUnpublish: false});
                    }
                } else if (isUnpublishActive === 'yes') {
                    this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: true});
                }

            // End approval process (for users without publication rights)
            } else {
                this.setState({isApprovalActive: undefined, showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false});
            }
        } else {
            this.setState({showProvisional: false, showApproval: false, showPublish: false, showUnpublish: false});
        }
    },

    /**
     * Method to add publish-related state data
     * Under certain circumstances (when URL of source page includes "provisional-classification"), called at the start of a publish event
     * @param {string} snapshotUUID - The UUID of the source snapshot
     * @param {string} eventType - The type of event being initiated (publish or unpublish)
     */
    addPublishState(snapshotUUID, eventType) {
        if (snapshotUUID) {
            if (eventType === 'publish') {
                this.setState({isPublishActive: 'yes', isUnpublishActive: undefined, publishSnapshotUUID: snapshotUUID}, () => {
                    this.handleProvisionalApprovalVisibility();
                });
            } else if (eventType === 'unpublish') {
                this.setState({isPublishActive: undefined, isUnpublishActive: 'yes', publishSnapshotUUID: snapshotUUID}, () => {
                    this.handleProvisionalApprovalVisibility();
                });
            }
        }
    },

    /**
     * Method to clear publish-related URL query parameters and state data
     * Called at the end of every publish event
     */
    clearPublishState() {
        if (typeof window !== "undefined" && window.location && window.location.href && window.history) {
            if (queryKeyValue('publish', window.location.href)) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'publish', null));
            }

            if (queryKeyValue('unpublish', window.location.href)) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'unpublish', null));
            }

            if (queryKeyValue('snapshot', window.location.href)) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'snapshot', null));
            }
        }

        this.setState({isPublishActive: undefined, isUnpublishActive: undefined, publishProvisionalReady: false,
            publishSnapshotListReady: false, publishSnapshotUUID: null, showPublish: false, showUnpublish: false});
    },

    render() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        let calculate = queryKeyValue('calculate', this.props.href);
        let edit = queryKeyValue('edit', this.props.href);
        let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        const context = this.props.context;
        const currOmimId = this.state.currOmimId;
        let gdm = this.state.gdm ? this.state.gdm : null;
        let show_clsfctn = queryKeyValue('classification', this.props.href);
        // set the 'Current Classification' appropriately only if previous provisional exists
        const provisional = this.state.provisional;
        const autoClassification = provisional.autoClassification;
        const classificationPoints = provisional.classificationPoints;
        let currentClassification = provisional.alteredClassification && provisional.alteredClassification !== 'No Modification' ? provisional.alteredClassification : provisional.autoClassification;
        let sortedSnapshotList = this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];
        const classificationStatus = this.state.classificationStatus;
        const isApprovalActive = this.state.isApprovalActive;
        const lastSavedDate = provisional.last_modified ? getClassificationSavedDate(provisional) : null;
        const demoVersion = this.props.demoVersion;
        const affiliation = this.props.affiliation;
        const isPublishActive = this.state.isPublishActive;
        const isUnpublishActive = this.state.isUnpublishActive;

        // If state has a snapshot UUID, use it; otherwise, check URL query parameters
        const snapshotUUID = this.state.publishSnapshotUUID ? this.state.publishSnapshotUUID :
            typeof window !== "undefined" && window.location && window.location.href ? queryKeyValue('snapshot', window.location.href) : undefined;

        return (
            <div>
                { show_clsfctn === 'display' ?
                    <div>{ClassificationDefinition()}</div>
                    :
                    ( gdm ?
                        <div>
                            <RecordHeader gdm={gdm} omimId={currOmimId} updateOmimId={this.updateOmimId} session={session} summaryPage={true} linkGdm={true}
                                affiliation={affiliation} classificationSnapshots={sortedSnapshotList} context={context} />
                            <div className="container summary-provisional-classification-wrapper">
                                <PanelGroup>
                                    <Panel title="Calculated Classification Matrix" panelClassName="panel-data" open>
                                        <div className="form-group">
                                            <GeneDiseaseClassificationMatrix classificationPoints={classificationPoints} />
                                            <div className="summary-provisional-classification-description">
                                                <p className="alert alert-warning">
                                                    <i className="icon icon-exclamation-circle"></i> The <strong>Total Points</strong> shown above are based on the set of saved evidence and accompanying scores existing
                                                    when the "View Classification Matrix" button was clicked. To save a Classification for this Gene Disease Record based on this evidence, please see the section below.
                                                </p>
                                            </div>
                                            <div className="provisional-classification-wrapper">
                                                <table className="summary-matrix">
                                                    <tbody>
                                                        <tr className="header large bg-gray">
                                                            <td colSpan="5">Gene/Disease Pair</td>
                                                        </tr>
                                                        <tr>
                                                            <td>Assertion Criteria</td>
                                                            <td>Genetic Evidence (0-12 points)</td>
                                                            <td>Experimental Evidence (0-6 points)</td>
                                                            <td>Total Points (0-18 points)</td>
                                                            <td>Replication Over Time (Yes/No) <ContextualHelp content="> 2 pubs w/ convincing evidence over time (>3 yrs)" /></td>
                                                        </tr>
                                                        <tr className="header large bg-gray separator-below">
                                                            <td>Assigned Points</td>
                                                            <td>{classificationPoints['geneticEvidenceTotal']}</td>
                                                            <td>{classificationPoints['experimentalEvidenceTotal']}</td>
                                                            <td>{classificationPoints['evidencePointsTotal']}</td>
                                                            <td>{provisional['replicatedOverTime'] ? <span>Yes</span> : <span>No</span>}</td>
                                                        </tr>
                                                        <tr className="header large">
                                                            <td colSpan="3" rowSpan="4">Calculated Classification</td>
                                                            <td className={autoClassification === 'Limited' ? ' bg-emphasis' : null}>LIMITED</td>
                                                            <td className={autoClassification === 'Limited' ? ' bg-emphasis' : null}>0.1-6</td>
                                                        </tr>
                                                        <tr className={"header large" + (autoClassification === 'Moderate' ? ' bg-emphasis' : null)}>
                                                            <td>MODERATE</td>
                                                            <td>7-11</td>
                                                        </tr>
                                                        <tr className={"header large" + (autoClassification === 'Strong' ? ' bg-emphasis' : null)}>
                                                            <td>STRONG</td>
                                                            <td>12-18</td>
                                                        </tr>
                                                        <tr className={"header large" + (autoClassification === 'Definitive' ? ' bg-emphasis' : null)}>
                                                            <td>DEFINITIVE</td>
                                                            <td>12-18 & Replicated Over Time</td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan="2" className="header large">Contradictory Evidence?</td>
                                                            <td colSpan="3">
                                                                Proband: <strong>{provisional.contradictingEvidence.proband ? <span className='emphasis'>Yes</span> : 'No'}</strong>&nbsp;&nbsp;&nbsp;
                                                                Experimental: <strong>{provisional.contradictingEvidence.experimental ? <span className='emphasis'>Yes</span> : 'No'}</strong>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan="5">
                                                                <a name="classification-view" id="classification-view"></a>
                                                                <div className="col-md-12 classification-form-content-wrapper view-only">
                                                                    <div className="col-xs-12 col-sm-6">
                                                                        <div className="altered-classfication">
                                                                            <dl className="inline-dl clearfix">
                                                                                <dt>
                                                                                    <span>Modify Calculated <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</span>
                                                                                </dt>
                                                                                <dd>
                                                                                    {provisional.alteredClassification}
                                                                                </dd>
                                                                            </dl>
                                                                        </div>
                                                                        <div className="altered-classification-reasons">
                                                                            <dl className="inline-dl clearfix">
                                                                                <dt>
                                                                                    <span>Explain Reason(s) for Change:</span>
                                                                                </dt>
                                                                                <dd>
                                                                                    {provisional.reasons}
                                                                                </dd>
                                                                            </dl>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-xs-12 col-sm-6">
                                                                        <div className="classification-evidence-summary">
                                                                            <dl className="inline-dl clearfix">
                                                                                <dt>
                                                                                    <span>Evidence Summary:</span>
                                                                                </dt>
                                                                                <dd>
                                                                                    {provisional.evidenceSummary}
                                                                                </dd>
                                                                            </dl>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr className="total-row header">
                                                            <td colSpan="2">Last Saved Summary Classification</td>
                                                            <td colSpan="4">
                                                                <div>{currentClassification}
                                                                    <br />
                                                                    <span className="large">({moment(lastSavedDate).format("YYYY MMM DD, h:mm a")})</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            {provisional && classificationStatus === 'In progress' ?
                                                <div>
                                                    <p className="alert alert-info">
                                                        <i className="icon icon-info-circle"></i> Select "Edit Classification" to edit the Last Saved Classification or click "Evidence Summary" to view all evidence
                                                        associated with the saved Classification. If you don't wish to save, click "Record Curation page" to add more evidence.
                                                    </p>
                                                </div>
                                                : null}
                                        </div>
                                    </Panel>
                                </PanelGroup>
                                {provisional && classificationStatus === 'In progress' ?
                                    <div className='modal-footer'>
                                        <button type="button" className="btn btn-default btn-inline-spacer" onClick={this.getCurationCentral}>Record Curation page <i className="icon icon-briefcase"></i></button>
                                        <button type="button" className="btn btn-info btn-inline-spacer" onClick={this.editClassification}>Edit Classification <i className="icon icon-pencil"></i></button>
                                        <button type="button" className="btn btn-primary btn-inline-spacer pull-right" onClick={this.viewEvidenceSummary}>Evidence Summary <i className="icon icon-file-text"></i></button>
                                    </div>
                                    : null}
                            </div>
                            {provisional && this.state.showProvisional ?
                                <div className="provisional-approval-content-wrapper">
                                    <div className="container">
                                        <p className="alert alert-info">
                                            <i className="icon icon-info-circle"></i> Save this Classification as Provisional if you are ready to send it for Review. Once saved as Provisional, the saved Provisional
                                            Classification may not be edited, but it will always be viewable and can be saved as Approved if their are no further changes required. If changes need to be made, existing
                                            evidence can be edited and/or new evidence added to the Gene:Disease Record at any time and a new current Provisional Classification made based on those changes. <em>Note: saving
                                            a Classification does not prevent existing evidence from being edited or scored and archived Provisional Classifications are always viewable</em>.
                                        </p>
                                    </div>
                                    <div className={classificationStatus === 'In progress' ? "container approval-process provisional-approval in-progress" : "container approval-process provisional-approval"}>
                                        <PanelGroup>
                                            <Panel title="Save Classification as Provisional" panelClassName="panel-data" open>
                                                <ProvisionalApproval
                                                    session={session}
                                                    gdm={gdm}
                                                    classification={currentClassification}
                                                    classificationStatus={classificationStatus}
                                                    provisional={provisional}
                                                    affiliation={affiliation}
                                                    updateSnapshotList={this.updateSnapshotList}
                                                    updateProvisionalObj={this.updateProvisionalObj}
                                                />
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                </div>
                                : null}
                            {provisional && this.state.showApproval ?
                                <div className="final-approval-content-wrapper">    
                                    <div className="container">
                                        <p className="alert alert-info">
                                            <i className="icon icon-info-circle"></i> Save the current (<i className="icon icon-flag"></i>) Provisional Classification as an Approved Classification
                                            when ready to do so by using the form below, or return at a later date and use the "Approved this Saved Provisional" button. Alternatively, you continue
                                            to edit/alter the existing evidence but you will need to create a new Provisional Classification for Approval.
                                        </p>
                                    </div>
                                    <div className="container approval-process final-approval">
                                        <PanelGroup>
                                            <Panel title="Approve Classification" panelClassName="panel-data" open>
                                                <ClassificationApproval
                                                    session={session}
                                                    gdm={gdm}
                                                    classification={currentClassification}
                                                    classificationStatus={classificationStatus}
                                                    provisional={provisional}
                                                    affiliation={affiliation}
                                                    updateSnapshotList={this.updateSnapshotList}
                                                    updateProvisionalObj={this.updateProvisionalObj}
                                                    snapshots={sortedSnapshotList}
                                                />
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                </div>
                                : null}
                            {sortedSnapshotList.length && (this.state.showPublish || this.state.showUnpublish) ?
                                <div className={'publish-approval-content-wrapper' + (this.state.showUnpublish ? ' unpublish' : '')}>
                                    <div className="container">
                                        {this.state.isPublishActive === 'auto' ?
                                            <p className="alert alert-info">
                                                <i className="icon icon-info-circle"></i> Publish the current (<i className="icon icon-flag"></i>) Approved Classification.
                                            </p>
                                            :
                                            <p className="alert alert-info">
                                                <i className="icon icon-info-circle"></i> {this.state.showUnpublish ? 'Unpublish' : 'Publish'} the selected Approved Classification.
                                            </p>
                                        }
                                    </div>
                                    <div className="container approval-process publish-approval">
                                        <PanelGroup>
                                            <Panel title={this.state.showUnpublish ? 'Unpublish Classification' : 'Publish Classification'} panelClassName="panel-data" open>
                                                <PublishApproval
                                                    session={session}
                                                    gdm={gdm}
                                                    classification={currentClassification}
                                                    classificationStatus={classificationStatus}
                                                    provisional={provisional}
                                                    affiliation={affiliation}
                                                    snapshots={sortedSnapshotList}
                                                    selectedSnapshotUUID={snapshotUUID}
                                                    updateSnapshotList={this.updateSnapshotList}
                                                    updateProvisionalObj={this.updateProvisionalObj}
                                                    clearPublishState={this.clearPublishState}
                                                />
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                </div>
                                : null}
                            {sortedSnapshotList.length ?
                                <div className="container snapshot-list">
                                    <PanelGroup>
                                        <Panel title="Saved Provisional and Approved Classification(s)" panelClassName="panel-data" open>
                                            <CurationSnapshots
                                                snapshots={sortedSnapshotList}
                                                approveProvisional={this.approveProvisional}
                                                addPublishState={this.addPublishState}
                                                isApprovalActive={isApprovalActive}
                                                isPublishEventActive={isPublishActive || isUnpublishActive ? true : false}
                                                classificationStatus={classificationStatus}
                                                demoVersion={demoVersion}
                                                allowPublishButton={this.isUserAllowedToPublish()}
                                                context={context} />
                                        </Panel>
                                    </PanelGroup>
                                </div>
                                : null}
                        </div>
                        :
                        null
                    )
                }
            </div>
        );
    }
});

curator_page.register(ProvisionalClassification,  'curator_page', 'provisional-classification');
