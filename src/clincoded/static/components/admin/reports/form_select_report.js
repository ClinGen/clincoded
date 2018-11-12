import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from '../../../libs/bootstrap/form';

class AdminReportSelectionForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedReport: 'none', // The selected report option from dropdown 
            submitBusy: false // REST operation in progress
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({submitBusy: this.props.submitBusy});
    }

    /**
     * Method to handle report selection changes
     */
    handleChange(event) {
        this.setState({selectedReport: event.target.value});
    }

    /**
     * Method to handle form submit event
     */
    handleSubmit(event) {
        // Disbale submit button while fetching data
        this.setState({submitBusy: true}, () => {
            // Propagate report selection up to parent component
            this.props.onSubmit(this.state.selectedReport);
        });
        // Don't run through HTML submit handler
        event.preventDefault(); event.stopPropagation();
    }
    
    render() {
        const selectedReport = this.state.selectedReport;

        return (
            <form onSubmit={this.handleSubmit} className="form-report-criteria">
                <div className="form-report-criteria-content clearfix">
                    <div className="form-group">
                        <label><span>Select report:</span></label>
                        <div>
                            <select className="form-control" value={selectedReport} onChange={this.handleChange}>
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Interpretation Stats for Expert Panels">Interpretation Stats for Expert Panels</option>
                                <option value="Gene-Disease Record Stats for Expert Panels">Gene-Disease Record Stats for Expert Panels</option>
                            </select>
                        </div>
                    </div>
                    <Input type="submit" inputClassName="btn-primary submit-report" id="submit" title="Submit" submitBusy={this.state.submitBusy} />
                </div>
            </form>
        );
    }
}

AdminReportSelectionForm.propTypes = {
    onSumit: PropTypes.func,
    submitBusy: PropTypes.bool
};

export default AdminReportSelectionForm;