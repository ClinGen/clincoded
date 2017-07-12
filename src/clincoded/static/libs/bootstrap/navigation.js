'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

// Include this mixin for any components that contain navigation that needs to collapse on mobile
var NavbarMixin = module.exports.NavbarMixin = {
    childContextTypes: {
        mobileMenuOpen: PropTypes.bool, // T if mobile menu is open, F if closed
        mobileMenuToggle: PropTypes.func // Function to set current mobile menu state
    },

    // Retrieve current React context
    getChildContext: function() {
        return {
            mobileMenuOpen: this.state.mobileMenuOpen,
            mobileMenuToggle: this.mobileMenuToggle
        };
    },

    getInitialState: function() {
        return {mobileMenuOpen: false};
    },

    // React to click in audit indicator. Set state to clicked indicator's error level
    mobileMenuToggle: function(e) {
        e.preventDefault();
        this.setState({mobileMenuOpen: !this.state.mobileMenuOpen});
    }
};


// Top-level navigation component. Use it to wrap <Nav> components
var Navbar = module.exports.Navbar = createReactClass({
    contextTypes: {
        mobileMenuToggle: PropTypes.func
    },

    propTypes: {
        styles: PropTypes.string, // CSS classes to add to <nav> element
        brandStyles: PropTypes.string, // CSS classes to add to .navbar-brand element
        brand: PropTypes.string // Text brand in .navbar-brand element
    },

    render: function() {
        var navbarStyles = 'navbar navbar-default' + (this.props.styles ? ' ' + this.props.styles : '');
        var brandStyles = 'navbar-brand' + (this.props.brandStyles ? ' ' + this.props.brandStyles : '');
        var brand = this.props.brand;

        return (
            <nav className={navbarStyles}>
                <div className="container-fluid">
                    <div className="navbar-header">
                        <button type="button" className="navbar-toggle" onClick={this.context.mobileMenuToggle}>
                            <span className="sr-only">Toggle navigation</span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                        </button>
                        {brand ? <a className={brandStyles} aria-role="banner" href="/">{brand}</a> : null}
                    </div>
                    {this.props.children}
                </div>
            </nav>
        );
    }
});


// Second-level navigation component. Use it to wrap <NavItem> components.
var Nav = module.exports.Nav = createReactClass({
    contextTypes: {
        mobileMenuOpen: PropTypes.bool
    },

    propTypes: {
        styles: PropTypes.string, // CSS classes to add to ul.'nav navbar-nav'
        navbarStyles: PropTypes.string, // CSS classes for wrapper <div>
        collapse: PropTypes.bool // Support mobile menu collapsing
    },

    render: function() {
        var styles = 'nav navbar-nav' + (this.props.styles ? ' ' + this.props.styles : '');
        var navbarStyles = this.props.navbarStyles ? this.props.navbarStyles : '';
        var collapseStyles = this.props.collapse ? ('navbar-collapse' + (this.context.mobileMenuOpen ? '' : ' collapse')) : '';
        var wrapperClasses = navbarStyles + collapseStyles;

        return (
            <div className={wrapperClasses}>
                <ul className={styles}>
                    {this.props.children}
                </ul>
            </div>
        );
    }
});


// Individual menu items within a <Nav> component.
var NavItem = module.exports.NavItem = createReactClass({
    propTypes: {
        title: PropTypes.string,
        styles: PropTypes.string, // CSS classes to add to <li> elements
        href: PropTypes.string, // URL to link this item to
        icon: PropTypes.string, // CSS class for fontawesome icon (e.g. 'icon-home')
        target: PropTypes.string // target attribute
        // Additional properties (data attributes) set on <a> for the item
    },

    getInitialState() {
        return {
            dropdownActive: false
        };
    },

    componentDidMount() {
        window.addEventListener('mouseup', this.toggleDropdown, false);
    },

    componentWillUnmount() {
        window.removeEventListener('mouseup', this.toggleDropdown, false);
    },

    // Help dropdown menu UI behaviors
    toggleDropdown(e) {
        e.preventDefault(); e.stopPropagation();
        let targetBtn = this.refs.btn_item_help,
            targetBtnTitle = this.refs.btn_item_help_title,
            targetBtnIcon = this.refs.btn_item_help_icon;
        if (e.target === targetBtn || e.target === targetBtnTitle || e.target === targetBtnIcon) {
            this.setState({dropdownActive: !this.state.dropdownActive});
        } else if (e.target === this.refs.menu_item_gene_curation) {
            this.setState({dropdownActive: false});
            window.open('/static/help/clingen-gene-curation-help.pdf');
        } else if (e.target === this.refs.menu_item_variant_curation) {
            this.setState({dropdownActive: false});
            window.open('/static/help/clingen-variant-curation-help.pdf');
        } else if (e.target === this.refs.menu_item_contact_helpdesk) {
            this.setState({dropdownActive: false});
            location.href = 'mailto:clingen-helpdesk@lists.stanford.edu';
        } else {
            this.setState({dropdownActive: false});
        }
    },

    // Render standard link buttons or dropdown menu button if title === 'Help'
    renderButton(title, url, iconClass, contentClass) {
        if (title === 'space') {
            return (
                <span>&nbsp;</span>
            );
        } else if (title === 'Help') {
            return (
                <div className="dropdown help-doc">
                    <a href={url} className="dropdown-toggle" ref="btn_item_help">
                        <span className={contentClass} ref="btn_item_help_title">{this.props.children}</span>
                        <span className="caret" ref="btn_item_help_icon"></span>
                    </a>
                    {this.state.dropdownActive ?
                        <ul className="dropdown-menu">
                            <li><a href="#" ref="menu_item_gene_curation">Gene Curation</a></li>
                            <li><a href="#" ref="menu_item_variant_curation">Variant Curation</a></li>
                            <li><a href="#" ref="menu_item_contact_helpdesk">Contact Helpdesk</a></li>
                        </ul>
                    : null}
                </div>
            );
        } else {
            return (
                <a {...this.props} href={url} className={iconClass}>
                    <span className={contentClass}>{this.props.children}</span>
                </a>
            );
        }
    },

    render: function() {
        var url = this.props.href ? this.props.href : '#';
        var iconClass = this.props.icon ? this.props.icon + ' icon icon-alt' : '';
        var contentClass = iconClass ? 'sr-only' : '';
        var title = this.props.title;

        return (
            <li className={title === 'space' ? 'white-space' : 'link'}>
                {this.renderButton(title, url, iconClass, contentClass)}
            </li>
        );
    }
});
