import React, { Component } from 'react';
import DropzoneComponent from 'react-dropzone-component';
import * as zFetch from '../../../stores/Fetch/ZeussFetch';
import PromiseCancelable from '../../../helpers/Promises';

let myDropzone, // used to manage the dropzone object
    getAttachmentsPromise = null; // used to control the promises


/**
 * Set the dropzone instance in the myDropzone global variable
 * @param {*} dropzone
 */
function initCallback (dropzone) {
    myDropzone = dropzone;
}

/**
 * Allows the user list, upload and download files
 */
class AttachmentList extends Component {
    constructor() {
        super();
        this.state = {
            fileList: [],
            isLoading: false
        }
    }

    componentWillUnmount() {
        if (getAttachmentsPromise)
            getAttachmentsPromise.cancel();
    }

    /**
     * Method to be called when a file is removed from the Dropzone
     * @param {*} file
     */
    removedFile(file) {
        // handle when the file wasn't uploaded and the component is trying to remove it from the context
        if (file.status == "error")
            return;
    
        let fileInfo = file.id ? file : JSON.parse(file.xhr.response);

        if (fileInfo.success == false)
            return;

        let self = this;
        // we send a request to remove the file
        zFetch.Post(`${this.props.data_source.detach_from}${fileInfo.id}`, {}).then((response) =>  {

            if (response.success) {
                self.props.showSnackMessage('File removed', 'success')
                // we remove the file from the state
                let fileList = self.state.fileList.filter(f => f.name != file.name && f.size != file.size);
                self.updateFileList(fileList);
            }
            else {
                // if we had no success sending the file, show a message
                if (response.message)
                    self.props.showSnackMessage(response.message, 'info')
            }
        })
    }

    /**
     * calls the endpoint to download the file
     * @param {*} file
     */
    downloadFile(file) {
        // if it comes from the database, get the id, if it comes from the xhr response, get the ide recently generated
        let fileInfo = file.id ? file : JSON.parse(file.xhr.response);
        window.location.assign(`${this.props.data_source.download_from}${fileInfo.id}`);
    }

    /**
     * Event called when a file is added in the dropzone
     * @param {*} file
     */
    addedFile(file) {
        let self = this;
        file.previewElement.addEventListener("click", function() {
            self.downloadFile(file);
        });
    }

    /**
     * update the state with the file list that was changed
     * @param {*} list
     */
    updateFileList(list) {
        let currentState = {
            ...this.state,
            fileList: list
        }
        this.setState({
            ...currentState
        });
    }

    handleError(file) {
        this.props.showSnackMessage('The file could not be uploaded, check the file size is less than 5 MB.', 'warning')
        myDropzone.removeFile(file);
    }

    verifyResponse(file){
        if (file.xhr != undefined) {
            let responseObject = JSON.parse(file.xhr.response);
            if (responseObject.success == false){
                this.handleError(file);
                return;
            }
        }
    }

    /**
     * Inject all files from the file list that are inside the state within the Dropzone
     * @param {*} state
     */
    insertFilesToDropZone(state) {
        // there are files
        if (state.fileList != undefined && state.fileList.length > 0) {
            // add all files into the Dropzone
            state.fileList.forEach(file => {
                // if we're creating a mock file received from our db... set the values according the values that we have there,
                // if not, we create our mock based on our state.fileList files persisted in the reducer
                var mockFile = file.fileName == undefined && file.fileSize == undefined ? file : { id: file.id, name: file.fileName, size: file.fileSize };
                myDropzone.emit("addedfile", mockFile);
                myDropzone.emit("complete", mockFile);
            });
        }
    }

    componentDidMount() {
        let self = this;

        self.setState({ isLoading: true});
        getAttachmentsPromise = new PromiseCancelable(zFetch.Get(this.props.data_source.list_from));
        getAttachmentsPromise.promise().then(result => {
            if (!getAttachmentsPromise.hasCanceled()) {
                self.insertFilesToDropZone({ fileList: result, isLoading: false})
            }
        });

        if (this.props.disableEdition) {
            myDropzone.removeEventListeners();
        }
    }
    render() {
        // the current token to be sent
        let token = $('meta[name="csrf-token"]').attr('content');
        // dropzone specif parameters
        var djsConfig = {
            addRemoveLinks: (this.props.disableEdition == null || this.props.disableEdition == false),
            params: {
                '_token' : token,
                'X-CSRF-Token' : token,
                'X-XSRF-TOKEN' : token
            }
        };

        // dropzone configurations
        let componentConfig = {
            iconFiletypes: ['.jpg', '.png', '.gif'],
            showFiletypeIcon: true,
            postUrl: this.props.data_source && this.props.data_source.attach_to ? this.props.data_source.attach_to : '',
        };

        let self = this;
        /**
         * event handler used to manage all Dropdzone events
         */
        var eventHandlers = {
            addedfile: (file) => {
                // by defaul, remove file is allowed
                if (this.props.disableEdition == null || this.props.disableEdition == false){
                    self.addedFile(file);
    
                    let fileList = self.state.fileList;
                    if (fileList.find(f => f.name == file.name && f.size == file.size) == undefined) {
                        fileList.push(file);
                        self.updateFileList(fileList);
                    }
                }
            },
            // manage the removed file
            removedfile: (file) => {
                // by defaul, remove file is allowed
                if (this.props.disableEdition == null || this.props.disableEdition == false)
                    this.removedFile(file)
                else    
                    return;
            },
            init: initCallback,
            // handle when the server throws an error
            error: (file) => this.handleError(file),
            complete:(file) => this.verifyResponse(file)
        };
        
        let helperText = this.props.valid_when && this.props.valid_when.showAlertMessage ? this.props.valid_when.alert : this.props.required && this.props.required === true ? 'Required *' : '';
        return (
            <div>
                <label htmlFor="name" className=" active " data-position="bottom" data-delay="50">{this.props.label || ""}</label>
                {
                    this.props.data_source && this.props.data_source.list_from &&
                    <DropzoneComponent config={componentConfig} djsConfig={djsConfig} eventHandlers={eventHandlers}/>
                }
                <span className="helper-text" data-error="wrong" data-success="right" style={{ top: ".7em"}}>{helperText}</span>
            </div>
        );
    }
}

export default AttachmentList;