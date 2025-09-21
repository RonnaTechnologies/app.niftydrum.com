
const ev = new EventSource("event")
let fw_upload = false

function normalizeArrayToMax(arr, desiredMax)
{
    const currentMax = Math.max(...arr);
    const scalingFactor = desiredMax / currentMax;
    return arr.map(value => value * scalingFactor);
}

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
                document.getElementById("disconnected").toggleAttribute("open", event === "disconnect")
                if (event === "connect")
                {
                    document.location = "/"
                }
            }
        }

        if ('value' in data && typeof triggerThreshold !== 'undefined')
        {
            triggerThreshold.value = data.value
        }

        if ('curve' in data)
        {
            curve_data = JSON.parse(data.curve)
            parameters.setLiveCurve(normalizeArrayToMax(curve_data, 300))//.map(value => value * 2))

        }

    }
    catch (err)
    {
        console.log(`event error: ${err}`);
    }
}