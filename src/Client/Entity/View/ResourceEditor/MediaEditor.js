'use strict';

/**
 * The editor for media resources
 */
class MediaEditor extends HashBrown.Entity.View.ResourceEditor.ResourceEditorBase {
    static get category() { return 'media'; }
    
    /**
     * Constructor
     */
    constructor(params) {
        super(params);
        
        this.template = require('template/resourceEditor/mediaEditor.js');    
    }

    /**
     * Override this check, as it's not relevant to media
     */
    editedCheck() {}

    /**
     * Event: Clicked start tour
     */
    async onClickStartTour() {
        if(location.hash.indexOf('media/') < 0) {
            location.hash = '/media/';
        }
       
        await new Promise((resolve) => { setTimeout(() => { resolve(); }, 500); });
            
        await UI.highlight('.navigation--resource-browser__tab[href="#/media/"]', 'This the media section, where you will find static files, such as images, videos and documents.', 'right', 'next');

        await UI.highlight('.panel', 'Here is a list of all your media. You can right click here to upload new files. If no files appear here, you may need to to configure a connection as a media provider', 'right', 'next');
        
        await UI.highlight('.resource-editor', 'This is the media viewer, where you can preview files.', 'left', 'next');
    }
   
    /**
     * Event: Click new
     */
    onClickNew() {
        let modal = HashBrown.Entity.View.Modal.UploadMedia.new();
            
        modal.on('success', (resources) => {
            if(resources && resources[0] && resources[0].id) {
                location.hash = '/media/' + resources[0].id;
            }
        });
    }
}

module.exports = MediaEditor;
