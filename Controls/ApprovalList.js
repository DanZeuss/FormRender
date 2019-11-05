import React, { Component } from 'react';
import Paper from '@material-ui/core/Paper';
import { getEngagementStatusNameById, EngagementStatusTypesConsts } from '../../../../constants/EngagementTrackerConstants';
import PromiseCancelable from '../../../../helpers/Promises';
import { Get, Post } from '../../../../stores/Fetch/ZeussFetch';
import ProgressBar from '../ProgressBar';

let initialState = {
    isLoading: false,
    approvals: []
}

let getApprovalList = null,
    updateApprovalItem = null;

/**
 * List all Approval
 */
class ApprovalList extends Component {
    constructor() {
        super();
        this.state = initialState;

        this.onApprove = this.onApprove.bind(this);
        this.onReject = this.onReject.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.isLoading = this.isLoading.bind(this);
    }

    componentDidMount() {
        this.onLoadApprovalList();
    }

    /**
     * Clear and add all tooltips when the component is updated
     * @param {*} prevProps
     * @param {*} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        $('.approval_description').tooltip('remove');
        $('.approval_description').tooltip({delay: 50});
    }

    componentWillUnmount() {
        // only cancel the promise if it was really created/set
        if (getApprovalList)
            getApprovalList.cancel();

        if (updateApprovalItem)
            updateApprovalItem.cancel();
    }

    isLoading(value) {
        this.setState({ isLoading: value })
    }

    onLoadApprovalList() {
        let self = this;
        self.isLoading(true);
        getApprovalList = new PromiseCancelable(new Get(this.props.data_source.list_from))
        getApprovalList.promise().then((response) => {
            if (!getApprovalList.hasCanceled()) {
                self.setState({
                    approvals: response
                });
                self.isLoading(false);
                self.props.onLoadApprovalList ? self.props.onLoadApprovalList(response) : null;
            }
        }).catch((error) => {
            this.isLoading(false);
            throw error;
        })
    }

    /**
     * Calls the endpoint to `undo` an element and then reload the list of approvals
     */
    onUndo(approval) {
        let self = this;
        self.isLoading(true);
        updateApprovalItem = new PromiseCancelable(Post(this.props.data_source.undo_to + approval.roleId, {}))
        updateApprovalItem.promise().then((response) => {
            this.props.onUndo ? this.props.onUndo(approval) : null;
            Materialize.toast('<span><i class="icon svg-ic_undo_24px material-icons white-text text-accent-2 left">undo</i>Undo!</span>', 4000)
            self.isLoading(false);
            self.onLoadApprovalList();
        }).catch((error) => {
            self.isLoading(false);
            throw error;
        })
    }

    /**
     * Calls the endpoint to `reject` an element and then reload the list of approvals
     */
    onReject(approval) {
        let self = this;
        self.isLoading(true);
        updateApprovalItem = new PromiseCancelable(Post(this.props.data_source.reject_to + approval.roleId, {}))
        updateApprovalItem.promise().then((response) => {
            self.props.onReject ? this.props.onReject(approval) : null;
            Materialize.toast('<span><i class="icon svg-ic_thumb_down_24px material-icons red-text text-accent-2 left">thumb_down</i>Rejected!</span>', 4000)
            self.isLoading(false);
            self.onLoadApprovalList();
        }).catch((error) => {
            self.isLoading(false);
            throw error;
        });
    }

    /**
     * Calls the endpoint to `approve` an element and then reload the list of approvals
     */
    onApprove(approval) {
        let self = this;
        self.isLoading(true);
        updateApprovalItem = new PromiseCancelable(Post(this.props.data_source.approve_to + approval.roleId, {}))
        updateApprovalItem.promise().then((response) => {
            self.props.onApprove ? this.props.onApprove(approval) : null;
            Materialize.toast('<span><i class="icon svg-ic_thumb_up_24px material-icons green-text text-accent-4 left">thumb_up</i>Approved!</span>', 4000)
            self.isLoading(false);
            self.onLoadApprovalList();
        }).catch((error) => {
            self.isLoading(false);
            throw error;
        })
    }

