'use strict';
var React = require('react');
var globals = require('./globals');
var url = require('url');

var SignIn = module.exports.SignIn = React.createClass({
    render: function() {
        var hidden = !this.props.session || this.props.session['auth.userid'];
        var disabled = !this.props.loadingComplete;
        return (
            <div id="signin-box" className="col-sm-3" hidden={hidden}>
                <h4>Data Providers</h4>
                <a href="" disabled={disabled} data-trigger="login" className="signin-button btn btn-large btn-success">Sign In</a>
                <p>No access? <a href='mailto:clingen-helpdesk@lists.stanford.edu'>Request an account</a>.</p>
                <p>Authentication by <a href="http://www.mozilla.org/en-US/persona/" target="_blank">Mozilla Persona</a>.</p>
            </div>
        );
    }
});

var Home = module.exports.Home = React.createClass({
    getInitialState: function() {
        var demoWarning = false;
        var productionWarning = false;
        if (/production.clinicalgenome.org/.test(url.parse(this.props.href).hostname)) {
            // check if production URL. Enable productionWarning if it is.
            productionWarning = true;
        } else if (!/^(www\.)?curation.clinicalgenome.org/.test(url.parse(this.props.href).hostname)) {
            // if neither production nor curation URL, enable demoWarning.
            demoWarning = true;
        }
        return {
            demoWarning: demoWarning,
            productionWarning: productionWarning
        };
    },

    render: function() {
        if (this.props.session['auth.userid'] !== undefined) {
            window.location.href = '/dashboard/';
        }
        return (
            <div className="container">
                <div className="homepage-main-box panel-gray">
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="project-info site-title">
                                <h1>ClinGen Curator Interfaces</h1>
                                <h4>Variant Curation &#8226; Gene Curation</h4>
                                <p className="lead">Access to these interfaces is currently restricted to ClinGen curators. If you are a ClinGen curator, you may request an account at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</p>
                                <p className="lead">ClinGen is a National Institutes of Health (NIH)-funded resource dedicated to building an authoritative central resource that defines the clinical relevance of genes and variants for use in precision medicine and research. One of the key goals of ClinGen is to implement an evidence-based consensus for curating genes and variants. For more information on the ClinGen resource, please visit the ClinGen portal at <a href="https://www.clinicalgenome.org" target="_blank">clinicalgenome.org <i className="icon icon-external-link"></i></a>.</p>
                            </div>
                        </div>
                    </div>
                    <div className="row demo-access-note">
                        {this.state.demoWarning ?
                            <div>We are happy to announce you will be able to explore this text/demo version of the ClinGen interfaces within a few weeks. Please visit us again then for for more information (posted 10/19/2016).</div>
                            :
                            <div>We are happy to announce you will be able to explore a test/demo version of the ClinGen interfaces within a few weeks. Please visit us again then for more information (posted 10/19/2016).</div>
                        }
                    </div>
                    <div className="row">
                        <div className="col-sm-6">
                            <div className="promo">
                                <h2>Variant Curation</h2>
                                <h3>Which changes in the gene cause disease?</h3>
                                <p>
                                    The ClinGen variant curation process combines clinical, genetic, population, and functional evidence with expert review to classify variants into 1 of 5 categories according to the <a href="https://www.acmg.net/docs/standards_guidelines_for_the_interpretation_of_sequence_variants.pdf" target="_blank">ACMG guidelines <i className="icon icon-file-pdf-o"></i></a>.
                                </p>
                                <p><strong>Pathogenic &#8226; Likely Pathogenic &#8226; Uncertain &#8226; Likely Benign &#8226; Benign</strong></p>
                                <p className="help-document">
                                    <a className="btn btn-primary" href="/static/help/clingen-variant-curation-help.pdf" target="_blank" role="button">Learn more »</a>
                                </p>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="promo">
                                <h2>Gene Curation</h2>
                                <h3>Does variation in this gene cause disease?</h3>
                                <p>
                                    The ClinGen gene curation process combines an appraisal of genetic and experimental data in the scientific literature with expert review to classify gene-disease pairs into 1 of 6 categories according to ClinGen's <a href="https://www.clinicalgenome.org/site/assets/files/2657/current_clinical_validity_classifications.pdf" target="_blank">Gene-Disease Clinical Validity Classification <i className="icon icon-file-pdf-o"></i></a> framework.
                                </p>
                                <p><strong>Definitive &#8226; Strong &#8226; Moderate &#8226; Limited &#8226; Disputed &#8226; Refuted</strong></p>
                            </div>
                        </div>
                    </div>
                    <hr/>
                    <footer>
                        <p>&copy; 2016 <a href="https://www.clinicalgenome.org" target="_blank">ClinGen</a> - All rights reserved</p>
                    </footer>
                </div>
            </div>
        );
    }
});


globals.content_views.register(Home, 'portal');
