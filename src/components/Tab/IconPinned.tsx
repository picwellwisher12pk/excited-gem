
// @ts-ignore
import ThumbtackActiveIcon from 'react:/src/icons/thumbtack-active.svg'
// @ts-ignore
import ThumbtackIcon from 'react:/src/icons/thumbtack.svg'

import { blueIconStyle, grayIconStyle } from './helpers'

interface IconPinnedProps {
  pinned: boolean;
}

export function IconPinned({ pinned }: Readonly<IconPinnedProps>) {
  return pinned ? (
    <ThumbtackActiveIcon style={blueIconStyle} />
  ) : (
    <ThumbtackIcon style={grayIconStyle} />
  )
}
