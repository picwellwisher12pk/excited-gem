import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { preferences } from '../scripts/defaultPreferences'

export interface SearchInOptions {
  title: boolean
  url: boolean
  [key: string]: boolean
}

export interface SearchState {
  searchTerm: string
  searchIn: SearchInOptions
  audibleSearch: boolean
  pinnedSearch: boolean
  regex: boolean
  semanticSearch: boolean
}

const searchIn: SearchInOptions = { ...preferences.search.searchIn }
const regex: boolean = preferences.search.regex || false

const initialState: SearchState = {
  searchTerm: '',
  searchIn,
  audibleSearch: false,
  pinnedSearch: false,
  regex,
  semanticSearch: false
}

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    updateSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    toggleSemanticSearch: (state) => {
      state.semanticSearch = !state.semanticSearch
    },
    setSemanticSearch: (state, action: PayloadAction<boolean>) => {
      state.semanticSearch = action.payload
    },
    toggleRegex: (state) => {
      state.regex = !state.regex
    },
    setRegex: (state, action: PayloadAction<boolean>) => {
      state.regex = action.payload
    },
    toggleSearchIn: (state, action: PayloadAction<SearchInOptions>) => {
      state.searchIn = { ...action.payload }
    },
    setSearchIn: (state, action: PayloadAction<SearchInOptions>) => {
      state.searchIn = action.payload
    },
    toggleAudible: (state) => {
      state.audibleSearch = !state.audibleSearch
    },
    togglePinned: (state) => {
      state.pinnedSearch = !state.pinnedSearch
    }
  }
})

export const {
  updateSearchTerm,
  toggleSearchIn,
  toggleAudible,
  togglePinned,
  toggleRegex,
  setRegex,
  setSearchIn,
  toggleSemanticSearch,
  setSemanticSearch
} = searchSlice.actions

export default searchSlice.reducer

