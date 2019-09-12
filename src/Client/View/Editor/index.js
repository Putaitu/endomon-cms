'use strict';

/**
 * @namespace HashBrown.Client.View.Editor
 */
namespace('View.Editor')
.add(require('./Editor'))
.add(require('./ResourceEditor'))
.add(require('./ConnectionEditor'))
.add(require('./ContentEditor'))
.add(require('./FormEditor'))
.add(require('./JSONEditor'))
.add(require('./MediaViewer'))
.add(require('./UserEditor'))
.add(require('./SchemaEditor'))
.add(require('./ContentSchemaEditor'))
.add(require('./FieldSchemaEditor'))
.add(require('./WYSIWYGEditor'))

require('./DeployerEditor')
require('./FieldEditor')
require('./ProcessorEditor')