'use strict';
import React from 'react';
import createReactClass from 'create-react-class';
import { RestMixin } from './rest';
import { curator_page } from './globals';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import * as curator from './curator';

const AddAffiliation = createReactClass({
    mixins: [FormMixin, RestMixin],

    getInitialState() {
        return {
            errorMsg: '', // Error message to display 
            submitBusy: false // REST operation in progress
        };
    },

    // Form content validation
    validateForm() {
        // Start with default validation
        var valid = this.validateDefault();

        return valid;
    },

    // Called
    handleChange(e) {
        this.setState({errorMsg: ''});
    },

    // main recursive function that finds any child items, and generates and returns either the promises
    // for delete and history recording, the display strings, or the @ids of the items and its children,
    // depending on the mode (delete, display, id, respectively). The depth specifies the 'depth' of the
    // loop; should always be called at 0 when called outside of the function.
    recurseItem: function(item, depth, mode) {
        var returnPayload = [];
        var hasChildren = false;

        // check possible child objects
        if (item.group) {
            if (item.group.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.group, depth, mode, 'groups'));
        }
        if (item.family) {
            if (item.family.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.family, depth, mode, 'families'));
        }
        if (item.individual) {
            if (item.individual.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individual, depth, mode, 'individuals'));
        }
        if (item.familyIncluded) {
            if (item.familyIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.familyIncluded, depth, mode, 'families'));
        }
        if (item.individualIncluded) {
            if (item.individualIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individualIncluded, depth, mode, 'individuals'));
        }
        if (item.experimentalData) {
            if (item.experimentalData.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.experimentalData, depth, mode, 'experimental datas'));
        }
        if (item.caseControlStudies) {
            if (item.caseControlStudies.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.caseControlStudies, depth, mode, 'case control'));
        }
        if (item.caseCohort) {
            hasChildren = false;
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.caseCohort, depth, mode, 'case cohort'));
        }
        if (item.controlCohort) {
            hasChildren = false;
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.controlCohort, depth, mode, 'control cohort'));
        }

        // if the mode is 'delete', get the items' parents' info if needed, flatten the current item, set it as deleted
        // and inactive, and load the PUT and history record promises into the payload
        if (mode == 'delete') {
            var parentInfo;
            // if this is the target item being deleted, get its parent item information to store in the history object
            if (depth == 0) {
                parentInfo = {};
                if (item.associatedGdm && item.associatedGdm.length > 0) {
                    parentInfo.id = item.associatedGdm[0]['@id'];
                    parentInfo.name = item.associatedGdm[0].gdm_title;
                } else if (item.associatedAnnotations && item.associatedAnnotations.length > 0) {
                    parentInfo.id = item.associatedAnnotations[0]['@id'];
                    parentInfo.name = item.associatedAnnotations[0].associatedGdm[0].gdm_title + ':' + item.associatedAnnotations[0].article.pmid;
                } else if (item.associatedGroups && item.associatedGroups.length > 0) {
                    parentInfo.id = item.associatedGroups[0]['@id'];
                    parentInfo.name = item.associatedGroups[0].label;
                } else if (item.associatedFamilies && item.associatedFamilies.length > 0) {
                    parentInfo.id = item.associatedFamilies[0]['@id'];
                    parentInfo.name = item.associatedFamilies[0].label;
                }
            }
            // flatten the target item and set its status to deleted
            var deletedItem = flatten(item);
            deletedItem.status = 'deleted';

            // When delete case control
            if (item['@type'][0] === 'caseControl') {
                // Set status 'deleted' to case cohort
                let uuid = item.caseCohort['@id'];
                let deletedItem = flatten(item.caseCohort, 'group');
                deletedItem.status = 'deleted';
                this.putRestData(uuid + '?render=false', deletedItem);

                // Set status 'deleted' to control cohort
                uuid = item.controlCohort['@id'];
                deletedItem = flatten(item.controlCohort, 'group');
                deletedItem.status = 'deleted';
                this.putRestData(uuid + '?render=false', deletedItem);
            }

            // define operationType and add flags as needed
            var operationType = 'delete';
            if (depth > 0) {
                operationType += '-hide';
            }
            if (hasChildren) {
                operationType += '-hadChildren';
            }
            // push promises to payload
            returnPayload.push(this.putRestData(item['@id'] + '?render=false', deletedItem));
            returnPayload.push(this.recordHistory(operationType, item, null, parentInfo));
        }

        // return the payload, whether it's promises, display texts, or @ids
        return returnPayload;
    },

    // function for looping through a parent item's list of child items
    // of a specific type
    recurseItemLoop: function(tempSubItem, depth, mode, type) {
        var tempDisplayString;
        var returnPayload = [];
        if (tempSubItem) {
            if (tempSubItem.length > 0) {
                for (var i = 0; i < tempSubItem.length; i++) {
                    if (mode == 'display') {
                        // if the mode is 'display', generate the display string
                        tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; <a href={tempSubItem[i]['@id']} onClick={this.linkout}>{tempSubItem[i]['@type'][0]} {tempSubItem[i].label}</a></span>;
                        returnPayload.push(tempDisplayString);
                    } else if (mode == 'id') {
                        // if the mode is 'id', grab the @ids of the child items
                        returnPayload.push(tempSubItem[i]['@id']);
                    }
                    // call recurseItem on child item
                    returnPayload = returnPayload.concat(this.recurseItem(tempSubItem[i], depth + 1, mode));
                }
            } else {
                if (mode == 'display') {
                    // if childspace is empty, add a display line indicating the fact
                    tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; no associated {type}</span>;
                    returnPayload.push(tempDisplayString);
                }
            }
        }
        return returnPayload;
    },

    // Parent function when affiliating an item. Re-grabs the latest versions of the target and parent items,
    // finds and deletes all children of the target item, deletes the target item, removes the target item's
    // entry from the parent item, and saves the updated target item. Forwards user to curation central
    // upon completion.
    // When the form is submitted...
    submitForm(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();
        this.setState({submitBusy: true});

        const affiliationId = this.getFormValue('affiliation_id');
        const gdmUuid = this.getFormValue('gdm_uuid');
        let affiliatedItemType, deletedItem, affiliatedParent;
        if (this.validateDefault()) {
            this.getRestData('/gdm/' + gdmUuid, null, true).then(response => {
                // get up-to-date target object, then get the promises for deleting it and
                // all its children, along with the promises for any related history items
                let gdmObj = curator.flatten(response);
                deletedItemType = item['@type'][0];
                var deletePromises = this.recurseItem(item, 0, 'delete');
                return Promise.all(deletePromises); // wait for ALL promises to resolve
            }).then(rawData => {
                // get up-to-date parent object; also bypass issue of certain certain embedded parent
                // items in edit pages being un-flattenable
                return this.getRestData(parentUuid, null, true).then(parent => {
                    // flatten parent object and remove link to deleted item as appropriate
                    deletedParent = flatten(parent);
                    if (parent['@type'][0] == 'annotation') {
                        if (deletedItemType == 'group') {
                            deletedParent.groups = _.without(deletedParent.groups, itemUuid);
                        } else if (deletedItemType == 'family') {
                            deletedParent.families = _.without(deletedParent.families, itemUuid);
                        } else if (deletedItemType == 'individual') {
                            deletedParent.individuals = _.without(deletedParent.individuals, itemUuid);
                        } else if (deletedItemType == 'experimental') {
                            deletedParent.experimentalData = _.without(deletedParent.experimentalData, itemUuid);
                        } else if (deletedItemType == 'caseControl') {
                            deletedParent.caseControlStudies = _.without(deletedParent.caseControlStudies, itemUuid);
                        }
                    } else {
                        if (deletedItemType == 'family') {
                            deletedParent.familyIncluded = _.without(deletedParent.familyIncluded, itemUuid);
                        } else if (deletedItemType == 'individual') {
                            deletedParent.individualIncluded = _.without(deletedParent.individualIncluded, itemUuid);
                            if (parent['@type'][0] == 'family') {
                                // Empty variants of parent object if target item is individual and parent is family
                                deletedParent.segregation.variants = [];
                            }
                        }
                    }
                    // PUT updated parent object w/ removed link to deleted item
                    return this.putRestData(parentUuid, deletedParent).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                });
            }).then(data => {
                // forward user to curation central
                window.location.href = '/curation-central/?gdm=' + this.props.gdm.uuid + '&pmid=' + this.props.pmid;
            }).catch(function(e) {
                console.log('DELETE ERROR: %o', e);
            });
        }


        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            const firstName = this.getFormValue('affiliation_id');
            const lastName = this.getFormValue('gdm_uuid');

            // First see if there's a matching record, and give an error if there is.

            // Get the disease and gene objects corresponding to the given Orphanet and Gene IDs in parallel.
            // If either error out, set the form error fields
            this.getRestData(
                '/users/?email=' + curatorEmail + '&first_name=' + firstName + '&last_name=' + lastName
            ).then(data => {
                if (data.total === 0) {
                    // No matching record; make a new user
                    var newUser = {
                        email: curatorEmail,
                        first_name: firstName,
                        last_name: lastName,
                        groups: ["curator"],
                        job_title: "ClinGen Curator",
                        lab: '/labs/curator/',
                        submits_for: ['/labs/curator/'],
                        timezone: 'US/Pacific',
                        affiliation: affiliation && affiliation.length ? affiliation : []
                    };
                    return this.postRestData('/users/', newUser).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                } else {
                    // Found matching record; don't allow
                    throw {statusText: 'A matching curator exists'};
                }
            }).then(newUser => {
                this.setState({
                    submitBusy: false,
                    errorMsg: 'Curator ' + curatorEmail + ' successfully added'
                });
            }).catch(e => {
                if (!e.statusText) {
                    e.statusText = 'An unexpected error occurred.';
                } else if (e.statusText === 'Conflict') {
                    e.statusText = 'A curator with the same email exists';
                }
                this.setState({
                    submitBusy: false,
                    errorMsg: e.statusText
                });
            });
        }
    },

    render() {
        const submitErrClass = 'submit-err pull-right' + (this.state.errorMsg ? '' : ' hidden');

        return (
            <div className="container">
                <h1>{this.props.context.title}</h1>
                <div className="col-md-8 col-md-offset-2 col-sm-9 col-sm-offset-1 form-add-affiliation">
                    <Panel panelClassName="panel-add-affiliation">
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            <div className="row">
                                <Input type="text" ref="affiliation_id" label="Affiliation ID" handleChange={this.handleChange}
                                    error={this.getFormError('affiliation_id')} clearError={this.clrFormErrors.bind(null, 'affiliation_id')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="text" ref="gdm_uuid" label="GDM UUID" handleChange={this.handleChange}
                                    error={this.getFormError('gdm_uuid')} clearError={this.clrFormErrors.bind(null, 'gdm_uuid')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <div className="curation-submit clearfix">
                                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Submit" submitBusy={this.state.submitBusy} />
                                    <div className={submitErrClass}>{this.state.errorMsg}</div>
                                </div>
                            </div>
                        </Form>
                    </Panel>
                </div>
            </div>
        );
    }
});

curator_page.register(AddAffiliation, 'curator_page', 'add-affiliation');
