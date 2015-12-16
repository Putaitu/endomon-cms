class Editor extends View {
    constructor(args) {
        super(args);

        // Register events
        this.on('clickPublish', this.onClickPublish);
        this.on('clickSave', this.onClickSave);

        this.initFieldEditors();

        this.$element = _.div({class: 'panel panel-default editor'}, [
            _.div({class: 'panel-heading'}, [
                _.div({class: 'btn-group content-actions'}, [
                    _.button({class: 'btn btn-success btn-publish'}, [
                        'Save ',
                        _.span({class: 'glyphicon glyphicon-floppy-disk'})
                    ]).click(this.events.clickSave),
                    _.button({class: 'btn btn-success btn-publish'}, [
                        'Publish ',
                        _.span({class: 'glyphicon glyphicon-upload'})
                    ]).click(this.events.clickPublish),
                ]),
                _.h4({class: 'panel-title'},
                    '&nbsp;'
                )
            ]),
            _.div({class: 'panel-body'})
        ]);
    }

    /**
     * Events
     */
    onClickPublish(e, element, view) {
        api.content.publish(view.model, view.path, function() {
            console.log('done!');
        }); 
    }
    
    onClickSave(e, element, view) {
        api.content.save(view.model, view.path, function() {
            console.log('done!');
        }); 
    }

    /**
     * Actions
     */
    initFieldEditors() {
        this.fieldEditors = {
            'text': require('./field-editors/text'),
            'text-html': require('./field-editors/text-html'),
            'checkbox': require('./field-editors/checkbox'),
            'template-picker': require('./field-editors/template-picker')
        };
    }

    clear() {
        this.$element.children('panel-body').html(
            _.div({class: 'spinner-container'},
                _.div({class: 'spinner'})
            )
        );
    }

    openAsync(path) {
        let view = this;

        view.clear();
       
        view.path = '/_pages/' + path;

        ViewHelper.get('Tree').ready(function(view) {
            view.highlight('_pages/' + path);
        });
        
        api.file.fetch(view.path, function(content) {
            view.open(JSON.parse(content), true);
        });
    }
    
    open(content, skipHighlight) {
        let view = this;

        view.model = content;

        view.render();

        // Highlight file in tree if not skipped
        if(!skipHighlight) {
            ViewHelper.get('Tree').ready(function(view) {
                view.highlight(view.model.path);
            });
        }
    }

    getFieldEditor(editorName, alias, fieldModel, isArray) {
        let FieldEditor = this.fieldEditors[editorName];

        if(FieldEditor) {
            let fieldEditorInstance = new FieldEditor({ model: fieldModel });

            return fieldEditorInstance;
        }
    }

    render() {
        let view = this;

        api.structs.fields.fetch(function(fieldStructs) {
            api.structs.pages.fetch(view.model.struct || 'page', function(pageStruct) {
                view.$element.children('.panel-heading').children('.panel-title').html(view.model.title.value);
                view.$element.children('.panel-body').empty();

                let populated = {};

                // TODO: Populate page struct with content
                populated = view.model;

                view.model = populated;

                for(let alias in view.model) {
                    let fieldModel = view.model[alias];
                    let fieldStruct = fieldStructs[fieldModel.struct];

                    if(fieldStruct) {
                        let fieldEditorView = view.getFieldEditor(fieldStruct.editor, alias, fieldModel);

                        if(fieldEditorView) {
                            view.$element.children('.panel-body').append(
                                _.div({class: 'input-group field-editor-container'}, [
                                    _.span({class: 'field-editor-label input-group-addon'},
                                        fieldModel.label
                                    ),
                                    fieldEditorView.$element
                                ])
                            );
                        
                        } else {
                            console.log('No field editor with name "' + fieldStruct.editor + '" was found');
                        
                        }

                    } else {
                        console.log('No field struct with name "' + fieldModel.struct + '" was found');
                    }
                }
            });
        });
    }
}

module.exports = Editor;
