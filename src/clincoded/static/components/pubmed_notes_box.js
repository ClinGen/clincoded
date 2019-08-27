import React from 'react';
import PropTypes from 'prop-types';

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
                                checked={currPmidNotes.nonscorable.checked}
                                defaultChecked="false"
                                handleChange={(ref, e) => handleCheckboxChange(e, 'nonscorableCheckbox')}
                            />
                            <Input
                                type="textarea"
                                controlledValue={currPmidNotes.nonscorable.text}
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
                                checked={currPmidNotes.other.checked}
                                defaultChecked="false"
                                handleChange={(ref, e) => handleCheckboxChange(e, 'otherCheckbox')}
                            />
                            <Input
                                type="textarea"
                                controlledValue={currPmidNotes.other.text}
                                wrapperClassName="col-sm-8"
                                handleChange={(ref, e) => handleTextChange(e, 'otherText')}
                            />
                        </div>
                        <div className="flex-right">
                            {
                                updateMsg
                                    && <div className="submit-info pull-right">{updateMsg}</div>
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
                                    currPmidNotes.nonscorable.checked
                                        && <i className="icon icon-check" />
                                }
                            </div>
                            <div className="col-sm-8">
                                {
                                    annotation.articleNotes && annotation.articleNotes.other && annotation.articleNotes.nonscorable.text
                                        ? <span>{ annotation.articleNotes.nonscorable.text }</span>
                                        : <i className="empty-text-placeholder">None</i>
                                }
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="col-sm-4">
                                <label htmlFor="other" className="col-sm-10 no-padding">Other comments on PMID</label>
                                {
                                    currPmidNotes.other.checked
                                        && <i className="icon icon-check" />
                                }
                            </div>
                            <div className="col-sm-8">
                                {
                                    annotation.articleNotes && annotation.articleNotes.other && annotation.articleNotes.other.text
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
