'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');

// Display the curator data of the curation data
var CurationRecordCurator = module.exports.CurationRecordCurator = React.createClass({
    propTypes: {
        data: React.PropTypes.object // ClinVar data payload
    },

    render: function() {
        var variant = this.props.data;
        if (variant) {
            var status = (variant.status) ? variant.status : 'Unknown';
            var creator = (variant.submitted_by.title) ? variant.submitted_by.title : 'Unknown';
            var last_edited = (variant.last_modified) ? variant.last_modified : 'Unknown';
            if (variant.annotations) {
                var annotationOwners = getAnnotationOwners(variant);
                //var latestAnnotation = gdm && findLatestAnnotation(gdm);
            }
        }

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {variant ?
                        <dl className="inline-dl clearfix">
                            <dt>Status: </dt><dd>{status}</dd>
                            <dt>Creator: </dt><dd>{creator}</dd>
                            <dt>Last edited: </dt><dd>{moment(last_edited).format('YYYY MMM DD, h:mm a')}</dd>
                            {annotationOwners && annotationOwners.length ?
                                <div>
                                    <dt>Other interpretations: </dt>
                                    <dd>
                                        {annotationOwners.map(function(owner, i) {
                                            return (
                                                <span key={i}>
                                                    {i > 0 ? ', ' : ''}
                                                    <a href={'mailto:' + owner.email}>{owner.title}</a>
                                                </span>
                                            );
                                        })}
                                    </dd>
                                </div>
                            : null}
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});

// Get a de-duped array of annotation submitted_by objects sorted by last name from the given GDM.
var getAnnotationOwners = function(data) {
    var owners = data && data.annotations.map(function(annotation) {
        return annotation.submitted_by;
    });
    var annotationOwners = _.chain(owners).uniq(function(owner) {
        return owner.uuid;
    }).sortBy('last_name').value();
    return annotationOwners;
};

// Return the latest annotation in the given GDM. This is the internal version; use the memoized version externally.
var findLatestAnnotation = module.exports.findLatestAnnotation = function(gdm) {
    var annotations = gdm && gdm.annotations;
    var latestAnnotation = null;
    var latestTime = 0;
    if (annotations && annotations.length) {
        annotations.forEach(function(annotation) {
            // Get Unix timestamp version of annotation's time and compare against the saved version.
            var time = moment(annotation.date_created).format('x');
            if (latestTime < time) {
                latestAnnotation = annotation;
                latestTime = time;
            }
        });
    }
    return latestAnnotation;
};