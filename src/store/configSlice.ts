import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import cloneDeep from 'lodash/cloneDeep'
import { preferences } from '../scripts/defaultPreferences'

export interface ConfigState {
  [key: string]: any
  tabs?: any[]
  selectedTabs?: number[]
}

const initialState: ConfigState = {
  ...preferences
}

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    updateActiveTabs: (state, action: PayloadAction<any[]>) => {
      state.tabs = cloneDeep(action.payload)
    },
    updateSelectedTabs: (state, action: PayloadAction<number[]>) => {
      state.selectedTabs = action.payload
    }
  }
})

export const { updateActiveTabs, updateSelectedTabs } = configSlice.actions

export default configSlice.reducer

