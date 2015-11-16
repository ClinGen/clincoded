'use strict';
var React = require('react');
var moment = require('moment');
var globals = require('./globals');


// The curator history records operations performed by the currently logged-in curator on the database.
// It comprises an operation type, and operation-specific metadata. This only operates as a mixin, so
// these methods become part of the React component that includes it.

module.exports = {
    // Record an operation on the ClinGen database performed by the curator. A promise gets returned,
    // though likely it gets ignored because operations relying on this returning seem unusual.
    //   operationType: Type of operation: 'add', 'modify', 'delete'
    //   primary: Primary object of operation, e.g. group, family, etc.
    //   meta: Metadata that varies depending on the type of the primary object. See curatorHistory.json.
    recordHistory: function(operationType, primary, meta) {
        // Put the history object together
        var historyItem = {
            operationType: operationType,
            primary: primary['@id'],
        };
        if (meta) {
            historyItem.meta = meta;
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
    getHistories: function(limit) {
        var historyUri = '/histories/' + (limit ? '?limit=' + limit : '');
        return this.getRestData('/histories').then(data => {
            return data['@graph'];
        });
    },

    // Get the history component to display the object that the given history item describes. The actual component varies
    // depending on the type of the primary object of the history item, and other code registers components to display
    // specific kinds of history items.
    // 
    // If you have an individual history item returned from the getHistories() array, you can display the history item with:
    //   var HistoryView = this.getHistoryView(history);
    //   <HistoryView history={history} />
    getHistoryView: function(history) {
        return globals.history_views.lookup(history.primary, history.operationType);
    }
};
