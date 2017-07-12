"use strict";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';


// Controls a group of Panel components. Useful for accordions.
var PanelGroup = module.exports.PanelGroup = createReactClass({
    propTypes: {
        accordion: PropTypes.bool // T if child panels should accordion
    },

    render: function() {
        // If accordion panel group, add accordion property to child Panels
        var children = React.Children.map(this.props.children, child => {
            if (child.type === Panel) {
                // Adding properties to children means cloning them, so...
                var clone = React.cloneElement(child, {accordion: true});
                return clone;
            }
            return child;
        });

        return (
            <div className="panel-group">
                {children}
            </div>
        );
    }
});

// Displays one panel. It can be a child of a PanelGroup if you're doing accordions.
var Panel = module.exports.Panel = createReactClass({
    propTypes: {
        title: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ]), // Title for panel header
        open: PropTypes.bool, // T if an accordion panel should default to open
        accordion: PropTypes.bool, // T if part of an accordion panel group; copied from PanelGroup props
        panelClassName: PropTypes.string, // Classes to add to panel
        panelBodyClassName: PropTypes.string // Classes to add to panel body
    },

    getInitialState: function() {
        return {
            open: !!this.props.open || !this.props.accordion
        };
    },

    handleClick: function(e) {
        e.preventDefault(); // Prevent auto-scroll to top on state change
        if (this.props.accordion) {
            this.setState({open: !this.state.open});
        }
    },

    render: function() {
        var panelWrapperClasses = 'panel panel-default' + (this.props.panelClassName ? ' ' + this.props.panelClassName : '');
        var panelClasses = 'panel-body' + ((!this.state.open && this.props.accordion) ? ' panel-closed' : '') + (this.props.panelBodyClassName ? ' ' + this.props.panelBodyClassName : ' panel-std panel-bg-std');
        var indicatorClasses = 'icon panel-header-indicator ' + (this.props.accordion ? (this.state.open ? 'icon-chevron-up' : 'icon-chevron-down') : '');
        var children = (this.props.children instanceof Array && this.props.children.length === 0) ? null : this.props.children;
        var title;

        if (this.props.accordion) {
            title = <a href="#" onClick={this.handleClick}>{this.props.title}</a>;
        } else {
            if (typeof this.props.title === 'string') {
                title = <span className="panel-title-std">{this.props.title}</span>;
            } else {
                title = <span>{this.props.title}</span>;
            }
        }

        return (
            <div className={panelWrapperClasses}>
                {this.props.title ?
                    <div className="panel-heading" role="tab">
                        {this.props.accordion ? <i className={indicatorClasses}></i> : null}
                        {typeof this.props.title === 'string' ? <h4>{title}</h4> : <span>{title}</span>}
                    </div>
                : null}
                {children ?
                    <div className={panelClasses}>
                        {children}
                    </div>
                : null}
            </div>
        );
    }
});
