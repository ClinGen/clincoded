'use strict';
import React from 'react';
import _ from 'underscore';
import moment from 'moment';
import { history_views } from './globals';


// The curator history records operations performed by the currently logged-in curator on the database.
// It comprises an operation type, and operation-specific metadata. This only operates as a mixin, so
// these methods become part of the React component that includes it.

module.exports = {
    // Record an operation on the ClinGen database performed by the curator. A promise gets returned,
    // though likely it gets ignored because operations relying on this returning seem unusual.
    //   operationType: Type of operation: 'add', 'modify', 'delete'
    //      operationType value with appended '-hide' and/or '-hadChildren' substrings will have the
    //          relevant flags activated in the history item, and the substrings will be removed from
    //          operationType
    //   primary: Primary object of operation, e.g. group, family, etc.
    //   meta: Metadata that varies depending on the type of the primary object. See curatorHistory.json.
    recordHistory: function(operationType, primary, meta, parentInfo) {
        // Put the history object together
        var hiddenIndex = operationType.indexOf('-hide');
        var hadChildrenIndex = operationType.indexOf('-hadChildren');
        operationType = operationType.replace('-hide', '').replace('-hadChildren', '');
        var historyItem = {
            operationType: operationType,
            primary: primary['@id']
        };

        if (hiddenIndex > -1) {
            historyItem.hidden = 1;
        }
        if (hadChildrenIndex > -1) {
            historyItem.hadChildren = 1;
        }
        if (meta) {
            historyItem.meta = meta;
        }
        if (parentInfo) {
            historyItem.parentInfo = parentInfo;
        }

        // Write the history object to the database and return a promise. In most cases probably, the
        // promise gets ignored because of the unlikelyness of anyone relying on the history to finish
        // writing.
        return this.postRestData('/histories/', historyItem);
    },

    // Get a list of history objects from the DB. It returns a promise with the array of history objects sorted by
    // last_modification date. To limit the number of returned history objects, pass the maximum number you want
    // in the 'limit' parameter. The following example retrieves a maximum of five history items and displays them
    // as an array to the console once the histories get retrieved.
    //
    // this.getHistories(5).then(histories => { console.log('Item: %o', histories); });
    getHistories: function(user, limit, showHidden) {
        if (!showHidden) {
            showHidden = 0;
        }
        if (user) {
            return this.getRestData('/histories/?submitted_by.uuid=' + user.uuid + (limit ? '&limit=' + limit : '') + (showHidden == 'all' ? '' : '&hidden=' + showHidden)).then(data => {
                return data['@graph'];
            });
        }
        return Promise.resolve(null);
    },

    // Get the history component to display the object that the given history item describes. The actual component varies
    // depending on the type of the primary object of the history item, and other code registers components to display
    // specific kinds of history items.
    //
    // If you have an individual history item returned from the getHistories() array, you can display the history item with:
    //   var HistoryView = this.getHistoryView(history);
    //   <HistoryView history={history} />
    getHistoryView: function(history) {
        return history_views.lookup(history.primary, history.operationType);
    }
};
