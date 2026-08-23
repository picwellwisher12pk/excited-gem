import { Input } from 'antd'
import { debounce } from 'lodash'
import React, { memo, useCallback, useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Pin, Volume2, VolumeX } from 'lucide-react'
import ErrorBoundary from '../scripts/ErrorBoundary'
import { makePlaceholder as doPlaceholder } from '../scripts/general'
import {
  toggleAudible,
  togglePinned,
  updateSearchTerm
} from '../store/searchSlice'

const { Search: AntSearch } = Input

export interface SearchProps {
  // If true, uses standard Redux slice (used tightly by Tabs page).
  isReduxConnected?: boolean

  // Used only when isReduxConnected = false
  value?: string
  onChange?: (val: string) => void
  onSearch?: (val: string) => void
  placeholder?: string
  foundCount?: number
  showTabFilters?: boolean
  extraSuffix?: React.ReactNode

  // General styling overrides
  className?: string
}

const Search: React.FC<SearchProps> = ({
  isReduxConnected = true,
  value,
  onChange,
  onSearch,
  placeholder: propPlaceholder,
  foundCount,
  showTabFilters = true,
  extraSuffix,
  className = ''
}) => {
  const dispatch = useDispatch()
  const searchField = useRef<any>(null)

  // Redux States (only strictly relevant if isReduxConnected)
  // We use optional chaining or defaults below just in case.
  const reduxTabs = useSelector((state: any) => state.tabs?.filteredTabs || [])
  const reduxSearch = useSelector(
    (state: any) =>
      state.search || {
        searchTerm: '',
        pinnedSearch: false,
        audibleSearch: false,
        searchIn: { title: true, url: true },
        regex: false
      }
  )

  const { searchTerm, pinnedSearch, audibleSearch, searchIn, regex } =
    reduxSearch

  // Local States
  const [internalPlaceholder, setInternalPlaceholder] = useState('')
  const [searchBehavior, setSearchBehavior] = useState('debounce')

  // Check storage for search behavior preference
  useEffect(() => {
    chrome.storage.local.get(['searchBehavior'], (result) => {
      if (result.searchBehavior) {
        setSearchBehavior(result.searchBehavior)
      }
    })
  }, [])

  // Sync placeholder if using Redux
  useEffect(() => {
    if (isReduxConnected) {
      setInternalPlaceholder(doPlaceholder(searchIn, regex))
    }
  }, [searchIn, regex, isReduxConnected])

  // Sync empty search term back to DOM manually for Redux mode
  useEffect(() => {
    if (isReduxConnected && searchTerm === '') {
      if (searchField.current && searchField.current.input) {
        searchField.current.input.value = ''
      }
    }
  }, [searchTerm, isReduxConnected])

  const handleKeyUp = useCallback(
    (event: any) => {
      const val = event.target.value
      if (val === '' || event.key === 'Escape') {
        if (searchField.current && searchField.current.input) {
          searchField.current.input.value = ''
        }
        if (isReduxConnected) {
          dispatch(updateSearchTerm(''))
        }
        if (onChange) onChange('')
        if (onSearch) onSearch('')
        return
      }
    },
    [dispatch, isReduxConnected, onChange, onSearch]
  )

  const debouncedReduxUpdate = useCallback(
    debounce((val) => {
      dispatch(updateSearchTerm(val))
    }, 300),
    []
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (isReduxConnected) {
      if (searchBehavior === 'debounce') {
        debouncedReduxUpdate(val)
      }
    } else {
      if (onChange) onChange(val)
    }
  }

  const handleSearchCommit = (val: string) => {
    if (isReduxConnected) {
      dispatch(updateSearchTerm(val))
    }
    if (onSearch) onSearch(val)
  }

  // Derived values for UI
  const displayValue = isReduxConnected ? undefined : value // Let AntSearch manage its own uncontrolled state if value is undefined
  const displayPlaceholder = isReduxConnected
    ? internalPlaceholder
    : propPlaceholder
  const displayFoundCount = isReduxConnected ? reduxTabs.length : foundCount
  const hasSearchContent = isReduxConnected
    ? !!searchTerm
    : !!value && value.length > 0

  // Regex logic is globally controlled by Redux settings
  const isRegexActive = regex

  return (
    <ErrorBoundary>
      <div
        className={`flex-1 ml-4 min-w-0 flex items-center gap-2 overflow-hidden ${className}`}
      >
        <AntSearch
          className="flex-1 w-full !ml-auto !ms-auto"
          id={isReduxConnected ? 'search-field' : undefined}
          ref={searchField}
          // Only pass value if we are strictly controlled from parent
          {...(!isReduxConnected && value !== undefined ? { value } : {})}
          onKeyUp={handleKeyUp}
          prefix={
            isRegexActive ? (
              <span className="text-zinc-300 hidden sm:inline">/</span>
            ) : (
              <span className="text-transparent hidden sm:inline">/</span>
            )
          }
          suffix={
            <div className="flex items-center">
              {hasSearchContent && displayFoundCount !== undefined && (
                <span className="text-zinc-400 max-w-[100px] truncate inline-block align-middle mr-2 hidden sm:inline-block">
                  {displayFoundCount + ' found'}
                </span>
              )}
              {isRegexActive && <span className="text-zinc-300 mr-2">/gi</span>}

              {/* Extra Suffix for page-specific injects (like "Search in") */}
              {extraSuffix}

              {/* Redux Tab Filters */}
              {showTabFilters && isReduxConnected && (
                <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 ml-1">
                  <button
                    className="!border-0 flex align-items-center bg-transparent cursor-pointer p-0"
                    type="button"
                    title={
                      audibleSearch ? 'Show all tabs' : 'Filter audible only'
                    }
                    onClick={() => dispatch(toggleAudible())}
                  >
                    {audibleSearch ? (
                      <Volume2 size={16} className="text-[#0487cf]" />
                    ) : (
                      <VolumeX size={16} className="text-[#0487cf]" />
                    )}
                  </button>

                  <button
                    className="!border-0 bg-transparent cursor-pointer flex align-items-center p-0"
                    type="button"
                    title={
                      pinnedSearch ? 'Show all tabs' : 'Filter pinned only'
                    }
                    onClick={() => dispatch(togglePinned())}
                  >
                    {pinnedSearch ? (
                      <Pin size={16} className="text-[#0487cf] fill-current" />
                    ) : (
                      <Pin size={16} className="text-[#0487cf]" />
                    )}
                  </button>
                </div>
              )}
            </div>
          }
          placeholder={displayPlaceholder}
          autoFocus={true}
          onChange={handleChange}
          onSearch={handleSearchCommit}
        />
      </div>
    </ErrorBoundary>
  )
}

export default memo(Search)
