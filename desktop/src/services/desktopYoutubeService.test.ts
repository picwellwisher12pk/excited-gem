import { describe, it, expect } from 'bun:test'
import {
  desktopYoutubeService,
  formatVideoDuration
} from './desktopYoutubeService'

describe('desktopYoutubeService', () => {
  it('formats video durations correctly', () => {
    expect(formatVideoDuration(undefined)).toBe('')
    expect(formatVideoDuration(0)).toBe('')
    expect(formatVideoDuration(-5)).toBe('')
    expect(formatVideoDuration(45)).toBe('0:45')
    expect(formatVideoDuration(90)).toBe('1:30')
    expect(formatVideoDuration(570)).toBe('9:30')
    expect(formatVideoDuration(3665)).toBe('1:01:05')
  })

  it('manages API key and notification correctly', () => {
    let notified = false
    const unsub = desktopYoutubeService.subscribe(() => {
      notified = true
    })

    desktopYoutubeService.setApiKey('AIzaSy_Test_Key')
    expect(desktopYoutubeService.getApiKey()).toBe('AIzaSy_Test_Key')
    expect(notified).toBe(true)

    unsub()
  })

  it('imports extension cache and retrieves durations for URLs', () => {
    desktopYoutubeService.importExtensionCache(
      {
        'testVideo123': { title: 'Quantum Test', duration: 420, timestamp: Date.now() }
      },
      {
        'https://www.youtube.com/watch?v=watchVideo456': { duration: 750, title: 'Watch Test' }
      },
      'AIzaSy_From_Extension'
    )

    expect(desktopYoutubeService.getDurationForUrl('https://www.youtube.com/watch?v=testVideo123')).toBe(420)
    expect(desktopYoutubeService.getDurationForUrl('https://youtu.be/watchVideo456')).toBe(750)
    expect(desktopYoutubeService.getDurationForUrl('https://google.com')).toBeUndefined()
  })
})

