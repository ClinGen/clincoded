'use strict';
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { RestMixin } from './rest';
import { curator_page } from './globals';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import * as curator from './curator';
import { getAllGdmObjects } from '../libs/get_all_gdm_objects';

/**
 * Return an array of '@id' from the annotations, evidence, scores, classifications
 * @param {object} gdm - The gene-disease record data object
 */
const findAllObjectIds = (gdm, contributorUuids) => {
    let allObjects = getAllGdmObjects(gdm);
    // Remove objects not created by the same user who started the GDM
    let filteredObjects = allObjects.filter(obj => {
        return contributorUuids.indexOf(obj.submitted_by.uuid) > -1;
    });
    // Extract the '@id' values from the filtered objects array into a new array
    let objIds = filteredObjects.map(object => {
        return object['@id'];
    });

    let uniqueIds = _.uniq(objIds);

    return uniqueIds;
};

const AddAffiliation = createReactClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object
    },

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

    // Handle the showing of message
    handleChange(e) {
        this.setState({errorMsg: ''});
    },

    // PUT the objects in an array to given the associated affiliation id
    putRestDatas(objs, affiliationId) {
        return Promise.all(objs.map(obj => {
            let newObj = _.clone(obj);
            newObj.affiliation = affiliationId;
            delete newObj['@id'];
            return this.putRestData(obj['@id'], newObj);
        }));
    },

    /**
     * Method to add affiliation to the GDM and its nested objects when form is submitted
     * @param {object} e - Event object
     */
    submitForm(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();
        this.setState({submitBusy: true});

        const affiliationId = this.getFormValue('affiliation_id');
        const gdmUuid = this.getFormValue('gdm_uuid');
        const contributorUuids = this.getFormValue('contributor_uuid');
        // Convert contributor(s) UUIDs string into array
        const re = /\s*(?:,|$)\s*/;
        var contributorUuidList = contributorUuids.split(re);
        if (this.validateDefault() && affiliationId && gdmUuid) {
            // Get up-to-date gdm object
            this.getRestData('/gdm/' + gdmUuid, null, true).then(gdmObj => {
                // Gather all objects' '@id', including the GDM's
                const objIds = findAllObjectIds(gdmObj, contributorUuidList);
                objIds.push('/gdm/' + gdmUuid);
                return Promise.resolve(objIds);
            }).then(ObjectIds => {
                if (ObjectIds.length) {
                    // Get all objects given their '@id' and flatten them
                    // Return all flattened objects in an array as a promise
                    let tempObjArray = [];
                    return this.getRestDatas(ObjectIds).then(objects => {
                        objects.map(obj => {
                            let newObj = curator.flatten(obj);
                            // Insert '@id' back into the flattened object
                            newObj['@id'] = obj['@id'];
                            tempObjArray.push(newObj);
                        });
                        return Promise.all(tempObjArray);
                    });
                }
            }).then(objectList => {
                if (objectList && objectList.length) {
                    let tempArray = [];
                    // Return a new array with only the objects that don't already have affiliations
                    let filteredList = objectList.filter(object => {
                        return !object.affiliation || (object.affiliation && !object.affiliation.length);
                    });
                    // Batch update the objects with affiliations
                    return this.putRestDatas(filteredList, affiliationId).then(response => {
                        for (let item of response) {
                            tempArray.push(item['@graph'][0]);
                        }
                        return Promise.resolve(tempArray);
                    });
                } else {
                    return Promise.resolve(null);
                }
            }).then(data => {
                if (data && data.length) {
                    this.setState({
                        submitBusy: false,
                        errorMsg: 'The Gene-Disease record has been affiliated with ' + affiliationId
                    });
                } else {
                    console.warn('Result: ' + JSON.stringify(data));
                    this.setState({
                        submitBusy: false,
                        errorMsg: 'Something seems wrong. Check console warnings.'
                    });
                }
            }).catch(e => {
                console.log('AFFILIATION ERROR: %o', e);
                if (!e.statusText) {
                    e.statusText = 'An unexpected error occurred.';
                } else if (e.statusText === 'Conflict') {
                    e.statusText = 'Affiliation already exists';
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
        const title = this.props.context.title;
        const user = this.props.session.user_properties;
        let group = user && user.groups && user.groups.length ? user.groups[0] : null;

        return (
            <div className="container">
                {group === 'admin' ?
                    <div>
                        <h1>{title}</h1>
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
                                        <Input type="text" ref="contributor_uuid" label="Contributor UUID(s)" handleChange={this.handleChange}
                                            error={this.getFormError('contributor_uuid')} clearError={this.clrFormErrors.bind(null, 'contributor_uuid')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group"
                                            placeholder="Separate UUIDs with commas" required />
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Submit" submitBusy={this.state.submitBusy} />
                                            <div className={submitErrClass}>{this.state.errorMsg}</div>
                                        </div>
                                    </div>
                                </Form>
                            </Panel>
                        </div>
                    </div>
                    :
                    <div><h3><i className="icon icon-exclamation-triangle"></i> Sorry. You do not have access to this page.</h3></div>
                }
            </div>
        );
    }
});

curator_page.register(AddAffiliation, 'curator_page', 'add-affiliation');
