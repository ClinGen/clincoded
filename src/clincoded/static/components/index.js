'use strict';

// Require all components to ensure javascript load ordering
require('./app');
require('./image');
require('./collection');
require('./dbxref');
require('./errors');
require('./gene');
require('./footer');
require('./globals');
require('./graph');
require('./home');
require('./item');
require('./page');
require('./mixins');
require('./navbar');
require('./statuslabel');
require('./search');
require('./publication');
require('./testing');
require('./edit');
require('./inputs');
require('./blocks');

module.exports = require('./app');
