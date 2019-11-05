import React, { Component } from 'react';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import withStyles from '@material-ui/core/styles/withStyles';

const styles = theme => ({
    icon: {
    },
    active: {
        color: '#fbb040 !important'
    }
});


/**
 * This component is responsible to show the navigation steps inside the form, allowing the user move between the steps by a non or linear progress
 */
class StepNavigator extends Component {
    render() {
        let { steps, classes } = this.props;

        return (
            <Stepper activeStep={this.props.activeStep} nonLinear={false}>
                {
                    steps.map(step => {
                        return(
                            <Step key={step.id}>
                                <StepLabel StepIconProps={
                                    { 
                                        classes: { 
                                            root: classes.icon,
                                            active: classes.active,
                                            completed: classes.active 
                                        } 
                                    }
                                }>{step.flowTitle}</StepLabel>
                            </Step>
                        )
                    })
                }
            </Stepper>
        );
    }
}

export default withStyles(styles)(StepNavigator);