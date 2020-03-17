import React, { Component } from 'react';
import moment from 'moment';
import { curator_page } from './globals';

const TermsOfUse = () => (
    <div className="container">
        <div className="terms-of-use-box panel-gray">
            <div className="row">
                <div className="col-sm-12">
                    <div className="terms-info">
                        <h2>Terms of Use, User Agreement</h2>
                        <p className="lead">Upon registration as a user of the ClinGen Variant Curation Interface (VCI), I acknowledge and agree to the following terms:</p>
                        <ol>
                            <li className="lead">Any data entered into the VCI may be made publicly accessible, either through the VCI directly or by subsequent transfer to other public resources (ClinVar, ClinGen Evidence Repository, etc.);</li>
                            <li className="lead">All unpublished patient-specific data entered into the VCI, which is not explicitly consented for public sharing, should be the <span className="underline">minimum necessary</span> to inform the clinical significance of genetic variants;</li>
                            <li className="lead">Data entered into the VCI should not include <a href="https://www.hipaajournal.com/considered-phi-hipaa/" target="_blank" rel="noopener noreferrer">protected health information (PHI)</a> or equivalent identifiable information as defined by regulations in your country or region;</li>
                            <li className="lead">Data accessed through the VCI should not be used in a manner that is likely to compromise the privacy of individuals. Users agree that they will not attempt in any way to identify or re-identify data subjects;</li>
                            <li className="lead">Users understand that they may be personally identified on the basis of information provided during registration, including (but not limited to) names, email addresses, professional affiliations, and curation activities in the VCI.</li>
                        </ol>
                        <p className="lead">
                            For information about the publication of data in the ClinGen curation ecosystem, data sharing, and informed consent in clinical genomics in the United States,
                            please consult the ClinGen Terms of Use (<a href="https://www.clinicalgenome.org/docs/terms-of-use/" target="_blank" rel="noopener noreferrer">https://www.clinicalgenome.org/docs/terms-of-use/</a>),
                            ClinGen Broad Data Sharing Consent Resources (<a href="https://www.clinicalgenome.org/tools/consent-resources/" target="_blank" rel="noopener noreferrer">https://www.clinicalgenome.org/tools/consent-resources/</a>), 
                            the NHGRI Policy on informed consent (<a href="https://www.genome.gov/about-genomics/policy-issues/informed-consent" target="_blank" rel="noopener noreferrer">https://www.genome.gov/about-genomics/policy-issues/informed-consent</a>)
                            and this &quot;Points to Consider&quot; regarding data sharing in public databases: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5793773"target="_blank" rel="noopener noreferrer">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5793773</a>
                        </p>
                    </div>
                </div>
            </div>
            <footer>
                <p>&copy; {moment().format("YYYY")} <a href="https://www.clinicalgenome.org" target="_blank" rel="noopener noreferrer">ClinGen</a> - All rights reserved</p>
            </footer>
        </div>
    </div>
);

curator_page.register(TermsOfUse, 'curator_page', 'terms-of-use');
