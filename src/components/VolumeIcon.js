import {FontAwesomeIcon as FA} from "@fortawesome/react-fontawesome";
import {faVolumeOff} from '@fortawesome/free-solid-svg-icons/faVolumeOff';
import {faVolumeMute} from '@fortawesome/free-solid-svg-icons/faVolumeMute';
import {faVolumeUp} from '@fortawesome/free-solid-svg-icons/faVolumeUp';

const VolumeIcon = (props) => {
  let audioIcon;
  let {audible, mutedInfo} = props;
  audible && console.log("sound", props);
  if (!audible) audioIcon = <FA icon={faVolumeOff} className={'no-audio text-info'} fixedWidth/>; //No Audio
  if (audible && !mutedInfo.muted) audioIcon = <FA icon={faVolumeUp} className={'audio text-info'} fixedWidth/>; //if audio is playing and it is not muted
  if (mutedInfo.muted) audioIcon = <FA icon={faVolumeMute} className={'muted text-info'} fixedWidth/>; //If audio is playing and it is muted
  return (<li
    key={'audioIcon'}
    title="Un/Mute Tab"
    className={`clickable sound-tab ${audible || mutedInfo.muted ? ' active' : ' disabled'}`}
    onClick={() => props.toggleMute(props.id)}
  >{audioIcon}
  </li>);
}
export default VolumeIcon;
