'use strict';
var React = require('react');

var NavbarMixin = module.exports.NavbarMixin = {
    childContextTypes: {
        mobileMenuOpen: React.PropTypes.bool, // T if mobile menu is open, F if closed
        mobileMenuToggle: React.PropTypes.func // Function to set current mobile menu state
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
var Navbar = module.exports.Navbar = React.createClass({
    contextTypes: {
        mobileMenuToggle: React.PropTypes.func
    },

    propTypes: {
        styles: React.PropTypes.string, // Styles to add to <nav> element
        brandStyles: React.PropTypes.string, // Styles to add to .navbar-brand element
        brand: React.PropTypes.string // Text brand in .navbar-brand element
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
var Nav = module.exports.Nav = React.createClass({
    contextTypes: {
        mobileMenuOpen: React.PropTypes.bool
    },

    propTypes: {
        styles: React.PropTypes.string // Styles to add to ul.'nav navbar-nav'
    },

    render: function() {
        var navStyles = 'nav navbar-nav' + (this.props.styles ? ' ' + this.props.styles : '');
        var collapseClasses = 'navbar-collapse' + (this.context.mobileMenuOpen ? '' : ' collapse');

        return (
            <div className={collapseClasses}>
                <ul className={navStyles}>
                    {this.props.children}
                </ul>
            </div>
        );
    }
});


// Individual menu items within a <Nav> component.
var NavItem = module.exports.NavItem = React.createClass({
    propTypes: {
        href: React.PropTypes.string, // URL to link this item to
        eventKey: React.PropTypes.oneOfType([ // Unique key for React ID; can be anything unique within <Nav>
            React.PropTypes.string,
            React.PropTypes.number
        ])
    },

    render: function() {
        return (
            <li key={this.props.eventKey}>
                <a href={this.props.href}>{this.props.children}</a>
            </li>
        );
    }
});
