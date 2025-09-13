
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
                else
                {
                    document.getElementById("firmware-modal").toggleAttribute('open', event === "firmware_upload_begin")
                }

                if (event === "firmware_upload_end")
                {
                    fw_upload = false
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



    }
    catch (err)
    {
        console.log(`event error: ${err}`);
    }
}