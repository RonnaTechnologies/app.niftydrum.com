// Navigation elements
const sensorsSelect = document.querySelector("#sensors-select");
const defaultContainer = document.querySelector('#default-mode');
const hhcContainer = document.querySelector('#hhc-mode');

// State variables
let currentSensor = sensorsSelect.value;
let data = null;

// Settings elements
const midiNote = document.querySelector('#midi-note');
const bezierCurve = document.querySelector('bezier-curve');
const triggerGain = document.querySelector('range-slider[name="gain"]');
const triggerThreshold = document.querySelector('range-slider[name="threshold"]');
const parameters = document.querySelector('time-bar-chart');

// HHC settings elements
const hhcInterval = document.querySelector('range-slider[name="hhc-timeout"]');
const hhcNoiseThreshold = document.querySelector('range-slider[name="hhc-threshold"]');
// const hhcGain = document.querySelector('range-slider[name="hhc-gain"]');
const hhcOffset = document.querySelector('range-slider[name="hhc-offset"]');
const hhcTrig = document.querySelector('range-slider[name="hhc_trig-threshold"]');
// TODO: add hhc_trig other element

// Modals elements
const aboutModal = document.querySelector('dialog#about-modal');
const saveModal = document.querySelector('dialog#save-modal');

function fixedToFloat(rawValue, intBits, fracBits)
{
    // const totalBits = intBits + fracBits;
    // const maxValue = Math.pow(2, totalBits);

    // Ensure the raw value is within the valid range
    // if (rawValue >= maxValue)
    // {
    //     throw new Error("Raw value out of range");
    // }

    // Calculate the integer part
    const integerPart = rawValue >> fracBits;

    // Calculate the fractional part
    const fractionalPart = (rawValue & ((1 << fracBits) - 1)) / Math.pow(2, fracBits);

    // Combine the integer and fractional parts
    const floatValue = integerPart + fractionalPart;

    return floatValue.toFixed(2);
}

// Init
async function getConfig()
{
    const response = await fetch('/get_all');
    data = await response.json();
    updateSensorData();
}


async function init()
{
    await getConfig();
    const _ = await fetch('/stop_noise_logger');
    const __ = await fetch('/start_noise_logger');

}

init();

// Events handling
sensorsSelect.addEventListener("change", async (e) =>
{
    currentSensor = e.target.value;

    const sensor_map = {
        "kick": 0, "snare": 1, "hihat": 2, "crash1": 4, "tom1": 5, "tom3": 6,
        "ride": 7, "tom2": 8, "crash2": 9
    };

    await fetch(`/select/${sensor_map[currentSensor]}`)

    console.log(currentSensor)
    await getConfig();
});

midiNote.addEventListener('change', async () =>
{
    if (currentSensor === "hhc") return null;
    await fetch(`set/${currentSensor}/note/${Number(midiNote.value)}`);
});

bezierCurve.addEventListener('curve', async (e) =>
{
    if (currentSensor === "hhc") return null;

    const curveData = e.detail.curve.map(subArray =>
        subArray.map(num => parseInt(num, 10))
    );

    const jsonStr = JSON.stringify({ p: curveData });
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, 'json_curve');

    await fetch('/curve', {
        method: 'POST',
        body: formData,
    });
});

triggerGain.addEventListener('gain', async () =>
{
    if (currentSensor === "hhc") return null;
    await fetch(`set/${currentSensor}/gain/${triggerGain.threshold.toFixed(2)}`);
});

triggerThreshold.addEventListener('threshold', async () =>
{
    if (currentSensor === "hhc") return null;
    parameters.setThreshold(triggerThreshold.threshold);
    await fetch(`set/${currentSensor}/threshold/${Math.round(triggerThreshold.threshold)}`);
});

parameters.addEventListener('parameters', async (event) =>
{
    if (currentSensor === "hhc") return null;
    const { scan, mask, decay } = event.detail;

    await fetch(`set/${currentSensor}/scan/${Math.round(scan * 1000)}`);
    await fetch(`set/${currentSensor}/mask/${Math.round(mask * 1000)}`);
    await fetch(`set/${currentSensor}/decay/${Math.round(decay * 1000)}`);
});

hhcInterval.addEventListener('hhc-timeout', async () =>
{
    if (currentSensor !== "hhc") return null;
    await fetch(`set/fsrc/timeout/${Math.round(hhcInterval.threshold)}`);
});

hhcNoiseThreshold.addEventListener('hhc-threshold', async () =>
{
    if (currentSensor !== "hhc") return null;
    await fetch(`set/fsrc/threshold/${Math.round(hhcNoiseThreshold.threshold)}`);
});

// hhcGain.addEventListener('hhc-gain', () => {
// if (currentSensor !== "hhc") return null;
//     fetch(`set/${"currentSensor"}/gain/${hhcGain.threshold}`);
// });

hhcOffset.addEventListener('hhc-offset', async () =>
{
    if (currentSensor !== "hhc") return null;
    await fetch(`set/fsrc/offset/${Math.round(hhcOffset.threshold)}`);
});

hhcTrig.addEventListener('hhc_trig-threshold', async () =>
{
    if (currentSensor !== "hhc") return null;
    await fetch(`set/fsrt/threshold/${Math.round(hhcTrig.threshold)}`);
});
// TODO: add other hhc_trig events


// Update sensor with current data
function updateSensorData()
{
    if (!data[currentSensor]) return null;

    if (currentSensor === "hhc")
    {
        setHhcMode();
        const { offset, threshold, timeout } = data[currentSensor]
        const trig_threshold = data["hhc_trig"]["threshold"]

        hhcInterval.threshold = timeout;
        hhcNoiseThreshold.threshold = threshold;
        // hhcGain.threshold = gain;
        hhcOffset.threshold = offset;
        hhcTrig.threshold = trig_threshold;
        return null;
    }
    else
    {
        setDefaultMode();
        const { note, curve, gain, scan, mask, decay, threshold } = data[currentSensor];

        midiNote.value = note;
        bezierCurve.values = curve.p;
        triggerGain.threshold = fixedToFloat(gain, 16, 15);
        triggerThreshold.threshold = Number(threshold);
        parameters.setThreshold(Number(threshold));
        parameters.setData({
            scan: Number(scan / 1000),
            mask: Number(mask / 1000),
            decay: Number(decay / 1000),
        })
    }
}

// Helper functions
function setDefaultMode()
{
    defaultContainer.toggleAttribute('disabled', false);
    hhcContainer.toggleAttribute('disabled', true);
}

function setHhcMode()
{
    defaultContainer.toggleAttribute('disabled', true);
    hhcContainer.toggleAttribute('disabled', false);
}



function saveSettings()
{
    console.log("Save settings");
    //fetch("/save_params_all")
    toggleSaveModal();
}

function toggleAboutModal()
{
    aboutModal.toggleAttribute('open');
}


function toggleSaveModal()
{
    saveModal.toggleAttribute('open');
}

// TODO: live curve test to be removed
setInterval(() =>
{
    const values = Array.from({ length: 400 }, () =>
        Math.floor(Math.random() * 100)
    );

    parameters.setLiveCurve(values)
}, 2000);