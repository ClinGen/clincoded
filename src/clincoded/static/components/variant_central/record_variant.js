'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { external_url_map } from '../globals';

// Display the curator data of the curation data
var CurationRecordVariant = module.exports.CurationRecordVariant = createReactClass({
    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretationTranscript: PropTypes.string,
        updateInterpretationTranscript: PropTypes.func
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant ID Sources'
        };
    },

    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : null;
            var carId = (variant.carId) ? variant.carId : null;
            var dbSNPId = (variant.dbSNPIds.length) ? variant.dbSNPIds[0] : null;
            if (dbSNPId && dbSNPId.indexOf('rs') == -1) {
                dbSNPId = 'rs' + dbSNPId;
            }
        }
        var addEdit = this.props.interpretationTranscript ? 'Edit' : 'Add';

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    <h4>{recordHeader}</h4>
                    {clinVarId || carId ?
                        <dl className="inline-dl clearfix">
                            {clinVarId ?
                                <dd>ClinVar VariationID:&nbsp;<a href={external_url_map['ClinVarSearch'] + clinVarId} target="_blank" title={'ClinVar page for ' + clinVarId + ' in a new window'}>{clinVarId}</a></dd>
                                :
                                null
                            }
                            {carId ?
                                <dd>ClinGen Allele Registry ID:&nbsp;<a href={'http://reg.genome.network/allele/' + carId + '.html'} target="_blank" title={'GlinGen Allele Registry page for ' + carId + ' in a new window'}>{carId}</a></dd>
                                :
                                null
                            }
                            {dbSNPId ?
                                <dd>dbSNP ID:&nbsp;<a href={'https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=' + dbSNPId.replace('rs', '')} target="_blank" title={'dbSNP page for ' + dbSNPId + ' in a new window'}>{dbSNPId}</a></dd>
                                :
                                null
                            }
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
