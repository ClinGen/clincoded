import React from 'react';
import PropTypes from 'prop-types';
import { property } from 'underscore';

import { Form, Input } from '../libs/bootstrap/form';

const propTypes = {
    updateMsg: PropTypes.node,
    submitBusy: PropTypes.bool.isRequired,
    isEditingNotes: PropTypes.bool.isRequired,
    annotation: PropTypes.object.isRequired,
    currPmidNotes: PropTypes.object.isRequired,
    setEditMode: PropTypes.func.isRequired,
    handleSaveNotes: PropTypes.func.isRequired,
    handleTextChange: PropTypes.func.isRequired,
    handleCheckboxChange: PropTypes.func.isRequired,
};

const defaultProps = {
    updateMsg: null,
};

const PubMedNotesBox = ({
    updateMsg,
    submitBusy,
    isEditingNotes,
    annotation,
    currPmidNotes,
    setEditMode,
    handleSaveNotes,
    handleTextChange,
    handleCheckboxChange,
}) => (
    <div>
        {
            isEditingNotes
                ? (
                    <Form submitHandler={(e) => handleSaveNotes(e, annotation)} formClassName="form-horizontal pubmed-notes-box">
                        <div className="form-group">
                            <Input
                                type="checkbox"
                                label="Non-scorable evidence"
                                labelClassName="col-sm-10 no-padding"
                                groupClassName="col-sm-4"
                                checked={property(['nonscorable', 'checked'])(currPmidNotes)}
                                defaultChecked="false"
                                handleChange={(ref, e) => handleCheckboxChange(e, 'nonscorableCheckbox')}
                            />
                            <Input
                                type="textarea"
                                controlledValue={property(['nonscorable', 'text'])(currPmidNotes)}
                                wrapperClassName="col-sm-8"
                                handleChange={(ref, e) => handleTextChange(e, 'nonscorableText')}
                            />
                        </div>
                        <div className="form-group">
                            <Input
                                type="checkbox"
                                label="Other comments on PMID"
                                labelClassName="col-sm-10 no-padding"
                                groupClassName="col-sm-4"
                                checked={property(['other', 'checked'])(currPmidNotes)}
                                defaultChecked="false"
                                handleChange={(ref, e) => handleCheckboxChange(e, 'otherCheckbox')}
                            />
                            <Input
                                type="textarea"
                                controlledValue={property(['other', 'text'])(currPmidNotes)}
                                wrapperClassName="col-sm-8"
                                handleChange={(ref, e) => handleTextChange(e, 'otherText')}
                            />
                        </div>
                        <div className="flex-right">
                            {
                                updateMsg
                                    && <div className="submit-info pull-right">{ updateMsg }</div>
                            }
                            <Input
                                type="submit"
                                id="submit"
                                inputClassName="btn-primary pull-right"
                                title="Save"
                                submitBusy={submitBusy}
                            />
                        </div>
                    </Form>
                ) : (
                    <div className="form-horizontal pubmed-notes-box">
                        <div className="form-group">
                            <div className="col-sm-4">
                                <label className="col-sm-10 no-padding">Non-scorable evidence</label>
                                {
                                    property(['nonscorable', 'checked'])(currPmidNotes)
                                        && <i className="icon icon-check" />
                                }
                            </div>
                            <div className="col-sm-8">
                                {
                                    property(['articleNotes', 'nonscorable', 'text'])(annotation)
                                        ? <span>{ annotation.articleNotes.nonscorable.text }</span>
                                        : <i className="empty-text-placeholder">None</i>
                                }
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="col-sm-4">
                                <label htmlFor="other" className="col-sm-10 no-padding">Other comments on PMID</label>
                                {
                                    property(['other', 'checked'])(currPmidNotes)
                                        && <i className="icon icon-check" />
                                }
                            </div>
                            <div className="col-sm-8">
                                {
                                    property(['articleNotes', 'other', 'text'])(annotation)
                                        ? <span>{ annotation.articleNotes.other.text }</span>
                                        : <i className="empty-text-placeholder">None</i>
                                }
                            </div>
                        </div>
                        <div className="flex-right">
                            {
                                updateMsg
                                    && <div className="submit-info pull-right">{ updateMsg }</div>
                            }
                            <Input
                                type="button"
                                id="edit"
                                inputClassName="btn-primary pull-right"
                                title="Edit"
                                clickHandler={() => setEditMode(true)}
                            />
                        </div>
                    </div>
                )
        }
    </div>
);

PubMedNotesBox.propTypes = propTypes;
PubMedNotesBox.defaultProps = defaultProps;

export default PubMedNotesBox;
