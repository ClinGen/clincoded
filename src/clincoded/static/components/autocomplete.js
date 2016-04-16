'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('./globals');
var fetched = require('./fetched');
var $script = require('scriptjs');
var url = require('url');
var form = require('../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var FetchedData = fetched.FetchedData;
var Param = fetched.Param;


const AutoCompleteBox = React.createClass({
    render: function() {
        var terms = this.props.search_param['@graph']; // List of matching terms from server
        var userTerm = this.props.userTerm && this.props.userTerm.toLowerCase(); // Term user entered

        if (!this.props.hide && userTerm && userTerm.length && terms && terms.length) {
            return (
                <ul className="lookup-autocomplete">
                    {terms.map(function(term) {
                        var matchStart, matchEnd;
                        var preText, matchText, postText;

                        // Boldface matching part of term
                        matchStart = term.text.toLowerCase().indexOf(userTerm);
                        if (matchStart >= 0) {
                            matchEnd = matchStart + userTerm.length;
                            preText = term.text.substring(0, matchStart);
                            matchText = term.text.substring(matchStart, matchEnd);
                            postText = term.text.substring(matchEnd);
                        } else {
                            preText = term.text;
                        }
                        return <li key={term.text} tabIndex="0" onClick={this.props.handleClick.bind(null, term.text, term.payload.id, this.props.name)}>{preText}<b>{matchText}</b>{postText}</li>;
                    }, this)}
                </ul>
            );
        } else {
            return null;
        }
    }
});

const AutoComplete = module.exports.AutoComplete = React.createClass({
    propTypes: {
        name: React.PropTypes.string, // <input> name
        id: React.PropTypes.string, // <input> id
        inputClassName: React.PropTypes.string, // CSS classes to add to input elements themselves
        defaultValue: React.PropTypes.string, // <input> default value
        placeholder: React.PropTypes.string, // <input> placeholder text
        validationPattern: React.PropTypes.string, //<input> value validation pattern, e.g. [a-zA-Z0-9]+
        label: React.PropTypes.oneOfType([ // <label> for input; string or another React component
            React.PropTypes.string,
            React.PropTypes.object
        ]),
        labelClassName: React.PropTypes.string, // CSS classes to add to labels
        wrapperClassName: React.PropTypes.string, // CSS classes to add to wrapper div around inputs
        groupClassName: React.PropTypes.string, // CSS classes to add to control groups (label/input wrapper div)
        error: React.PropTypes.string, // Error message to display below input
        clearError: React.PropTypes.func, // called to clear error message
        required: React.PropTypes.bool // <input> required attribute
    },

    contextTypes: {
        fetch: React.PropTypes.func,
        autocompleteTermChosen: React.PropTypes.bool,
        autocompleteHidden: React.PropTypes.bool,
        onAutocompleteHiddenChange: React.PropTypes.func,
        location_href: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            showAutoSuggest: false,
            searchTerm: '',
            terms: {}
        };
    },

    //*** Start: Lifecycle methods ***//
    componentDidMount: function() {
        // Use timer to limit to one request per second
        this.timer = setInterval(this.tick, 1000);
    },

    componentWillUnmount: function() {
        clearInterval(this.timer);
    },
    //*** End: Lifecycle methods ***//

    // Called when any input's value changes from user input
    handleChange: function(e) {
        this.setState({showAutoSuggest: true});
        this.newSearchTerm = e.target.value;
        if (this.props.clearError) {
            this.props.clearError();
        }
    },

    // Called when user clicks on any suggetsed value <AutoCompleteBox>
    handleAutocompleteClick: function(term, id, name) {
        var newTerms = {};
        var inputNode = this.refs['lookup-input'];
        inputNode.value = this.newSearchTerm = term;
        newTerms[name] = id;
        this.setState({terms: newTerms});
        this.setState({showAutoSuggest: false});
        inputNode.focus();
        // Now let the timer update the terms state when it gets around to it.
    },

    tick: function() {
        if (this.newSearchTerm !== this.state.searchTerm) {
            this.setState({searchTerm: this.newSearchTerm});
        }
    },

    render: function() {
        var context = this.props.context;
        var id = url.parse(this.context.location_href, true);
        //var region = id.query['region'] || '';

        var input;
        var inputClasses = 'form-control' + (this.props.error ? ' error' : '') + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
        var groupClassName = 'autocomplete-group' + (this.props.groupClassName ? ' ' + this.props.groupClassName : '');

        var innerInput = (
            <span className="autocomplete-suggester">
                <input type="hidden" name="clinicalgenome" value="hgncgene" />
                {Object.keys(this.state.terms).map(function(key) {
                    return <input type="hidden" name={key} value={this.state.terms[key]} key={key} />;
                }, this)}
                <input
                    type="text"
                    ref="lookup-input"
                    name={this.props.name}
                    id={this.props.id}
                    className={inputClasses}
                    defaultValue={this.props.defaultValue}
                    placeholder={this.props.placeholder}
                    pattern={this.props.validationPattern}
                    onChange={this.handleChange}
                    autoComplete="off" />
                {(this.state.showAutoSuggest && this.state.searchTerm) ?
                    <FetchedData loadingComplete={true}>
                        <Param name="search_param" url={'/suggest/?q=' + this.state.searchTerm} />
                        <AutoCompleteBox name="lookup_terms" userTerm={this.state.searchTerm} handleClick={this.handleAutocompleteClick} />
                    </FetchedData>
                : null}
                <div className="form-error">{this.props.error ? <span>{this.props.error}</span> : <span>&nbsp;</span>}</div>
            </span>
        );

        input = (
            <div className={groupClassName}>
                {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                {this.props.wrapperClassName ? <div className={this.props.wrapperClassName}>{innerInput}</div> : <span>{innerInput}</span>}
            </div>
        );

        return <span>{input}</span>;
    }
});
