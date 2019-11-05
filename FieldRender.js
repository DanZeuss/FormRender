import React, { Component } from 'react';
import TextField from './controls/TextField';
import SelectField from './controls/SelectField';
import { Grid } from "@material-ui/core";
import DateTimeField from './controls/DateTimeField';
import TableList from './controls/TableList';
import CheckboxField from './controls/CheckboxField';
import AttachmentList from './AttachmentList';
import SentimentField from './controls/SentimentField';
import SelectFieldMCSS from './controls/SelectFieldMCSS';

const excludeProps = ['elementName', 'showSnackMessage', 'setNewState', 'disableEdition']
/**
 * Renders an element based on its definition
 */
class FieldRender extends Component {
    constructor() {
        super();
        this.renderMappedOrDefaulElement = this.renderMappedOrDefaulElement.bind(this);
    }

    /**
     * Check if there's a remapped element to render according the elementName defined
     * @param {string} elementName String name that defines the element type
     * @param {class} element Element defined as default to be rendered
     */
    renderMappedOrDefaulElement(elementName, DefaultElement, props) {
        let RenderCustomElement =  this.props.mapper && this.props.mapper[elementName] ? this.props.mapper[elementName] : undefined;

        // if the Custom element is not defined and the default element wasn't defined too,..
        if (!RenderCustomElement && !DefaultElement)
            return <div>Element {elementName} not defined</div>

        return RenderCustomElement ? <RenderCustomElement {...props}/> : <DefaultElement {...props}/>
    }

    render() {
        let elementName = this.props.elementName;
        // if none of the element was defined...
        if (!elementName || elementName.length === 0 || this.props.hide)
            return null;

        let currentElement = null;

        // prepare the allowed props to be passed down
        let props = {...this.props};
        // exclude props that aren't allowed to be passed down
        for (let i = 0; i < excludeProps.length; i++) {
            delete props[excludeProps[i]]
        }
        switch (elementName) {
            case 'TextField': 
                currentElement = this.renderMappedOrDefaulElement(elementName, TextField, props);
                break;
            case 'SelectField':  
                currentElement = this.renderMappedOrDefaulElement(elementName, SelectField, {...props, 
                    showSnackMessage: this.props.showSnackMessage, 
                    setNewState: this.props.setNewState
                });
                break;
            case 'SelectListSetFields':  
                currentElement = this.renderMappedOrDefaulElement(elementName, SelectFieldMCSS, {...props, 
                    elementName : this.props.elementName, 
                    showSnackMessage: this.props.showSnackMessage, 
                    setNewState: this.props.setNewState
                });
                break;

            case 'DateTimeField' :
                currentElement = this.renderMappedOrDefaulElement(elementName, DateTimeField, props);
                break;
            case 'TableList' :
                currentElement = this.renderMappedOrDefaulElement(elementName, TableList, {...props, 
                    showSnackMessage: this.props.showSnackMessage,
                    disableEdition: this.props.disableEdition
                });
                break;
            case 'CheckboxField' :
                currentElement = this.renderMappedOrDefaulElement(elementName, CheckboxField, props);
                break;
            case 'AttachmentList' :
                currentElement = this.renderMappedOrDefaulElement(elementName, AttachmentList, {...props, 
                    showSnackMessage: this.props.showSnackMessage,
                    disableEdition: this.props.disableEdition
                });
                break;
            case 'SentimentField' :
                currentElement = this.renderMappedOrDefaulElement(elementName, SentimentField, {...props, 
                    showSnackMessage: this.props.showSnackMessage,
                    disableEdition: this.props.disableEdition
                });
                break;

            case elementName: // case the elementName is not default here, but it's defined in the Mapper... render the map element
                currentElement = this.renderMappedOrDefaulElement(elementName, null, {...this.props});
                break;
        }
        if (props.visible === false)
            return null;

        return (
            <Grid item xs={12} sm={this.props.size ? Number(this.props.size) : 4}>
                {currentElement}
            </Grid>
        );
    }
}

export default FieldRender;