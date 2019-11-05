import React, { Component } from 'react';
import Card from '@material-ui/core/Card';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import withStyles from '@material-ui/core/styles/withStyles';
import Typography from '@material-ui/core/Typography';
import { Route, withRouter } from 'react-router-dom';
import FormRender from './FormRender';
import StepNavigator from './StepNavigator';
import Navigator from './Navigator';
import PropTypes from 'prop-types';

import SnackBarWrapper from './SnackBarWrapper';



const styles = theme => ({
    root: {
        padding: theme.spacing.unit * 2,
        flexGrow: 1,
    },
    paper: {
        padding: theme.spacing.unit * 2,
    },
    formCard: {
        marginBottom: 10,
        overflow: 'unset'
    }
});

/**
 * Renders a form based on the schema passed as property
 */
class Form extends Component {
    constructor(props) {
        super();
        // this parse is a trick to do a shallow copy
        this.state = {
            ...props.schema,
            showSnack: false,
            // message to be shown in the snackBar
            message: '',
            // icon/color to be shown in the snackBar
            iconVariant: 'none',
            // define the default state for the navigator control/buttons
            navigator: {
                priorEnabled: true,
                cancelEnabled: true,
                nextEnabled: true
            }
        }
        
        this.onMovePrior = this.onMovePrior.bind(this);
        this.onMoveNext = this.onMoveNext.bind(this);
        this.onModelChange = this.onModelChange.bind(this);
        this.IsModelValid = this.IsModelValid.bind(this);
        this.onCancel = this.onCancel.bind(this);
        this.showSnackMessage = this.showSnackMessage.bind(this);
        this.onCloseSnackMessage = this.onCloseSnackMessage.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.moveNext = this.moveNext.bind(this);
        this.movePrior = this.movePrior.bind(this);
        this.setNewState = this.setNewState.bind(this);
    }

    onCloseSnackMessage() {
        this.setState({ showSnack: false, message: "", iconVariant: "none"})
    }

    /**
     * Shows a pop up message
     * @param {string} message A string message to be displayed inside the snackBar
     * @param {string} iconVariant  Options: `success` || `warning` || `error` || `info`
     */
    showSnackMessage(message, iconVariant) {
        this.setState({
            showSnack: true,
            message: message,
            iconVariant: iconVariant
        });
    }

    onCloseSnackMessage() {
        this.setState({ showSnack: false, message: "", iconVariant: "none"})
    }

    componentDidMount() {
        // set the current step according the id defined in the schema
        let currentStep = this.state.activeStep;

        this.IsModelValid(this.state.steps[currentStep]);

        // we set the validation to the Parent that may use the validation for other purpose or context
        if (this.props.setValidationToParent)
            this.props.setValidationToParent(this.IsModelValid, this.state.steps[currentStep]);
    }


    /**
     * Go through all fields verifying which field should have its behavior changed. It returns the current stepFlow updated
     * @param {Object} stepFlow Pass as reference the flow schema of the current form to go through the fields
     * @param {Object} schema Pass as reference the whole schema that may be used as reference for specific field rules.
     */
    updateFieldBehaviors(stepFlow, schema) {
        // controls wether should update the schema or not
        let shouldUpdate = false;
        // are there fields?
        if (stepFlow && Array.isArray(stepFlow.fields) && stepFlow.fields.length > 0) {
            for (let fieldIndex = 0; fieldIndex < stepFlow.fields.length; fieldIndex++) {
                let field = stepFlow.fields[fieldIndex];
                // are there visibility rules?
                if (field.hidden_when && Array.isArray(field.hidden_when) && field.hidden_when.length > 0) {
                    // go through all rules
                    for (let i = 0; i < field.hidden_when.length; i++) {
                        let rule = this.validateFieldRule(field.hidden_when[i], field, stepFlow, schema);
                        // if the rule/test has failed (===true).. okay, do nothing, if not, hide the field and clear its data
                        if (rule.result) {
                            // once the field is hidden, we should clear its data to avoid sending garbage data
                            field.value = "";
                            field.hide = true;
                            // we replace the old field by this new changed field
                            stepFlow.fields[fieldIndex] = field;
                            // determines that the schema should be updated
                            shouldUpdate = true;
                        } else {
                            delete field.hide;
                        }
                    }
                };

                // are there rules to disable the field?
                if (field.disabled_when && Array.isArray(field.disabled_when) && field.disabled_when.length > 0) {
                    for (let i = 0; i < field.disabled_when.length; i++) {

                        let rule = this.validateFieldRule(field.disabled_when[i], field, stepFlow, schema);
                        // rule.result == false is a positive condition
                        // it the rule/test has failed(===true).. okay, do nothing.. if not, disable the field
                        if (rule.result) {
                            field.disabled = true;
                            stepFlow.fields[fieldIndex] = field;
                            // determines that the schema should be updated
                            shouldUpdate = true;
                        } else {
                            delete field.disabled;
                        }
                    }
                }
            }
        };

        if (shouldUpdate) {
            let currentStepIndex = schema.steps.findIndex((step) => step.flowTypeId === stepFlow.flowTypeId);
            schema.steps[currentStepIndex] = stepFlow;
        }
        return schema;
    }

