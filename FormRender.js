import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import CardContent from '@material-ui/core/CardContent';
import FieldRender from './FieldRender';

const style = theme => ({
    grid: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    cardContent: {
        paddingTop: 0
    }
});

/**
 * This component is responsible to render a form based in a UI schema and its data
 */
class FormRender extends Component {
    render() {
        let { classes } = this.props;
        let fields = !this.props.fields ? [] : this.props.fields.map((field, key) => <FieldRender schema={this.props.schema} 
                mapper={this.props.mapper} 
                key={key} 
                {...field} 
                onBlur={this.props.onBlur} 
                onChange={this.props.onModelChange} 
                showSnackMessage={this.props.showSnackMessage}
                setNewState={this.props.setNewState}
                disableEdition={this.props.disableEdition}

            />
        )
        return(
            <CardContent className={ classes.cardContent }>
                {   // only shows the title when the property is defined with a value
                    this.props.title && this.props.title.length > 0 &&
                    <Typography variant='subtitle1'>{this.props.title}</Typography>
                }
                {
                    // onlny shows the description when the property is defined with a value
                    this.props.description && this.props.description.length > 0 &&
                    <Typography variant='overline'>{this.props.description}</Typography>
                }
                <Grid className={classes.grid} container spacing={24}>
                { 
                    fields.length > 0 &&
                    fields
                }
                </Grid>
            </CardContent>
        );
    }
}


export default withStyles(style)(FormRender);