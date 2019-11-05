import React, { Component } from 'react';
import Typography from '@material-ui/core/Typography';

/**
 * Render the label and its value
 */
class LabelField extends Component {
    render() {
        let value = typeof this.props.value ==='object' && this.props.value !== null ? this.props.value.label : (this.props.value || "");
        value = value === undefined || value.length == 0 ? "N/A" : value;
        return (
            <div>
                <Typography variant="body1" gutterBottom>
                    {this.props.label || ""}
                </Typography>
                <Typography variant="caption" color="textSecondary" component="p">
                    {value}
                </Typography>
            </div>
        );
    }
}

export default LabelField;