    render() {
        // renders a list of pending approvals
        let list = this.state.approvals.map((approval, idx) => {
            return (
                <ApprovalItem {...approval}
                    {...this.props}
                    index={idx}
                    key={idx}
                    onApprove={this.onApprove}
                    onReject={this.onReject}
                    onUndo={this.onUndo}
                  />
            )
        })
        return (
            <Paper elevation={2}>
                { this.state.isLoading &&
                    <ProgressBar/>
                }
                <div className="et-collection">
                    <div className="et-collection-item np">
                        <div className="row et-pal-comment-row">
                            <div className="col l13">
                                <span className="et-pal-comment-row-label">{this.props.label}</span>
                            </div>
                        </div>
                    </div>
                    {list}
                </div>
            </Paper>
        );
    }
}

/**
 * Get the current status of an engagement
 * @param {*} item
 */
export function getCurrentStatus(props){
    return (
        <div>
            <small className="et-pal-approvedby">
                <strong className={ props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) ? 'green-text' : 'red-text'}>{props.currentApprovalStatus}</strong>
                {' by ' + props.lastModifiedBy.user.displayName + ' in ' + formatDate(returnNewValidDate(props.lastModifiedBy.updatedOn)) }
            </small>
        </div>
    )
}

ApprovalList.propTypes = {
    data_source: function(props) {
        if (props.data_source.list_from === null || props.data_source.list_from === undefined || typeof props.data_source.list_from !== 'string' || props.data_source.list_from.length === 0)
            return new Error("Define a list_from prop for the endpoint address");
        if (props.data_source.approve_to === null || props.data_source.approve_to === undefined || typeof props.data_source.approve_to !== 'string' || props.data_source.approve_to.length === 0)
            return new Error("Define a add_to prop for the endpoint address");
    }
}

/**
 * Renders one Approval element
 * @param {*} props
 */
const ApprovalItem = (props) => {
    return (
        <div className="et-collection-item np" key={props.index}>
            <div className="row et-pal-approval-row">
                <div className="col l13">
                    <span className="et-group-name">{props.role} {props.currentApprovalStatus != getEngagementStatusNameById(EngagementStatusTypesConsts.PENDING_APPROVALS) && getCurrentStatus(props)}</span>
                    { (props.disableEdition == null || props.disableEdition == false) && 
                        <a data-position="bottom"
                            onClick={() => {
                                // if status is rejected.. let the user do undo
                                if (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED))
                                    props.onUndo(props);
                                else
                                    // if not, let reject
                                    props.onReject(props)
                            }}
                            data-delay="50"
                            data-tooltip={props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED) ? "Undo": "Reject"}
                            className={"waves-effect waves-light btn right red accent-2 btn-floating approval_description " + (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) || !props.accessible ? "disabled" : "")}>
                            <i className={"icon approval-icon svg-ic_"+ (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED) ? "undo" : "thumb_down") + "_24px material-icons"}>{props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED) ? "undo" : "thumb_down"}</i>
                        </a>
                    }
                    { (props.disableEdition == null || props.disableEdition == false) && 
                        <a data-position="bottom"
                            onClick={() => {
                                // if it's already approved.. let the user do undo
                                if (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED))
                                    props.onUndo(props);
                                else
                                    // if not, approve
                                    props.onApprove(props)
                            }}
                            data-delay="50"
                            data-tooltip={props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) ? "Undo" : "Approve" }
                            className={"waves-effect waves-light btn right  green accent-4 btn-floating approval_description "  + (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED) || !props.accessible ? "disabled" : "")}>
                            <i className={"icon approval-icon svg-ic_" + (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) ? "undo" : "thumb_up")  + "_24px material-icons"}>{props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) ? "undo" : "thumb_up"}</i>
                        </a>
                    }
                    <span className={"new white-text badge " + (props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.REJECTED) ?  "red accent-2" : props.currentApprovalStatus == getEngagementStatusNameById(EngagementStatusTypesConsts.APPROVED) ? "green accent-4" : "grey darken-" )} data-badge-caption={props.accessible ? props.currentApprovalStatus : "You are not a member of this group and therefore cannot approve this engagement. Contact the Engagement Tracker Admin for further assistance."}></span>
                </div>
            </div>
        </div>
    );
}


export default ApprovalList;