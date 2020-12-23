'use strict';

/**
 * The editor for content resources
 */
class ContentEditor extends HashBrown.Entity.View.ResourceEditor.ResourceEditorBase {
    /**
     * Constructor
     */
    constructor(params) {
        super(params);
        
        HashBrown.Service.EventService.on('locale', 'resourceEditor', (id) => { this.onChangeLocale(); });
        HashBrown.Service.EventService.on('settings', 'resourceEditor', (id) => { this.onChangeContentSettings(id); });

        this.template = require('template/resourceEditor/contentEditor.js');
    }

    /**
     * Fetches the model
     */
    async fetch() {
        await super.fetch();

        if(this.state.name) { return; }
        
        // Set visible save options
        this.state.visibleSaveOptions = {
            isPublished: 'Published'
        };

        // Cache field states
        let fieldStates = {};

        for(let key in this.state.fields || {}) {
            fieldStates[key] = this.state.fields[key].state;
        }

        // Get schema and settings
        this.state.schema = await HashBrown.Entity.Resource.ContentSchema.get(this.model.schemaId, { withParentFields: true });

        // Establish tabs
        this.state.tab = this.state.tab || this.state.schema.defaultTabId || 'meta';
        this.state.tabs = this.state.schema.tabs || {};
        this.state.tabs['meta'] = 'Meta';

        // Construct fields
        this.state.fields = {};

        let contentFields = {};
        let schemaFields = {};
        
        if(this.state.tab === 'meta') {
            contentFields = {
                publishOn: this.model.publishOn,
                unpublishOn: this.model.unpublishOn,
                schemaId: this.model.schemaId
            };

            schemaFields = {
                publishOn: {
                    label: 'Publish on',
                    schemaId: 'date',
                    tabId: 'meta'
                },
                unpublishOn: {
                    label: 'Unpublish on',
                    schemaId: 'date',
                    tabId: 'meta'
                },
                schemaId: {
                    label: 'Schema',
                    schemaId: 'contentSchemaReference',
                    tabId: 'meta',
                    config: {
                        allowedSchemas: 'fromParent'
                    }
                }
            };

        } else {
            contentFields = this.model.getObject().properties || {};

            for(let key in this.state.schema.config) {
                let definition = this.state.schema.config[key];
             
                // Fallback to default tab, if no valid tab id was provided
                if(!definition.tabId || definition.tabId === 'meta') {
                    definition.tabId = 'content';
                }

                if(this.state.tab !== definition.tabId) { continue; }

                schemaFields[key] = this.state.schema.config[key];
            }
        }

        // Instiantiate field views
        for(let key in schemaFields) {
            let field = await HashBrown.Entity.View.Field.FieldBase.createFromFieldDefinition(
                schemaFields[key],
                contentFields[key],
                {},
                this.model.isLocked
            );
            
            if(fieldStates[key]) {
                field.state.isCollapsed = fieldStates[key].isCollapsed === true;
            }
            
            if(this.state.tab === 'meta') {
                field.on('change', (newValue) => {  
                    this.onChangeValue(key, newValue);
                });
            
            } else {
                field.on('change', (newValue) => {  
                    this.model.properties[key] = newValue;
                    this.onChange();
                });
            }

            this.state.fields[key] = field;
        }
    }

    /**
     * Event: Clicked republish all content
     */
    async onClickRepublishAllContent() {
        this.namedElements.republish.classList.toggle('loading', true);
        
        await HashBrown.Service.RequestService.request('post', 'content/republish');

        UI.notifySmall(`All content republished successfully`, null, 3);
        
        this.namedElements.republish.classList.toggle('loading', false);
    }

    /**
     * Event: Clicked start tour
     */
    async onClickStartTour() {
        if(location.hash.indexOf('content/') < 0) {
            location.hash = '/content/';
        }
       
        await new Promise((resolve) => { setTimeout(() => { resolve(); }, 500); });
            
        await UI.highlight('.navigation--resource-browser__tab[href="#/content/"]', 'This the content section, where you will do all of your authoring.', 'right', 'next');

        await UI.highlight('.panel', 'Here you will find all of your authored content, like web pages. You can right click here to create a content node.', 'right', 'next');
        
        await UI.highlight('.resource-editor', 'This is the content editor, where you edit content nodes.', 'left', 'next');
    }

    /**
     * Event: Content settings changed
     *
     * @param {String} id
     */
    onChangeContentSettings(id) {
        if(!this.model || this.model.id !== id) { return; }

        UI.confirm(
            'Content settings changed',
            'The content you are currently editing has been changed. Do you want to reload it?',
            () => { this.update(); }
        );
    }

    /**
     * Event: Locale changed
     */
    onChangeLocale() {
        this.update(); 
    }
    
    /**
     * Event: Click new
     */
    async onClickNew() {
        HashBrown.Entity.View.Modal.CreateContent.new();
    }
}

module.exports = ContentEditor;
