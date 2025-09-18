
const ev = new EventSource("event")
let fw_upload = false

ev.onmessage = function (e) 
{
    try
    {
        const data = JSON.parse(e.data);


        if ('event' in data)
        {
            const event = data.event

            if (event.startsWith("firmware_upload_"))
            {
                fw_upload = true
                if ('value' in data)
                {
                    document.getElementById("firmware-progress").value = data.value
                }

                if (event === "firmware_upload_begin")
                {
                    console.log('open firmware modal')
                    document.getElementById("firmware-modal").toggleAttribute('open', true)
                }

                if (event === "firmware_upload_end")
                {

                    console.log('close firmware modal')
                    fw_upload = false
                    document.getElementById("firmware-modal").toggleAttribute('open', false)
                }
            }
            else if (!fw_upload)
            {
                // TODO(): handle disconnection correctly
                document.getElementById("disconnected").toggleAttribute("open", event === "disconnect")
            }
        }

        if ('value' in data && typeof triggerThreshold !== 'undefined')
        {
            triggerThreshold.value = data.value
        }

        if ('curve' in data)
        {
            curve_data = JSON.parse(data.curve)
            const total_time = 213;
            const dt = total_time / curve_data.length
            const parameters = document.querySelector('time-bar-chart')
            parameters.setLiveCurve(curve_data)//.map(value => value * 2))
        }

    }
    catch (err)
    {
        console.log(`event error: ${err}`);
    }
}