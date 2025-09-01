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
const hhcInterval = document.querySelector('range-slider[name="hhc-interval"]');
const hhcNoiseThreshold = document.querySelector('range-slider[name="hhc-noise-threshold"]');
// const hhcGain = document.querySelector('range-slider[name="hhc-gain"]');
const hhcOffset = document.querySelector('range-slider[name="hhc-offset"]');
const hhcTrig = document.querySelector('range-slider[name="hhc-trig"]');
// TODO: add hhc_trig other element

// Modals elements
const aboutModal = document.querySelector('dialog#about-modal');
const resetModal = document.querySelector('dialog#reset-modal');
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

    const ev = new EventSource("event")

    ev.onmessage = function (e) 
    {
        const data = JSON.parse(e.data);
        if ('value' in data)
        {
            triggerThreshold.value = data.value
        }
    }
}

init();

// Events handling
sensorsSelect.addEventListener("change", (e) =>
{
    currentSensor = e.target.value;
    getConfig();
});

midiNote.addEventListener('change', () =>
{
    if (currentSensor === "hhc") return null;
    fetch(`set/${currentSensor}/note/${Number(midiNote.value)}`);
});

bezierCurve.addEventListener('curve', (e) =>
{
    if (currentSensor === "hhc") return null;

    const curveData = e.detail.curve.map(subArray =>
        subArray.map(num => parseInt(num, 10))
    );

    const jsonStr = JSON.stringify({ p: curveData });
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, 'json_curve');

    fetch('/curve', {
        method: 'POST',
        body: formData,
    });
});

triggerGain.addEventListener('gain', () =>
{
    if (currentSensor === "hhc") return null;
    fetch(`set/${currentSensor}/gain/${triggerGain.threshold.toFixed(2)}`);
});

triggerThreshold.addEventListener('threshold', () =>
{
    if (currentSensor === "hhc") return null;
    fetch(`set/${currentSensor}/threshold/${Math.round(triggerThreshold.threshold)}`);
});

parameters.addEventListener('parameters', (event) =>
{
    if (currentSensor === "hhc") return null;
    const { scan, mask, decay } = event.detail;

    fetch(`set/${currentSensor}/scan/${Math.round(scan * 1000)}`);
    fetch(`set/${currentSensor}/mask/${Math.round(mask * 1000)}`);
    fetch(`set/${currentSensor}/decay/${Math.round(decay * 1000)}`);
});

hhcInterval.addEventListener('hhc-interval', () =>
{
    if (currentSensor !== "hhc") return null;
    fetch(`set/${currentSensor}/interval/${hhcInterval.threshold}`);
});

hhcNoiseThreshold.addEventListener('hhc-noise-threshold', () =>
{
    if (currentSensor !== "hhc") return null;
    fetch(`set/${currentSensor}/threshold/${hhcNoiseThreshold.threshold}`);
});

// hhcGain.addEventListener('hhc-gain', () => {
// if (currentSensor !== "hhc") return null;
//     fetch(`set/${"currentSensor"}/gain/${hhcGain.threshold}`);
// });

hhcOffset.addEventListener('hhc-offset', () =>
{
    if (currentSensor !== "hhc") return null;
    fetch(`set/${currentSensor}/offset/${hhcOffset.threshold}`);
});

hhcTrig.addEventListener('hhc-trig', () =>
{
    if (currentSensor !== "hhc") return null;
    fetch(`set/${currentSensor}/trig/${hhcTrig.threshold}`);
});
// TODO: add other hhc_trig events


// Update sensor with current data
function updateSensorData()
{
    if (!data[currentSensor]) return null;

    if (currentSensor === "hhc")
    {
        setHhcMode();
        const { interval, threshold, gain, offset, trig } = data[currentSensor]

        hhcInterval.threshold = interval;
        hhcNoiseThreshold.threshold = threshold;
        // hhcGain.threshold = gain;
        hhcOffset.threshold = offset;
        hhcTrig.threshold = trig;
        return null;
    }
    else
    {
        setDefaultMode();
        const { note, curve, gain, scan, mask, decay, threshold } = data[currentSensor];

        midiNote.value = note;
        bezierCurve.values = curve.p;
        triggerGain.threshold = fixedToFloat(gain, 16, 15);;
        triggerThreshold.threshold = Number(threshold);
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

function resetSettings()
{
    console.log("Reset settings");
    // TODO: Fetch old config
    toggleResetModal();
}

function saveSettings()
{
    console.log("Save settings");
    // TODO: Post new config
    toggleSaveModal();
}

function toggleAboutModal()
{
    aboutModal.toggleAttribute('open');
}

function toggleResetModal()
{
    resetModal.toggleAttribute('open');
}

function toggleSaveModal()
{
    saveModal.toggleAttribute('open');
}