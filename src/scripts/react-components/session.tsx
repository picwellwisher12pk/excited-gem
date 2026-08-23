import { useState } from 'react'
import { removeSessions } from '../../components/getsetSessions'

function timeConverter(timestamp: number): string {
  const a = new Date(timestamp)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  const year = a.getFullYear()
  const month = months[a.getMonth()]
  const date = a.getDate()
  const hour = a.getHours()
  const min = a.getMinutes()
  const sec = a.getSeconds()
  return `${date} ${month} ${year} ${hour}:${min}:${sec}`
}

interface WindowData {
  [key: string]: { url: string; title: string }[]
}

export interface SessionData {
  created: number
  name?: string
  windows: WindowData
}

interface SessionProps {
  data: SessionData
  created: number
  onDelete?: () => void
}

export default function Session({ data, created, onDelete }: SessionProps) {
  const [show, setShow] = useState(false)
  const dateTime = timeConverter(data.created)

  const handleRestore = (url?: string) => {
    if (url) {
      chrome.tabs.create({ url })
    } else {
      Object.values(data.windows)
        .flat()
        .forEach((tab) => {
          chrome.tabs.create({ url: tab.url })
        })
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this session?')) {
      await removeSessions(data.created)
      if (onDelete) onDelete()
    }
  }

  return (
    <div
      key={data.created.toString()}
      data-id={data.created.toString()}
      className="card mb-3"
    >
      <div className="card-header clearfix cf" id={data.created.toString()}>
        <div className="d-flex justify-content-between align-items-center">
          <button
            className="btn btn-link text-left"
            type="button"
            onClick={() => setShow(!show)}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span className="font-weight-bold mr-2">
              {data.name || 'Session'}
            </span>
            <span className="text-muted small">{dateTime}</span>
            <span className="ml-2">
              {Object.keys(data.windows).map((key, index) => (
                <span
                  title={`Window ${index + 1}: ${data.windows[key].length} tabs`}
                  className="badge badge-secondary mr-1"
                  key={index}
                >
                  {data.windows[key].length}
                </span>
              ))}
            </span>
          </button>
          <div>
            <button
              className="btn btn-sm btn-primary mr-2"
              onClick={() => handleRestore()}
            >
              Restore All
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {show && (
        <div className="card-body">
          {Object.keys(data.windows).map((winId, index) => (
            <div key={winId} className="mb-3">
              <h6 className="text-muted">Window {index + 1}</h6>
              <ul className="list-group">
                {data.windows[winId].map((tab, i) => (
                  <li
                    key={i}
                    className="list-group-item d-flex justify-content-between align-items-center p-2"
                  >
                    <div className="text-truncate" style={{ maxWidth: '80%' }}>
                      <a
                        href={tab.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tab.url}
                      >
                        {tab.title || tab.url}
                      </a>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleRestore(tab.url)}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

Session.defaultProps = {
  data: {
    created: Date.now(),
    windows: {}
  }
}
