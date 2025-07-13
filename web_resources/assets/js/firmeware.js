let firmware_upload = false

    const ev = new EventSource("event")

    ev.onmessage = function (e) {
      const data = JSON.parse(e.data);

      if ('value' in data) {
        document.getElementById("fsr_value").innerText = data.value
      }
    }

    async function start_fsr_logger() {
      const resp = await fetch("/start_fsr_logger");
      const data = await resp.json()
    }

    async function stop_fsr_logger() {
      const resp = await fetch("/stop_fsr_logger");
      const data = await resp.json()
    }

    function hide(id) {
      document.getElementById(id).style.display = 'none'
    }

    function hide_all() {
    }


    async function upload_firmware() {
      document.getElementById('fw_upload_button').ariaBusy = true
      const firmware_file = document.getElementById("firmware_file").files[0]
      const formData = new FormData();

      formData.append('firmware_file', firmware_file);

      const resp = await fetch('/firmware', { // Your POST endpoint
        method: 'POST',
        body: formData // This is your file object
      })
      const j = await resp.json() // if the response is a JSON object
      console.log(j)

      document.getElementById('fw_upload_button').ariaBusy = false

    }