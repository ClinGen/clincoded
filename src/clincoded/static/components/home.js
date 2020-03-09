'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import url from 'url';
import { content_views } from './globals';

export class SignIn extends Component {
    render() {
        var hidden = !this.props.session || this.props.session['auth.userid'];
        var disabled = !this.props.loadingComplete;
        return (
            <div id="signin-box" className="col-sm-3" hidden={hidden}>
                <h4>Data Providers</h4>
                <a href="" disabled={disabled} data-trigger="login" className="signin-button btn btn-large btn-success">Sign In</a>
                <p>No access? <a href='mailto:clingen-helpdesk@lists.stanford.edu'>Request an account</a>.</p>
                <p>Authentication by <a href="https://accounts.google.com/" target="_blank" rel="noopener noreferrer">Google</a> via <a href="https://auth0.com/" target="_blank" rel="noopener noreferrer">Auth0</a>.</p>
            </div>
        );
    }
}

var Home = module.exports.Home = createReactClass({
    propTypes: {
        demoVersion: PropTypes.bool
    },

    getInitialState: function() {
        return {
            demoVersion: this.props.demoVersion
        };
    },

    render: function() {
        if (this.props.session && this.props.session['auth.userid'] !== undefined) {
            window.location.href = '/dashboard/';
        }
        return (
            <div className="container">
                <div className="homepage-main-box panel-gray">
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="project-info site-title">
                                <h1>ClinGen Curation Interfaces</h1>
                                <h4>Variant Curation &#8226; Gene Curation</h4>
                                <p className="lead">ClinGen is a National Institutes of Health (NIH)-funded resource dedicated to building an authoritative central resource that defines the clinical relevance of genes and variants for use in precision medicine and research. One of the key goals of ClinGen is to implement an evidence-based consensus for curating genes and variants. For more information on the ClinGen and how to get involved, please visit the ClinGen portal at <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">clinicalgenome.org</a></p>
                                <p className="lead">
                                    ClinGen&apos;s <strong>Variant Curation Interface</strong> and <strong>Gene Curation Interface</strong> support the curation process.
                                    To view approved ClinGen Expert Panel variant and gene curations, please go to <a href="clinicalgenome.org" target="_blank" rel="noopener noreferrer">clinicalgenome.org</a>.
                                    To request a <strong>Variant Curation Interface</strong> account, select &quot;Login/Sign Up&quot; from the top of the page and fill out the sign up form.
                                </p>
                                <p className="lead">
                                    By using the interfaces you are agreeing to the <a href="/terms-of-use">Terms of Use</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="row demo-access-note">
                        {this.state.demoVersion ?
                            <div>Explore a demo version of the ClinGen interfaces by clicking on the "Demo Login" button located in the header above.</div>
                            :
                            <div>Explore a demo version of the ClinGen interfaces at <a href="https://curation-test.clinicalgenome.org/" target="_blank" rel="noopener noreferrer">curation-test.clinicalgenome.org</a></div>
                        }
                    </div>
                    <div className="row">
                        <div className="col-sm-6">
                            <div className="promo">
                                <h2>Variant Curation</h2>
                                <h3>Which changes in the gene cause disease?</h3>
                                <p>
                                    The ClinGen variant curation process combines clinical, genetic, population, and functional evidence with expert review to classify variants into 1 of 5 categories according to the <a href="https://www.acmg.net/docs/standards_guidelines_for_the_interpretation_of_sequence_variants.pdf" target="_blank" rel="noopener noreferrer">ACMG guidelines <i className="icon icon-file-pdf-o"></i></a>.
                                </p>
                                <p><strong>Pathogenic &#8226; Likely Pathogenic &#8226; Uncertain &#8226; Likely Benign &#8226; Benign</strong></p>
                                <p className="help-document">
                                    <a className="btn btn-primary" href="https://github.com/ClinGen/clincoded/wiki/VCI-Curation-Help" target="_blank" rel="noopener noreferrer" role="button">Learn more</a>
                                </p>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="promo">
                                <h2>Gene Curation</h2>
                                <h3>Does variation in this gene cause disease?</h3>
                                <p>
                                    The ClinGen gene curation process combines an appraisal of genetic and experimental data in the scientific literature with expert review to classify gene-disease pairs into 1 of 6 categories according to ClinGen's <a href="https://www.clinicalgenome.org/site/assets/files/2657/current_clinical_validity_classifications.pdf" target="_blank" rel="noopener noreferrer">Gene-Disease Clinical Validity Classification <i className="icon icon-file-pdf-o"></i></a> framework.
                                </p>
                                <p><strong>Definitive &#8226; Strong &#8226; Moderate &#8226; Limited &#8226; Disputed &#8226; Refuted</strong></p>
                            </div>
                        </div>
                    </div>
                    <hr/>
                    <footer>
                        <p>&copy; {moment().format("YYYY")} <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">ClinGen</a> - All rights reserved</p>
                    </footer>
                </div>
            </div>
        );
    }
});

content_views.register(Home, 'portal');
