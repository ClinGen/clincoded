'use strict';
var React = require('react');
var globals = require('../globals');
var modal = require('../../libs/bootstrap/modal');

var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordVariant = module.exports.CurationRecordVariant = React.createClass({
    mixins: [ModalMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationTranscript: React.PropTypes.string,
        updateInterpretationTranscript: React.PropTypes.func
    },

    render: function() {
        var variant = this.props.data;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            var caId = (variant.canonicalAlleleId) ? variant.canonicalAlleleId : 'Unknown';
            var dbSNPId = (variant.dbSNPId) ? variant.dbSNPId : 'Unknown';
        }
        var addEdit = this.props.interpretationTranscript ? 'Edit' : 'Add';

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    {variant ?
                        <dl className="inline-dl clearfix">
                            <dt>ClinVar VariationID: </dt><dd><a href={external_url_map['ClinVar'] + clinVarId} target="_blank" title={'ClinVar page for ' + clinVarId + ' in a new window'}>{clinVarId}</a></dd>
                            <dt>Canonical Allele ID: </dt><dd>{caId}</dd>
                            <dt>dbSNP ID: </dt><dd><a href={external_url_map['dbSNP'] + dbSNPId.slice(2)} target="_blank" title={'dbSNP page for ' + dbSNPId + ' in a new window'}>{dbSNPId}</a></dd>
                            <dt>Primary RefSeq Transcript: </dt><dd>Unknown</dd>
                            <dt>Primary Ensembl Transcript: </dt><dd>Unknown</dd>
                            <dt>Interpretation Transcript: </dt><dd>[<a href="#">Add</a>]</dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
