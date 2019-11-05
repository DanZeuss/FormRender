import React, { Component } from 'react';
import Paper from '@material-ui/core/Paper';
import PromiseCancelable from '../../../../helpers/Promises';
import { GetSettings } from '../../../../stores/User/UserHelper';
import { Get, Post } from '../../../../stores/Fetch/ZeussFetch';
import ProgressBar from '../ProgressBar';

const initialState = {
    isLoading: false,
    comment: '',
    messages: []
  }


let getSettingsPromise = null,
    createCommentPromise = null,
    getCommentsPromise = null;

/**
 * Component that list and persist comments having endpoint as reference
 */
class CommentList extends Component {
    constructor(){
        super();
        this.state = initialState;
        this.onComment = this.onComment.bind(this);
        this.isLoading = this.isLoading.bind(this);
    }

    componentDidMount() {
        this.isLoading(true);
        // set the timeZone in the current state to be used as reference to set the right date
        // Because this component is used in other places different than engagement creation, we need
        // to load the timezone separately specific for this it.
        getSettingsPromise = new PromiseCancelable(GetSettings("timeZoneStr"));

        let self = this;
        getSettingsPromise.promise().then((response) => {
            this.isLoading(false);

            if (!getSettingsPromise.hasCanceled()) {
                self.setState({
                    ...response
                });
            }
            if (self.state.messages && self.state.messages.length === 0)
                self.LoadMessages();
        })
    }

    /**
     * Shows/hides the Loading panel
     * @param {boolean} value Defines wether the loading should show or not
     */
    isLoading(value) {
        this.setState({ isLoading: value})
    }

    /**
     * Load all messages related to the engagement according its type and id
     */
    LoadMessages(){
        let self = this;
        getCommentsPromise = new PromiseCancelable(Get(this.props.data_source.list_from));
        getCommentsPromise.promise().then((response) => {
            // avoid set the state when the current component is not mounted anymore
            if (!getCommentsPromise.hasCanceled()) {
                self.setState({ messages: response.data })
                // sometimes, it may not be loading from a place that contains the ShowLoading
                self.isLoading(false);
            }
        })
    }

    componentWillUnmount() {
        // avoid call it to not set state in an unmounted component
        if (getCommentsPromise)
            getCommentsPromise.cancel();
    }
    /**
     * Calls the method to post the comment
     */
    onComment() {
        let self = this;
        this.isLoading(true);
        createCommentPromise = new PromiseCancelable(Post(this.props.data_source.add_to, { comment: this.state.comment }));
        createCommentPromise.promise().then((response) =>{
            self.isLoading(false);
            if (response.success) {
                // avoid set the state when the current component is not mounted anymore
                if (getCommentsPromise && !getCommentsPromise.hasCanceled()) {
                    self.LoadMessages();
                    self.setState({ comment: ""});
                }
            }
        }).catch((error) => {
            Materialize.toast("Your comment could not be added.");
            self.isLoading(false);
        });
    }

    render() {
        // returns a list with all comments
        let commentList = !this.state.messages ?  [] : this.state.messages.map((comment, idx) => {
            return <Comment {...comment} key={idx} currentState={this.state}/>
        });

        return (
            <Paper elevation={2}>
                {   this.state.isLoading &&
                    <ProgressBar/>
                }
                <div className="et-collection">
                    <div className="et-collection-item np">
                        <div className="row et-pal-comment-row">
                            <div className="col l13">
                                <span className="et-pal-comment-row-label">{this.props.label}</span>
                            </div>
                        </div>
                        <div>
                            {commentList}
                            <div className="row nm et-pal-row-gradient"/>
                            {   (this.props.disableEdition == null || this.props.disableEdition == false) && 
                                <div className="row">
                                    <div className="col l12">
                                        <input id="comment" 
                                            value={this.state.comment}
                                            type="text" 
                                            placeholder="Adding my new comment here" 
                                            className="validate" 
                                            onChange={(e) => { this.setState({ comment : e.target.value }) }} 
                                            onKeyPress={(e) => { if (e.key == "Enter") this.onComment() }}
                                            />
                                    </div>
                                    <div className="col l1 npl center-align">
                                        <a className={"btn-floating waves-effect waves-light green accent-4 btn-large et-pal-comment-button approval_description " + ( this.state.comment.trim().length == 0 ? "disabled" : "" )}
                                            data-position="bottom"
                                            data-delay="50" 
                                            data-tooltip="Send Message"
                                            onClick={this.onComment}
                                            >
                                            <i className="icon svg-ic_send_24px material-icons">send</i>
                                        </a>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </Paper>
        );
    }
}

CommentList.propTypes = {
    data_source: function(props) {
        if (props.data_source.list_from === null || props.data_source.list_from === undefined || typeof props.data_source.list_from !== 'string' || props.data_source.list_from.length === 0)
            return new Error("Define a list_from prop for the endpoint address");
        if (props.data_source.add_to === null || props.data_source.add_to === undefined || typeof props.data_source.add_to !== 'string' || props.data_source.add_to.length === 0)
            return new Error("Define a add_to prop for the endpoint address");
    }
}

/**
 * Returns a mockup to display a message
 * @param {*} props
 */
export function Comment(props) {
    let messageTime = props.createdOn;

    // // if the current date is the same form the message, return a friendly datetime... if not, a formated date
    // let messageTime = GetTimeBasedOnTimeZone(props.createdOn, props.currentState.timeZoneStr, moment);
    
    // messageTime = moment().format("L") == messageTime.format("L") ? messageTime.fromNow() : messageTime.format("MMM D, YYYY hh:mm a");
    return (
        <div className="row">
            <div className="col l11">
                <span className="et-pal-comment-user"><strong>{props.displayName}</strong></span>
            </div>
            <div className="col l2">
                <span className="data-grid-time right">
                    {messageTime}
                </span>
            </div>
            <div className="row col l13">
                <span>
                    {props.comment}
                </span>
            </div>
            <div className="col l13 divider">
            </div>
        </div>
    );
}

export default CommentList;