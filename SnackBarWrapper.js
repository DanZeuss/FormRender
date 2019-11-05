import React, { Component } from 'react';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import green from '@material-ui/core/colors/green';
import amber from '@material-ui/core/colors/amber';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import WarningIcon from '@material-ui/icons/Warning';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import classNames from 'classnames';
import Snackbar from '@material-ui/core/Snackbar';
import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';

/**
 * All message variations 
 */
const variantIcon = {
    success: CheckCircleIcon,
    warning: WarningIcon,
    error: ErrorIcon,
    info: InfoIcon,
};

const snackBarStyle = theme => ({
    none: {

    },
    success: {
      backgroundColor: green[600],
    },
    error: {
      backgroundColor: theme.palette.error.dark,
    },
    info: {
      backgroundColor: theme.palette.primary.dark,
    },
    warning: {
      backgroundColor: amber[700],
    },
    icon: {
      fontSize: 20,
    },
    iconVariant: {
      opacity: 0.9,
      marginRight: theme.spacing.unit,
    },
    message: {
      display: 'flex',
      alignItems: 'center',
    },
});

/**
 * Renders a snack content with a pre-defined colors, message, icon
 * @param {*} props 
 */
function MySnackbarContent(props) {
    const { classes, className, message, onClose, variant, ...other } = props;
    const Icon = variantIcon[variant];
  
    return (
      <SnackbarContent
        className={classNames(classes[variant], className)}
        aria-describedby="client-snackbar"
        message={
            <span id="client-snackbar" className={classes.message}>
                <Icon className={classNames(classes.icon, classes.iconVariant)} />
                {message}
            </span>
        }
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            className={classes.close}
            onClick={onClose}
          >
            <CloseIcon className={classes.icon} />
          </IconButton>,
        ]}
        {...other}
      />
    );
  }
  
MySnackbarContent.propTypes = {
    classes: PropTypes.object.isRequired,
    className: PropTypes.string,
    message: PropTypes.node,
    onClose: PropTypes.func,
    variant: PropTypes.oneOf(['success', 'warning', 'error', 'info', 'none']).isRequired,
};

const MySnackbarContentWrapper = withStyles(snackBarStyle)(MySnackbarContent);


const snackBarWrapperStyle = theme => ({
    snackBar: {
        top: 85,
    }
})

class SnackBarWrapper extends Component {
    constructor(props) {
        super(props);
        this.handleClose = this.handleClose.bind(this);
    }

    handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        this.props.onCloseSnackMessage ? this.props.onCloseSnackMessage() : null;
    };

    render() {
        let {classes} = this.props;
        return (
            <Snackbar 
                className={classes.snackBar}
                open={this.props.opened}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                onClose={this.handleClose}
                autoHideDuration={5000}>
                <MySnackbarContentWrapper
                    onClose={this.handleClose}
                    variant={this.props.iconVariant}
                    message={this.props.message || ""}
                />
            </Snackbar>
        );
    }
}

SnackBarWrapper.propTypes = {
    opened: PropTypes.bool.isRequired,
}

export default withStyles(snackBarWrapperStyle)(SnackBarWrapper);
