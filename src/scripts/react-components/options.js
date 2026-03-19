////MESSAGING AND COMMUNICATION
function packageData(sender, receiver, targetMethod, data) {
  return (dataPackage = {
    sender: sender,
    receiver: receiver,
    targetMethod: targetMethod,
    data: data
  })
}

function packageAndBroadcast(sender = sender, receiver, targetMethod, data) {
  chrome.runtime.sendMessage(packageData(sender, receiver, targetMethod, data))
}

chrome.runtime.onConnect.addListener(function (port) {
  console.assert(port.name === 'ActiveTabsConnection')
  if (port.name === 'ActiveTabsConnection') {
    port.onMessage.addListener(function (msg) {
      console.log('msg', msg)
      if (!jQuery.isEmptyObject(msg)) {
        tabsList = msg.tabs
        $('.active-tab-count').html(msg.tabs.length)
        ActiveTabs.setState({ data: msg.tabs })
      }
    })
  }
})

// Saves options to chrome.storage.sync.
function save_options(e) {
  e.preventDefault()
  let pref = {}
  pref.filterType = $('#filter-type-option-id').val()
  pref.filterCase = $('#filterCase-option-id').prop('checked')
  pref.sortAnimation = $('#sort-animation-option-id').val()
  pref.experimentalAI = $('#experimentalAI-option-id').prop('checked')
  console.log(pref)
  chrome.storage.local.set(
    {
      pref: pref
    },
    function () {
      // Update status to let user know options were saved.
      console.log(pref)
      // let status = document.getElementById('status');
      $('#status>span').text('Options Saved')
      $('#status').fadeIn('slow')
      // status.textContent = 'Options saved.';
      setTimeout(function () {
        $('#status').fadeOut('slow')
        $('#status>span').text('')
      }, 2500)
    }
  )
}
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get('pref', function (items) {
    console.log(items)
    $('#filter-type-option-id').val(items.pref.filterType)
    $('#sort-animation-option-id').val(items.pref.sortAnimation)
    $('#filterCase-option-id').prop('checked:', items.pref.filterCase)
    $('#experimentalAI-option-id').prop('checked', items.pref.experimentalAI)
  })
}
document.addEventListener('DOMContentLoaded', restore_options)
// document.getElementById('save').addEventListener('click', save_options);
$('#save').on('click', save_options)
$('#go-to-tabs').on('click', function () {
  packageAndBroadcast('options', 'background', 'openExcitedGemPage', null)
})
