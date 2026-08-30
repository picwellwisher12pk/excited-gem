interface TabData {
  id: string
  index: number
  url: string
  title: string
  status: string
  pinned: boolean
  audible: boolean
  active: boolean
  selected: boolean
  width: number
  height: number
  windowId: string
  favIconUrl?: string
}

interface InfoModalProps {
  data: TabData
}

export default function InfoModal({ data }: InfoModalProps) {
  return (
    <div className="modal-dialog modal-lg" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <button
            type="button"
            className="close"
            data-dismiss="modal"
            aria-label="Close"
          >
            <span
              aria-hidden="true"
              className="glyphicon glyphicon-remove"
            ></span>
          </button>
          <h4 className="modal-title" id="myModalLabel">
            {data.favIconUrl && <img src={data.favIconUrl} alt="favicon" />}
            {data.title}
          </h4>
        </div>
        <div className="modal-body">
          <table className="table table-striped">
            <tbody>
              <tr>
                <td>
                  <strong>ID</strong>
                </td>
                <td>{data.id}</td>
              </tr>
              <tr>
                <td>
                  <strong>Index(position)</strong>
                </td>
                <td>{data.index}</td>
              </tr>
              <tr>
                <td>
                  <strong>URL</strong>
                </td>
                <td>{data.url}</td>
              </tr>
              <tr>
                <td>
                  <strong>Title</strong>
                </td>
                <td>{data.title}</td>
              </tr>
              <tr>
                <td>
                  <strong>Status</strong>
                </td>
                <td>{data.status}</td>
              </tr>
              <tr>
                <td>
                  <strong>Pinned</strong>
                </td>
                <td>{data.pinned ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Audible</strong>
                </td>
                <td>{data.audible ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Active</strong>
                </td>
                <td>{data.active ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Selected</strong>
                </td>
                <td>{data.selected ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>
                  <strong>Width</strong>
                </td>
                <td>{data.width}</td>
              </tr>
              <tr>
                <td>
                  <strong>Height</strong>
                </td>
                <td>{data.height}</td>
              </tr>
              <tr>
                <td>
                  <strong>WindowID</strong>
                </td>
                <td>{data.windowId}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

InfoModal.defaultProps = {
  data: {
    id: '',
    index: 0,
    url: '',
    title: '',
    status: '',
    pinned: false,
    audible: false,
    active: false,
    selected: false,
    width: 0,
    height: 0,
    windowId: ''
  }
}