    /**
     *
     * @param {Object} rule Rule being validated. It always should return an object containing the property called `passed` which receives `true` or `false`
     * @param {*} fieldFlow Field being validated aginst the rule
     * @param {*} stepFlow Flow that contains all data/schema referent the current field being validated
     * @param {*} schemaFlow The whole schema flow
     */
    validateFieldRule(rule, fieldFlow, stepFlow, schemaFlow) {
        let ruleResult = {};
        // if the basic parameters of a rule weren't defined
        if (rule.test === null || rule.test === undefined) {
            // we'll consider it a negative result
            ruleResult.result = false;
            ruleResult.message = "The rule doesn't contains the required properties to be validated.";
            return ruleResult;
        };

        /**
         *  We create a function dynamically passing as parameter the variables that contains:
         *      fieldValue: Value of the current field being validated agains the rule (which could be any data type or object);
         *      stepFlow: Contains all data/schema referent the current step flow;
         *      schemaFlow: Contains all data/schema referente the whole schema flow;
         */
        // the eslint line below, exclude a rule that disallow Function creators
        // eslint-disable-next-line
        let functionCall = new Function("fieldValue", "stepFlow", "schemaFlow", rule.test.toLowerCase().includes("return") ? rule.test : "return " + rule.test);
        // calls the function and get its result
        ruleResult.result = functionCall(fieldFlow.value, stepFlow, schemaFlow);
        // if the rule has passed, return an empty string, if not, return the message described in the rule;
        ruleResult.message = ruleResult.result ?  rule.message : "";
        return ruleResult;

    }

    /**
     * Validate the step fields against its values. It checks each field and validate its values against the validations rules.
     * Once a rule is not valid, it register (showAlertMessage) an alert where should be shown to the user
     * @param {Object} field Current field that's going to be validated.
     * @param {StepFlow} stepFlow Flow that contains the field being validated.
     * @param {SchemaFlow} schemaFlow All schema that may be used while validating rules.
     */
    validateStepFields(field, stepFlow, schemaFlow) {
        // validates case by case
        if (field.valid_when !== undefined) {
            field.valid_when.showAlertMessage = false;
            field.valid_when.alert = '';

            // validate required value
            if (field.required) {
                if ((field.value === undefined || field.value === null) ||
                    (typeof field.value === 'string' && field.value.trim().length === 0)) {
                        field.valid_when.showAlertMessage = true;
                        field.valid_when.alert = 'Required *';
                        // if the required field wasn't filled... get out
                        return field;
                    }

            }
            // check all 'string' constrains
            if ((field.value !== undefined || field.value !== null) && typeof field.value === 'string'){
                // min/max length defined?
                if ((field.minLength && typeof field.minLength === 'number') && (field.maxLength && typeof field.maxLength === 'number')) {
                    if (field.value.trim().length < field.minLength || field.value.trim().length > field.maxLength) {
                        field.valid_when.showAlertMessage = true;
                        field.valid_when.alert = `At input has to be between ${field.minLength} and  ${field.maxLength} characters`
                    }
                // minLength defined?
                } else if (field.minLength && typeof field.minLength === 'number') {
                    if (field.value.trim().length < field.minLength) {
                        field.valid_when.showAlertMessage = true;
                        field.valid_when.alert = `At least ${field.minLength} characters`
                    }
                // maxLength defined?
                } else if (field.maxLength && typeof field.maxLength === 'number') {
                    if (field.value.trim().length > field.maxLength) {
                        field.valid_when.showAlertMessage = true;
                        field.valid_when.alert = `The input has to be less than ${field.maxLength} characters`
                    }
                }
                // was the alert defined to be shown?
                if (field.valid_when.showAlertMessage)
                    // get out and avoid the next statements
                    return field;
            }

            // check for conditional and dynamic rules
            if (Array.isArray(field.valid_when) && field.valid_when.length > 0) {
                for (let i = 0; i < field.valid_when.length; i++) {
                    let rule = this.validateFieldRule(field.valid_when[i], field, stepFlow, schemaFlow);
                    // if the rule failed...
                    if (rule.result) {
                        field.valid_when.showAlertMessage = true;
                        field.valid_when.alert = rule.message;
                        // get out the iteration
                        return field;
                    }

                }
            }
        };
        return field;
    }

