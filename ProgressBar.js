import LinearProgress from '@material-ui/core/LinearProgress';
import withStyles from '@material-ui/core/styles/withStyles';

const ProgressBar = withStyles({
    colorPrimary: {
      backgroundColor: '#fbb040',
    },
    barColorPrimary: {
      backgroundColor: '#ffe7c4',
    },
})(LinearProgress);

export default ProgressBar;