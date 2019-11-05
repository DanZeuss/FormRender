import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import withStyles from '@material-ui/core/styles/withStyles';

const ButtonColor = withStyles(theme => ({
    root: {
        backgroundColor: '#fbb040',
        '&:hover': {
            backgroundColor: '#ffb447',
        },
    },
}))(Button);


/**
 * Creates a Navigation bar used to navigate among the steps
 */
class Navigator extends Component {
    render() {
        let { classes } = this.props;
        return (
            <Grid container direction="row" justify="space-between" alignItems="center">
                <ButtonColor disabled={!this.props.activeStep || (this.props.activeStep && this.props.activeStep === 0) || (this.props.navigator && this.props.navigator.prior === false)}
                        variant="contained" color="primary"
                        onClick={this.props.onMovePriorClick}>Prior</ButtonColor>
                <Button onClick={this.props.onCancel} disabled={(this.props.navigator && this.props.navigator.cancel === false)}>Cancel</Button>
                <ButtonColor disabled={this.props.activeStep === this.props.totalSteps || (this.props.navigator && this.props.navigator.next === false)}
                    onClick={this.props.onMoveNextClick}
                    variant="contained" color="primary">{this.props.nextButtonLabel || "Save & continue"}
                </ButtonColor>
            </Grid>
        );
    }
}

export default Navigator;