    /**
     * Method called when the user tries to move to the prior step of the flow
     */
    onMovePrior() {
        let currentStepIndex = this.state.steps.findIndex(step => step.index == this.state.activeStep);
        let stepModelData = this.state.steps[currentStepIndex];
        // is the scheema (fields) valid?
        if (this.IsModelValid(stepModelData)){
            
            // persist in the parent context?
            if (this.props.onSaveStep && this.props.saveOnMovePrior === true)
                // call the onSaveStep in the parent (which probably will call the endpoint) and then call the `moveNext` to 
                // move to the next step (passed as callback)
                this.props.onSaveStep(stepModelData, this.state, this.movePrior);
            else    
                this.movePrior();
        }
    }

    /**
     * Does the same as the `moveNext` do, but, in opposite side
     */
    movePrior() {
        let activeStep = this.state.activeStep - 1;

        this.setState((state, props) => ({
            activeStep: state.activeStep - 1
        }));

        let priorUrl = this.props.urlPathBase + activeStep;
        this.props.history.push(priorUrl);
    }

    /**
     * Method called when the user moves to the next step of the flow
     */
    onMoveNext() {
        let currentStepIndex = this.state.steps.findIndex(step => step.index == this.state.activeStep);
        let stepModelData = this.state.steps[currentStepIndex];
        // is the scheema (fields) valid?
        if (this.IsModelValid(stepModelData)){
            
            // persist in the parent context?
            if (this.props.onSaveStep)
                // call the onSaveStep in the parent (which probably will call the endpoint) and then call the `moveNext` to 
                // move to the next step (passed as callback)
                this.props.onSaveStep(stepModelData, this.state, this.moveNext);
            else    
                this.moveNext();
        }
    }

    /**
     * It happens when everything is okay when the `OnMoveNext` is called
     */
    moveNext() {
        // ...move to the next step
        let activeStep = this.state.activeStep + 1;

        this.setState((state, props) => ({
            activeStep: state.activeStep + 1
        }));

        // move to the next URL
        let nextUrl = this.props.urlPathBase + activeStep;
        this.props.history.push(nextUrl);
    }

    onCancel() {
        if (this.props.onCancel)
            this.props.onCancel(this.state.steps[this.state.activeStep], this.state);
    }

    /**
     * Go trough all the schema fields and check if all fields are valid
     * @param {Model} stepFlow Step
     */
    IsModelValid(stepFlow) {
        // return true by default
        let isValid = true;
        if (stepFlow.fields !== undefined && stepFlow.fields.length > 0) {
            for (let index = 0; index < stepFlow.fields.length; index++) {
                // get current field and validate it agains its rules
                let fieldValidated = this.validateStepFields(stepFlow.fields[index], stepFlow, this.state);

                /**
                 * Replace the field (already validated) in the list of fields.
                 * Attention: The reason why this field is replaced is because, once we get at least one
                 * case where the Schema is invalid (by a rule), we're going to update the schema which
                 * will reflect in the fields showing up the alerts/message of the validation.
                 */
                stepFlow.fields[index] = fieldValidated;

                // if the field is invalid, we return a negative return telling that the model/schema/step fields is/are invalid/s
                if (fieldValidated.valid_when !== undefined && fieldValidated.valid_when.showAlertMessage)
                    isValid = false;
            }

            // if there are errors/alert/invalid fields
            if (!isValid) {
                // updates the current state setting the schema with the validation messages
                let currentState = { ...this.state };
                // get the current step index id to...
                let currentStepIndex = currentState.steps.findIndex(s => s.index === stepFlow.index);
                // ... update the step according the stepFlow index set
                currentState.steps[currentStepIndex] = stepFlow;

                // update the state
                this.setState({
                    ...currentState
                })
            }
        };

        return isValid;

    }

