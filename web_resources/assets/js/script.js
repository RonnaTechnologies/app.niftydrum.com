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
const gain = document.querySelector('range-slider[name="gain"]');
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

// Init
async function getConfig () {
    const response = await fetch('/get_all');
    data = await response.json();
    updateSensorData();
}

getConfig();

// Events handling
sensorsSelect.addEventListener("change", (e) => {
    currentSensor = e.target.value;
    getConfig()
    updateSensorData()
})

midiNote.addEventListener('change', () => {
    fetch(`set/${currentSensor}/note/${Number(midiNote.value)}`);
});

bezierCurve.addEventListener('curve', (e) => {
    fetch(`set/${currentSensor}/curve/${encodeURIComponent(JSON.stringify(e.detail.curve))}`);
})

gain.addEventListener('gain', () => {
    fetch(`set/${currentSensor}/gain/${gain.threshold}`);
});

parameters.addEventListener('change', (event) => {
    for (const key in event.detail) {
        const value = event.detail[key];
        fetch(`set/${currentSensor}/${key}/${value}`);
    }
});

hhcInterval.addEventListener('hhc-interval', () => {
    fetch(`set/${currentSensor}/interval/${hhcInterval.threshold}`);
});

hhcNoiseThreshold.addEventListener('hhc-noise-threshold', () => {
    fetch(`set/${currentSensor}/threshold/${hhcNoiseThreshold.threshold}`);
});

// hhcGain.addEventListener('hhc-gain', () => {
//     fetch(`set/${"currentSensor"}/gain/${hhcGain.threshold}`);
// });

hhcOffset.addEventListener('hhc-offset', () => {
    fetch(`set/${currentSensor}/offset/${hhcOffset.threshold}`);
});

hhcTrig.addEventListener('hhc-trig', () => {
    fetch(`set/${currentSensor}/trig/${hhcTrig.threshold}`);
});
// TODO: add other hhc_trig events


// Update sensor with current data
function updateSensorData () {
    if (!data[currentSensor]) return null;

    if (currentSensor === "hhc") {
        setHhcMode();
        hhcInterval.threshold = data[currentSensor].interval;
        hhcNoiseThreshold.threshold = data[currentSensor].threshold;
        // hhcGain.threshold = data[currentSensor].gain;
        hhcOffset.threshold = data[currentSensor].offset;
        hhcTrig.threshold = data[currentSensor].trig;

        // TODO: add other hhc_trig values
        return null;
    }

    setDefaultMode();
    midiNote.value = data[currentSensor].note;
    parameters.mask = data[currentSensor]?.mask;
    bezierCurve.values = data[currentSensor]?.curve?.p;
    gain.threshold = data[currentSensor].gain;
    parameters.scan = data[currentSensor]?.scan;
    parameters.mask = data[currentSensor]?.mask;
    parameters.decay = data[currentSensor]?.decay;
    parameters.threshold = data[currentSensor]?.threshold;
}


// Helper functions
function setDefaultMode() {
    defaultContainer.toggleAttribute('disabled', false);
    hhcContainer.toggleAttribute('disabled', true);
}

function setHhcMode() {
    defaultContainer.toggleAttribute('disabled', true);
    hhcContainer.toggleAttribute('disabled', false);
}

function resetSettings() {
    console.log("Reset settings");
    // TODO: Fetch old config
    toggleResetModal();
}

function saveSettings() {
    console.log("Save settings");
    // TODO: Post new config
    toggleSaveModal();
}

function toggleAboutModal() {
    aboutModal.toggleAttribute('open');
}

function toggleResetModal() {
    resetModal.toggleAttribute('open');
}

function toggleSaveModal() {
    saveModal.toggleAttribute('open');
}