import React, { Component } from 'react';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import withStyles from '@material-ui/core/styles/withStyles';

const style = (theme) => ({
    label: {
        color: '#616161'
    }
})

/**
 * Renders a checkbox
 */
class CheckboxField extends Component {
    constructor() {
        super();
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.props.onChange && this.props.onChange({
            target: {
                name : this.props.name,
                id : this.props.id,
                value:  event.target.checked
            }
        })
    }

    render() {
        let helperText = this.props.valid_when && this.props.valid_when.showAlertMessage ? this.props.valid_when.alert : this.props.required && this.props.required === true ? 'Required *' : '';
        return (
            <FormControl>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={Boolean(this.props.value)}
                            value={this.props.value.toString()}
                            onChange={this.handleChange}
                            id={this.props.id}
                            name={this.props.name}
                        />
                    }
                    label={this.props.label}
                />
                <FormHelperText>{helperText}</FormHelperText>
            </FormControl>
        ); 
        }
}

export default withStyles(style)(CheckboxField);