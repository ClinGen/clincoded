# Curator History Module

## Overview

Each operation any module performs can record these operations to the database as history objects: one object per operation. These objects can then be retrieved and displayed in a human-readable form.

## Getting Started

Include the curator_history mixin to add methods that allow your module to add to the curator history database. Only one object gets exported out of curator_history.js, so you don’t need to namespace it.

```
var React = require('React');
var CuratorHistory = require('./curator_history');
var OtherMixin = require('./other_mixin');

var ClinGenModule = React.createClass({
    mixins: [OtherMixin, CuratorHistory],

    render: function() {
        return <span>ClinGen</span>;
    }
});
```

Including this mixin adds functions to your React object to write history objects to the database.

## Curator History Schema

The curatorHistory object comprises three properties:

* ```operationType```: Describes what kind of operation happened. It has one of three allowed values:
    - ```add```: When an object gets added
    - ```modify```: When an object gets modified
    - ```delete```: When an object gets deleted

* ```primary```: Embedded object whose history this curatorHistory object records. Think of this as the subject of a sentence describing the recorded operation. It embeds any of the following objects. If more objects in the future need to have their operations recorded, just add those objects to this list:
    - ```article```
    - ```assessment```
    - ```experimental```
    - ```family```
    - ```gdm```
    - ```group```
    - ```individual```
    - ```pathogenicity```
    - ```provisionalClassification```
    - ```variant```

* ```meta```: Extra information needed to display the operation that happened to the ```primary``` object. The ```meta``` object contains many objects specific to each ```primary``` object type, so only one of these ```meta``` sub-objects exists depending on the type of *primary*. If more object types get added to ```primary```, the extra information those objects need get added as new objects in ```meta```. Theoretically, some simple history operations might not need a corresponding ```meta``` sub-object.

## Writing a History Object

The vast majority of interaction with the curator_history mixin involves writing to the history after performing an operation.

#### this.recordHistory(operationType, primary, meta)

* Arguments:
    - ```{string} operationType```
    - ```{object} primary```
    - ```{object} meta```

* Returns:
    - ```{object} Promise```

##### Usage

Record an operation to the database as a curator_history object, and return a Javascript Promise. As an example, when you add an article, you would record that fact with:

```
var article = { ... };
var meta = {
    article: {
        gdm: gdm['@id']
    }
};
this.recordHistory('add', article, meta);
```

The ```article``` object just written to the database gets passed in the second parameter. The ```meta``` object must follow the schema’s format for that type of object. In this case, the ```meta``` schema for an article looks like:

```
"meta": {
    "title": "History meta",
    "description": "Type-dependent (@type) data about the history item",
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "article": {
            "title": "PMID added to GDM history",
            "description": "History metadata for adding a PMID to a GDM",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "operation": {
                    "title": "Operation",
                    "description": "Operation specific to this meta type",
                    "type": "string",
                    "default": "add",
                    "enum": [
                        "add"
                    ]
                },
                "gdm": {
                    "title": "GDM",
                    "description": "GDM that's the object of the PMID",
                    "type": "string",
                    "linkTo": "gdm"
                }
            }
        }
    }
}
```

This example uses the ```article``` property of ```meta``` to match the fact that ```primary``` holds an article. Only the ```gdm``` property of the ```article``` sub-object needs specifying for this case.

Notice also the ```operation``` property. Every ```meta``` sub-object has this to handle cases in which the object in ```primary``` can exist for more than one reason. For most ```meta``` sub-objects, ```operation``` has only one possible value along with a default, so most operations can ignore it. But in the case where the primary holds a ```gdm``` object, that can happen for two different cases: creating a GDM, or changing the OMIM ID of a GDM. The ```operation``` property for the ```gdm``` ```meta``` sub-object specifies which operation happened.

## Display Functions

Each module controlling the ```primary``` object has the responsibility to display history items. Each module needs to register for the types of history items to display with the ```history_views``` object exported from globals.js.

#### globals.history_views.register(component, @type, operationType)

* Arguments:
    - ```{object} component```
    - ```{string} @type```
    - ```{string} operationType```

* Returns:
    - nothing

##### Usage

When a history object with a ```primary``` object type matching the ```@type``` parameter needs displaying, and with an operation type matching ```operationType``` (see the ```recordHistory``` specification above)

```

globals.history_views.register(PmidGdmAddHistory, 'article', 'add');

```