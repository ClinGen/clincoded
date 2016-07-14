'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordGeneDisease = module.exports.CurationRecordGeneDisease = React.createClass({

    propTypes: {
        data: React.PropTypes.object // ClinVar data payload
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant Genomic Context'
        };
    },

    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        var gRCh38 = null;
        var gRCh37 = null;
        var chr = null;
        var ucsc_url_38 = null;
        var ucsc_url_37 = null;
        var viewer_url_38 = null;
        var viewer_url_37 = null;
        var ensembl_url_38 = null;
        var ensembl_url_37 = null;
        if (variant && variant.hgvsNames) {
            // get GRCh38 and GRCh37 NC_ terms from local db
            gRCh38 =  variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.hgvsNames.gRCh38 ? variant.hgvsNames.gRCh38 : null);
            gRCh37 =  variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : (variant.hgvsNames.gRCh37 ? variant.hgvsNames.gRCh37 : null);

            // get Chromosome
            if (gRCh38 || gRCh37) {
                var hgvs_term = gRCh38 ? gRCh38 : gRCh37;
                chr = hgvs_term.substr(7, 2);
                if (chr.indexOf('0') !== -1) {
                    chr = chr.substr(1, 1);
                } else if (chr === '23') {
                    chr = 'x';
                } else if (chr === '24') {
                    chr = 'y';
                }
            }

            // set start and stop points for +/- 60 dp length and generate links
            var start_38 = null;
            var end_38 = null;
            var start_37 = null;
            var end_37 = null;
            var re = /:[g].(\d+)\D/;
            if (gRCh38) {
                var point_38 = gRCh38.match(re)[1];
                start_38 = parseInt(point_38) - 30;
                end_38 = parseInt(point_38) + 30;

                ucsc_url_38 = 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr' + chr + '%3A' + start_38.toString() + '-' + end_38.toString();
                viewer_url_38 = 'https://www.ncbi.nlm.nih.gov/variation/view/?chr=' + chr + '&assm=GCF_000001405.28&from=' + start_38.toString() + '&to=' + end_38.toString();
                ensembl_url_38 = 'http://uswest.ensembl.org/Homo_sapiens/Location/View?db=core;r=' + chr + ':' + start_38.toString() + '-' + end_38.toString();
            }
            if (gRCh37) {
                var point_37 = gRCh37.match(re)[1];
                start_37 = parseInt(point_37) - 30;
                end_37 = parseInt(point_37) + 30;

                ucsc_url_37 = 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr' + chr + '%3A' + start_37.toString() + '-' + end_37.toString();
                viewer_url_37 = 'https://www.ncbi.nlm.nih.gov/variation/view/?chr=' + chr + '&assm=GCF_000001405.25&from=' + start_37.toString() + '&to=' + end_37.toString();
                ensembl_url_37 = 'http://grch37.ensembl.org/Homo_sapiens/Location/View?db=core;r=' + chr + ':' + start_37.toString() + '-' + end_37.toString();
            }
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    <h4>{recordHeader}</h4>
                    {chr ?
                        <dl className="inline-dl clearfix">
                            {(ucsc_url_38 || ucsc_url_37) ?
                                <dd>UCSC [
                                    {ucsc_url_38 ?
                                        <a href={ucsc_url_38} target="_blank" title={'UCSC Genome Browser for ' + gRCh38 + ' in a new window'}>GRCh38/hg38</a>
                                        :
                                        null
                                    }
                                    {(ucsc_url_38 && ucsc_url_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {ucsc_url_37 ?
                                        <a href={ucsc_url_37} target="_blank" title={'UCSC Genome Browser for ' + gRCh37 + ' in a new window'}>GRCh37/hg19</a>
                                        :
                                        null
                                    }
                                    ]
                                </dd>
                                :
                                null
                            }
                            {(viewer_url_38 || viewer_url_37) ?
                                <dd>Variation Viewer [
                                    {viewer_url_38 ? <a href={viewer_url_38} target="_blank" title={'Variation Viewer page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(viewer_url_38 && viewer_url_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {viewer_url_37 ? <a href={viewer_url_37} target="_blank" title={'Variation Viewer page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                null
                            }
                            {ensembl_url_38 || ensembl_url_37 ?
                                <dd>Ensembl Browser [
                                    {ensembl_url_38 ? <a href={ensembl_url_38} target="_blank" title={'Ensembl Browser page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(ensembl_url_38 && ensembl_url_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {ensembl_url_37 ? <a href={ensembl_url_37} target="_blank" title={'Ensembl Browser page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                null
                            }
                        </dl>
                        :
                        null
                    }
                </div>
            </div>
        );
    }
});
