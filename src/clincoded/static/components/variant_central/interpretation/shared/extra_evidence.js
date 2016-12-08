'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var form = require('../../../../libs/bootstrap/form');
var RestMixin = require('../../../rest').RestMixin;
var curator = require('../../../curator');
var PmidSummary = curator.PmidSummary;
var CuratorHistory = require('../../../curator_history');
var add_external_resource = require('../../../add_external_resource');
var AddResourceId = add_external_resource.AddResourceId;

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Class to render the extra evidence table in VCI, and handle any interactions with it
var ExtraEvidenceTable = module.exports.ExtraEvidenceTable = React.createClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        viewOnly: React.PropTypes.bool, // True if extra evidence is in view-only mode
        tableName: React.PropTypes.object, // table name as HTML object
        category: React.PropTypes.string, // category (usually the tab) the evidence is part of
        subcategory: React.PropTypes.string, // subcategory (usually the panel) the evidence is part of
        href_url: React.PropTypes.object, // href_url object
        session: React.PropTypes.object, // session object
        variant: React.PropTypes.object, // parent variant object
        interpretation: React.PropTypes.object, // parent interpretation object
        updateInterpretationObj: React.PropTypes.func // function from index.js; this function will pass the updated interpretation object back to index.js
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false, // spinner for Save button
            editBusy: false, // spinner for Edit button
            deleteBusy: false, // spinner for Delete button
            updateMsg: null,
            tempEvidence: null, // evidence object brought in my AddResourceId modal
            editEvidenceId: null, // the ID of the evidence to be edited from the table
            descriptionInput: null, // state to store the description input content
            editDescriptionInput: null, // state to store the edit description input content
            variant: this.props.variant, // parent variant object
            interpretation: this.props.interpretation ? this.props.interpretation : null // parent interpretation object
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // Update variant object when received
        if (nextProps.variant) {
            this.setState({variant: nextProps.variant});
        }
        // Update interpretation object when received
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
    },

    updateTempEvidence: function(article) {
        // Called by AddResourceId modal upon closing modal. Updates the tempEvidence state and clears description input
        this.setState({tempEvidence: article, descriptionInput: null});
    },

    submitForm: function(e) {
        // Called when Add PMID form is submitted
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        let flatInterpretation = null;
        let freshInterpretation = null;

        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            // get updated interpretation object, then flatten it
            freshInterpretation = interpretation;
            flatInterpretation = curator.flatten(freshInterpretation);

            // create extra_evidence object to be inserted
            let extra_evidence = {
                variant: this.state.interpretation.variant['@id'],
                category: this.props.category,
                subcategory: this.props.subcategory,
                articles: [this.state.tempEvidence.pmid],
                evidenceDescription: this.refs['description'].getValue()
            };

            return this.postRestData('/extra-evidence/', extra_evidence).then(result => {
                // post the new extra evidence object, then add its @id to the interpretation's extra_evidence_list array
                if (!flatInterpretation.extra_evidence_list) {
                    flatInterpretation.extra_evidence_list = [];
                }
                flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);

                // update interpretation object
                return this.recordHistory('add-hide', result['@graph'][0]).then(addHistory => {
                    return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                        return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                            return Promise.resolve(data['@graph'][0]);
                        });

                    });
                });

            });
        }).then(interpretation => {
            // upon successful save, set everything to default state, and trigger updateInterptationObj callback
            this.setState({submitBusy: false, tempEvidence: null, descriptionInput: null});
            this.props.updateInterpretationObj();
        }).catch(error => {
            this.setState({submitBusy: false, tempEvidence: null, updateMsg: <span className="text-danger">Something went wrong while trying to save this evidence!</span>});
            console.log(error);
        });
    },

    cancelAddEvidenceButton: function(e) {
        // called when the Cancel button is pressed during Add PMID
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({tempEvidence: null, descriptionInput: null});
    },

    editEvidenceButton: function(id) {
        // called when the Edit button is pressed for an existing evidence
        this.setState({editEvidenceId: id, editDescriptionInput: null});
    },

    cancelEditEvidenceButton: function(e) {
        // called when the Cancel button is pressed while editing an existing evidence
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({editEvidenceId: null, editDescriptionInput: null});
    },

    submitEditForm: function(e) {
        // called when Edit PMID form is submitted
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({editBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // since the extra_evidence object is really simple, and the description is the only thing changing,
        // make a new one instead of getting an updated and flattened one
        let extra_evidence = {
            variant: this.state.interpretation.variant['@id'],
            category: this.props.category,
            subcategory: this.props.subcategory,
            articles: [this.refs['edit-pmid'].getValue()],
            evidenceDescription: this.refs['edit-description'].getValue()
        };

        this.putRestData(this.refs['edit-target'].getValue(), extra_evidence).then(result => {
            this.recordHistory('modify-hide', result['@graph'][0]).then(addHistory => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({editBusy: false, editEvidenceId: null, editDescriptionInput: null});
                this.props.updateInterpretationObj();
            });
        }).catch(error => {
            this.setState({editBusy: false, editEvidenceId: null, editDescriptionInput: null});
            console.log(error);
        });
    },

    deleteEvidence: function(evidence) {
        // called when the Delete button for an existing evidence is pressed
        this.setState({deleteBusy: true});

        let deleteTargetId = evidence['@id'];
        let flatInterpretation = null;
        let freshInterpretation = null;

        // since the extra_evidence object is really simple, and the description is the only thing changing,
        // make a new one instead of getting an updated and flattened one
        let extra_evidence = {
            variant: evidence.variant,
            category: this.props.category,
            subcategory: this.props.subcategory,
            articles: [evidence.articles[0]['@id']],
            evidenceDescription: evidence.evidenceDescription,
            status: 'deleted'
        };

        this.putRestData(evidence['@id'] + '?render=false', extra_evidence).then(result => {
            return this.recordHistory('delete-hide', result['@graph'][0]).then(deleteHistory => {
                return this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
                    // get updated interpretation object, then flatten it
                    freshInterpretation = interpretation;
                    flatInterpretation = curator.flatten(freshInterpretation);

                    // remove removed evidence from evidence list
                    flatInterpretation.extra_evidence_list.splice(flatInterpretation.extra_evidence_list.indexOf(deleteTargetId), 1);

                    // update the interpretation object
                    return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                        return this.recordHistory('modify-hide', data['@graph'][0]).then(editHistory => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    });
                });
            }).then(interpretation => {
                // upon successful save, set everything to default state, and trigger updateInterptationObj callback
                this.setState({deleteBusy: false});
                this.props.updateInterpretationObj();
            });
        }).catch(error => {
            this.setState({deleteBusy: false});
            console.log(error);
        });
    },

    renderInterpretationExtraEvidence: function(extra_evidence) {
        // for rendering the evidence in tabular format
        return (
            <tr key={extra_evidence.uuid}>
                <td className="col-md-5"><PmidSummary article={extra_evidence.articles[0]} pmidLinkout /></td>
                <td className="col-md-5">{extra_evidence.evidenceDescription}</td>
                <td className="col-md-2">
                    {extra_evidence.submitted_by.title} ({moment(extra_evidence.date_created).format("YYYY MMM DD, h:mm a")})
                    {!this.props.viewOnly && this.props.session && this.props.session.user_properties && extra_evidence.submitted_by['@id'] === this.props.session.user_properties['@id'] ?
                        <div>
                            <button className="btn btn-primary btn-inline-spacer" onClick={() => this.editEvidenceButton(extra_evidence['@id'])}>Edit</button>
                            <Input type="button-button" inputClassName="btn btn-danger btn-inline-spacer" title="Delete" submitBusy={this.state.deleteBusy}
                                clickHandler={() => this.deleteEvidence(extra_evidence)} />
                        </div>
                    : null}
                </td>
            </tr>
        );
    },

    handleDescriptionChange: function(ref, e) {
        // handles updating the state on textbox input change
        if (ref === 'description') {
            this.setState({descriptionInput: this.refs[ref].getValue()});
        } else if (ref === 'edit-description') {
            this.setState({editDescriptionInput: this.refs[ref].getValue()});
        }

    },

    renderInterpretationExtraEvidenceEdit: function(extra_evidence) {
        return (
            <tr key={extra_evidence.uuid}>
                <td colSpan="3">
                    <PmidSummary article={extra_evidence.articles[0]} className="alert alert-info" pmidLinkout />
                    <Form submitHandler={this.submitEditForm} formClassName="form-horizontal form-std">
                        <Input type="text" ref="edit-target" value={extra_evidence['@id']} inputDisabled={true} groupClassName="hidden" />
                        <Input type="text" ref="edit-pmid" value={extra_evidence.articles[0].pmid} inputDisabled={true} groupClassName="hidden" />
                        <Input type="textarea" ref="edit-description" rows="2" label="Evidence:" value={extra_evidence.evidenceDescription} defaultValue={extra_evidence.evidenceDescription}
                            labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-10" groupClassName="form-group" handleChange={this.handleDescriptionChange} />
                        <div className="clearfix">
                            <button className="btn btn-default pull-right btn-inline-spacer" onClick={this.cancelEditEvidenceButton}>Cancel Edit</button>
                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                                submitBusy={this.state.editBusy} inputDisabled={!(this.state.editDescriptionInput && this.state.editDescriptionInput.length > 0)} />
                            {this.state.updateMsg ?
                                <div className="submit-info pull-right">{this.state.updateMsg}</div>
                            : null}
                        </div>
                    </Form>
                </td>
            </tr>
        );
    },

    render: function() {
        let relevantEvidenceList = [];
        if (this.state.variant && this.state.variant.associatedInterpretations) {
            this.state.variant.associatedInterpretations.map(interpretation => {
                if (interpretation.extra_evidence_list) {
                    interpretation.extra_evidence_list.map(extra_evidence => {
                        if (extra_evidence.subcategory === this.props.subcategory) {
                            relevantEvidenceList.push(extra_evidence);
                        }
                    });
                }
            });
        }
        let parentObj = {/* // BEHAVIOR TBD
            '@type': ['evidenceList'],
            'evidenceList': relevantEvidenceList
        */};

        return (
            <div className="panel panel-info">
                <div className="panel-heading"><h3 className="panel-title">{this.props.tableName}</h3></div>
                <div className="panel-content-wrapper">
                    <table className="table">
                        {relevantEvidenceList.length > 0 ?
                            <thead>
                                <tr>
                                    <th>Article</th>
                                    <th>Evidence</th>
                                    <th>Submitted by</th>
                                </tr>
                            </thead>
                        : null}
                        <tbody>
                            {relevantEvidenceList.length > 0 ?
                                relevantEvidenceList.map(evidence => {
                                    return (this.state.editEvidenceId === evidence['@id']
                                        ? this.renderInterpretationExtraEvidenceEdit(evidence)
                                        : this.renderInterpretationExtraEvidence(evidence));
                                })
                            : <tr><td colSpan="3"><span>&nbsp;&nbsp;No evidence added.</span></td></tr>}
                            {!this.props.viewOnly ?
                                <tr>
                                    <td colSpan="3">
                                        {this.state.tempEvidence ?
                                            <span>
                                                <PmidSummary article={this.state.tempEvidence} className="alert alert-info" pmidLinkout />
                                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                                    <Input type="textarea" ref="description" rows="2" label="Evidence:" handleChange={this.handleDescriptionChange}
                                                        labelClassName="col-xs-2 control-label" wrapperClassName="col-xs-10" groupClassName="form-group" />
                                                    <div className="clearfix">
                                                        <AddResourceId resourceType="pubmed" protocol={this.props.href_url.protocol} parentObj={parentObj} buttonClass="btn-info"
                                                            buttonText="Edit PMID" modalButtonText="Add Article" updateParentForm={this.updateTempEvidence} buttonOnly={true} />
                                                        <button className="btn btn-default pull-right btn-inline-spacer" onClick={this.cancelAddEvidenceButton}>Cancel</button>
                                                        <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                                                            submitBusy={this.state.submitBusy} inputDisabled={!(this.state.descriptionInput && this.state.descriptionInput.length > 0)} />
                                                        {this.state.updateMsg ?
                                                            <div className="submit-info pull-right">{this.state.updateMsg}</div>
                                                        : null}
                                                    </div>
                                                </Form>
                                            </span>
                                        :
                                            <span>
                                                <AddResourceId resourceType="pubmed" protocol={this.props.href_url.protocol} parentObj={parentObj} buttonClass="btn-primary"
                                                    buttonText="Add PMID" modalButtonText="Add Article" updateParentForm={this.updateTempEvidence} buttonOnly={true} />

                                                &nbsp;&nbsp;Select "Add PMID" to curate and save a piece of evidence from a published article.
                                            </span>
                                        }
                                    </td>
                                </tr>
                            : null}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
});