    onBlur() {
        // get the structure of the current step (all fields)
        let currentStep = this.state.steps.length == 1 ? this.state.steps[0] : this.state.steps.find(step => step.index === this.state.activeStep);
        
        // update all behaviors like hide_when, etc...
        this.updateFieldBehaviors(currentStep, this.state);
        // validates the model again to show all helper messages
        this.IsModelValid(currentStep);

    }
    /**
     * Change the value of the field in the schema
     * @param {event} event Object
     */
    onModelChange(event) {
        
        // get the structure of the current step (all fields)
        let currentStep = this.state.steps.length == 1 ? this.state.steps[0] : this.state.steps.find(step => step.index === this.state.activeStep);
        // get the index of the field that is going to be changed
        let fieldIndex = currentStep.fields.findIndex(element => element.id === event.target.id);
        // change the value from the field inside the structure
        currentStep.fields[fieldIndex.toString()].value = event.target.value;
        this.setState((state, props) => ({
            steps: state.steps
        }));

        // if there's a onModelChange listener in the parent.. call it sending the current schema as reference
        if (this.props.onModelChange)
            this.props.onModelChange(this.state);

        /**
         * We may have situation when a value from the current element may impact others and vice-versa,
         * so, everytime that the value is changed, a `on_change` value is triggered
         */
        let currentField = currentStep.fields[fieldIndex.toString()];
        // if we have a `on_change` method.. call it
        if (currentField.on_change) {
            let functionCall = new Function("field", "stepFlow", "schemaFlow", "self", currentField.on_change);
            // call the `on_change` passing as parameter the currentField, step schema and `this`
            functionCall(currentField, currentStep, this.props.schema, this);
        }
    }

    /**
     * Get the value as reference and set it inside the current state, mapping it from field/value
     */
    setNewState(newState) {
        // control to check whether the current field is ID
        let fieldIsId = false;
        // get the structure of the current step (all fields)
        let currentStep = this.state.steps.length == 1 ? this.state.steps[0] : this.state.steps.find(step => step.index === this.state.activeStep);
        for (let i = 0; i < currentStep.fields.length; i++) {
            // get the current element
            let element = currentStep.fields[i];
            fieldIsId = element.id && element.id.toLowerCase() === 'id';
            // set the value on it got from the newState
            element.value = (newState && newState[currentStep.fields[i].id]) || "";
        }
        // if we don't have an `ID` set into the fields array, but the new state contains an ID... ADD IT
        if (!fieldIsId && newState.id)
            currentStep.fields.push({
                id: 'id',
                value: newState.id
            });

        // even not changing anything specific from the state... just by calling the setStatate would affect the current state
        // because everything is a reference. 
        this.setState((state, props) => ({
            steps: state.steps
        }));        

    }

    render() {
        let { classes, showInsideDialog } = this.props;
        
        // render only the steps that aren't modal
        let steps = this.state.steps.filter(step => step.modal === false);

        let BasicFormProps = {
            mapper: this.props.mapper,
            showSnackMessage: this.showSnackMessage,
            onBlur:this.onBlur, 
            onModelChange: this.onModelChange,
            schema:{...this.props.schema},
            setNewState: this.setNewState
        };

        // showInsideDialog? If so, it means that we're going to render only one step within a dialog form
        if (showInsideDialog === true)
            return <FormRender {...BasicFormProps} {...this.state.steps[0]} />

        let routes = steps.map((step) => {
            return (
                <Route
                    exact
                    key={step.index}
                    // renders the form according the URL defined as pattern + id of the step
                    path={this.props.urlPathBase + step.index}
                    render={(props) => { return <FormRender {...BasicFormProps} {...step} {...props} />}} 
                />
            );
        })
        return (
            <div className={classes.root}>
                { this.state.iconVariant !== "none" &&
                    <SnackBarWrapper 
                        opened={this.state.showSnack}
                        iconVariant={this.state.iconVariant}
                        message={this.state.message}
                        onCloseSnackMessage={this.onCloseSnackMessage}
                        />
                }
                <Grid container spacing={24}>
                    <Grid item xs={12}>
                        <Paper className={classes.paper}>
                            <Typography variant="h4">{this.state.flowTitle}</Typography>
                            <Typography variant="overline">{this.state.flowDescription}</Typography>
                            <Card className={ classes.formCard }>
                                <StepNavigator steps={steps} activeStep={this.state.activeStep}/>
                                { routes }
                            </Card>
                            <Route render={(routeProps) => {
                                return (
                                    <Navigator {...this.props} {...routeProps}
                                        navigatorState={this.state.navigator}
                                        onMovePriorClick={this.onMovePrior}
                                        onMoveNextClick={this.onMoveNext}
                                        onCancel={this.onCancel}
                                        activeStep={this.state.activeStep}
                                        totalSteps={steps.length}/>
                                )
                            }}/>
                        </Paper>
                    </Grid>
                </Grid>
          </div>
        );
    }
}


Form.propTypes = {
    schema: PropTypes.object.isRequired,
    // defines the URL patter for each form/step that is going to be rendered according the URL
    urlPathBase: PropTypes.string.isRequired
}

export default withStyles(styles)(withRouter(Form));