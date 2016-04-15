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


const SuggestionBox = React.createClass({
    render: function() {
        var terms = this.props.autocomplete_param['@graph']; // List of matching terms from server
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
/*
const contextTypes = {
    fetch: React.PropTypes.func,
    autocompleteTermChosen: React.PropTypes.bool,
    autocompleteHidden: React.PropTypes.bool,
    onAutocompleteHiddenChange: React.PropTypes.func,
    location_href: React.PropTypes.string
};

const propTypes = {
    inputRef: React.PropTypes.string, // <input> ref
    inputName: React.PropTypes.string, // <input> name
    inputId: React.PropTypes.string, // <input> id
    inputClassName: React.PropTypes.string, // CSS classes to add to input elements themselves
    defaultValue: React.PropTypes.string, // <input> default value
    placeholder: React.PropTypes.string, // <input> placeholder text
    validationPattern: React.PropTypes.string, //<input> value validation pattern, e.g. [a-zA-Z0-9]+
};

const defaultProps = {
    inputType: 'text',
    autocompleteAttribute: 'off',
};
*/
const AutoCompleteModule = module.exports.AutoCompleteModule = React.createClass({
    propTypes: {
        inputRef: React.PropTypes.string, // <input> ref
        inputName: React.PropTypes.string, // <input> name
        inputId: React.PropTypes.string, // <input> id
        inputClassName: React.PropTypes.string, // CSS classes to add to input elements themselves
        defaultValue: React.PropTypes.string, // <input> default value
        placeholder: React.PropTypes.string, // <input> placeholder text
        validationPattern: React.PropTypes.string, //<input> value validation pattern, e.g. [a-zA-Z0-9]+
        inputLabel: React.PropTypes.object,
        inputLabelClassName: React.PropTypes.string,
        inputWrapperClassName: React.PropTypes.string,
        inputGroupClassName: React.PropTypes.string,
        inputError: React.PropTypes.string,
        inputClearError: React.PropTypes.func
    },

    contextTypes: {
        fetch: React.PropTypes.func,
        autocompleteTermChosen: React.PropTypes.bool,
        autocompleteHidden: React.PropTypes.bool,
        onAutocompleteHiddenChange: React.PropTypes.func,
        location_href: React.PropTypes.string
    },

    getDefaultProps: function() {
        return {
            inputType: 'text',
            autocompleteAttribute: 'off'
        };
    },

    getInitialState: function() {
        return {
            showAutoSuggest: false,
            searchTerm: '',
            terms: {}
        };
    },
    /*
    constructor(props) {
        super(props);
        this.state = {
            showAutoSuggest: false,
            searchTerm: '',
            terms: {}
        };
        this.handleChange = this.handleChange.bind(this);
    },
    */
    //*** Start: Lifecycle methods ***//
    componentDidMount: function() {
        // Use timer to limit to one request per second
        this.timer = setInterval(this.tick, 1000);
    },

    componentWillUnmount: function() {
        clearInterval(this.timer);
    },
    //*** End: Lifecycle methods ***//

    handleChange: function(ref, e) {
        this.setState({showAutoSuggest: true});
        this.newSearchTerm = this.refs[this.props.inputRef].getValue();
        console.log("this.newSearchTerm is === " + this.newSearchTerm);
    },

    handleAutocompleteClick: function(term, id, name) {
        var newTerms = {};
        var inputNode = this.refs[this.props.inputRef];
        inputNode.value = this.newSearchTerm = term;
        newTerms[name] = id;
        this.setState({terms: newTerms});
        this.setState({showAutoSuggest: false});
        //inputNode.focus();
        // Now let the timer update the terms state when it gets around to it.
        console.log("inputNode.value is === " + inputNode.value);
    },

    tick: function() {
        if (this.newSearchTerm !== this.state.searchTerm) {
            this.setState({searchTerm: this.newSearchTerm});
        }
    },

    render: function() {
        var context = this.props.context;
        var id = url.parse(this.context.location_href, true);
        var region = id.query['region'] || '';
        return (
            <div className="autocomplete-searchterm-input">
                <input type="hidden" name="clinicalgenome" value="hgncgene" />
                {Object.keys(this.state.terms).map(function(key) {
                    return <input type="hidden" name={key} value={this.state.terms[key]} key={key} />;
                }, this)}
                <Input
                    type={this.props.inputType}
                    ref={this.props.inputRef}
                    name={this.props.inputName}
                    id={this.props.inputId}
                    inputClassName={this.props.inputClassName}
                    defaultValue={this.props.defaultValue}
                    placeholder={this.props.placeholder}
                    pattern={this.props.validationPattern}
                    handleChange={this.handleChange}
                    label={this.props.inputLabel}
                    labelClassName={this.props.inputLabelClassName}
                    wrapperClassName={this.props.inputWrapperClassName}
                    groupClassName={this.props.inputGroupClassName}
                    error={this.props.inputError}
                    clearError={this.props.inputClearError}
                    required
                    autoComplete={(this.state.showAutoSuggest && this.state.searchTerm) ? <FetchedData loadingComplete={true}><Param name="autocomplete_param" url={'/suggest/?q=' + this.state.searchTerm} /><SuggestionBox name="autocomplete_suggestionbox" userTerm={this.state.searchTerm} handleClick={this.handleAutocompleteClick} /></FetchedData> : null}
                />
            </div>
        );
    }
});

//Autocomplete.propTypes = propTypes;
//Autocomplete.defaultProps = defaultProps;

//export default Autocomplete;
