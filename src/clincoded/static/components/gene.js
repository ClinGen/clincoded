'use strict';
import React, { Component } from 'react';
import _ from 'underscore';
import { content_views, itemClass, dbxref_prefix_map } from './globals';
import { DbxrefList, Dbxref } from './dbxref';

export class Gene extends Component {
    render() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'view-detail panel key-value');
        var geneLink, geneRef, baseName, sep;

        if (context.organism.name == "human") {
            geneLink = dbxref_prefix_map.HGNC + context.gene_name;
        } else if (context.organism.name == "mouse") {
            var uniProtValue = JSON.stringify(context.dbxref);
            sep = uniProtValue.indexOf(":") + 1;
            var uniProtID = uniProtValue.substring(sep, uniProtValue.length - 2);
            geneLink = dbxref_prefix_map.UniProtKB + uniProtID;
        } else if (context.organism.name == 'dmelanogaster' || context.organism.name == 'celegans') {
            var organismPrefix = context.organism.name == 'dmelanogaster' ? 'FBgn': 'WBGene';
            var baseUrl = context.organism.name == 'dmelanogaster' ? dbxref_prefix_map.FlyBase : dbxref_prefix_map.WormBase;
            geneRef = _.find(context.dbxref, function(ref) {
                return ref.indexOf(organismPrefix) != -1;
            });
            if (geneRef) {
                sep = geneRef.indexOf(":") + 1;
                baseName = geneRef.substring(sep, geneRef.length);
                geneLink = baseUrl + baseName;
            }
        }
        return (
            <div className={itemClass(context, 'view-item')}>
                <header className="row">
                    <div className="col-sm-12">
                        <h2>{context.label} (<em>{context.organism.scientific_name}</em>)</h2>
                    </div>
                </header>

                <dl className={itemClass}>
                    <dt>Gene name</dt>
                    <dd>{context.label}</dd>

                    {context.gene_name && geneLink ? <dt>Gene</dt> : null}
                    {context.gene_name && geneLink ? <dd><a href={geneLink}>{context.gene_name}</a></dd> : null}

                    <dt>External resources</dt>
                    <dd>
                        {context.dbxref.length ?
                            <DbxrefList values={context.dbxref} gene_gene={context.gene_name} />
                        : <em>None submitted</em> }
                    </dd>
                </dl>
            </div>
        );
    }
}

content_views.register(Gene, 'gene');
