'use strict';

// Require all components to ensure javascript load ordering
require('./app');
require('./image');
require('./collection');
require('./dbxref');
require('./errors');
require('./footer');
require('./globals');
require('./home');
require('./item');
require('./page');
require('./mixins');
require('./statuslabel');
require('./search');
require('./publication');
require('./curator');
require('./curation_central');
require('./create_gene_disease');
require('./dashboard');
require('./group_curation');
require('./group_submit');
require('./family_curation');
require('./family_submit');
require('./individual_curation');
require('./individual_submit');
require('./experimental_curation');
require('./experimental_submit');
require('./variant_curation');
require('./testing');
require('./edit');
require('./inputs');
require('./provisional_curation');
require('./add_curator');

module.exports = require('./app');
