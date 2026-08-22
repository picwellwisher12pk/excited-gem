import { Checkbox } from 'antd'
// @ts-ignore
import Loading from 'react:/src/icons/spinner-third.svg'


export function TabIcon({ onChange, checked, loading, discarded, src, title, isSelectionMode }: Readonly<{
  onChange: () => void;
  checked: boolean;
  loading: boolean;
  src: string;
  discarded: boolean;
  title: string;
  isSelectionMode: boolean;
}>) {
  const showCheckbox = isSelectionMode || checked;

  return (
    <div
      className="tab-favicon align-self-center flex px-1 items-center justify-center min-w-[28px] relative h-[28px]"
      aria-label={`Tab selection and favicon for ${title}`}
    >
      {/* Checkbox: Visible if selected, in selection mode, or on hover */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 z-10'}`}>
        <Checkbox
          onChange={(e) => {
            e.stopPropagation(); // Prevent tab click
            onChange();
          }}
          checked={checked}
        />
      </div>

      {/* Favicon/Loading: Visible if NOT selected/mode, fades out on hover */}
      <div className={`flex items-center justify-center transition-opacity duration-200 ${showCheckbox ? 'opacity-0' : 'group-hover:opacity-0 opacity-100'}`}>
        {loading ? (
          <Loading className={'spinner'} style={{ fill: 'blue' }} />
        ) : (
          <img
            src={src || 'default-src-value'}
            alt={title}
            title={src && title}
            style={{ width: 16, height: 16, opacity: discarded ? 0.5 : 1 }}
          />
        )}
      </div>
    </div>
  )
}
