const sensorsSelect = document.querySelector("#sensors-select");
const defaultContainer = document.querySelector('#default-mode');
const hhcContainer = document.querySelector('#hhc-mode');
let currentSensor = sensorsSelect.value;
let data = null;

// Components
const bezierCurve = document.querySelector('bezier-curve');
const gain = document.querySelector('vertical-gauge');
const timeControl = document.querySelector('times-control');
const midiNote = document.querySelector('#midi-note')

const getConfig = async () => {
    const response = await fetch('/get_all');
    data = await response.json();
    updateSensorData();
}

getConfig();

// Event handling
gain.addEventListener('gain', () => {
    fetch(`set/${currentSensor}/gain/${Math.floor(gain.threshold)}`)
});

bezierCurve.addEventListener('curve', (e) => {
    fetch(`set/${currentSensor}/curve/${encodeURIComponent(JSON.stringify(e.detail.curve))}`)
})

sensorsSelect.addEventListener("change", (e) => {
    currentSensor = e.target.value;
    getConfig()
    updateSensorData()
})

// Update sensor with current data
const updateSensorData = () => {
    if (!data[currentSensor]) return null;

    if (currentSensor === "hhc") {
        setHhcMode();
        // update hcc/hcc_trigg data
        return;
    }

    setDefaultMode();
    midiNote.value = data[currentSensor].note;
    bezierCurve.values = data[currentSensor]?.curve?.p;
    gain.threshold = data[currentSensor].gain;
    timeControl.scan = data[currentSensor]?.scan;
    timeControl.mask = data[currentSensor]?.mask;
    timeControl.decay = data[currentSensor]?.decay;
    timeControl.threshold = data[currentSensor]?.threshold;
}

function setDefaultMode() {
    defaultContainer.toggleAttribute('disabled', false);
    hhcContainer.toggleAttribute('disabled', true);
}

function setHhcMode() {
    defaultContainer.toggleAttribute('disabled', true);
    hhcContainer.toggleAttribute('disabled', false);
}

// let data = {}

// const make_proxy = (obj) =>
// {
//     // Check if the input is an object and not null
//     if (obj !== null && typeof obj === 'object')
//     {
//         // If it's an array, map over its elements and apply make_proxy
//         if (Array.isArray(obj))
//         {
//             return obj.map(make_proxy)
//         }

//         // Create a Proxy for the object
//         return new Proxy(obj, {
//             async set(target, prop, value)
//             {
//                 // If the value is an object or an array, recursively wrap it in a Proxy
//                 if (value !== null && typeof value === 'object')
//                 {
//                     value = make_proxy(value)
//                 }
//                 target[prop] = value
//                 try
//                 {
//                     const resp = await fetch(`./set/${target.name}/${prop}/${value}`)
//                     const ret = await resp.text()
//                     console.log(`ret = ${ret}`)

//                 } catch (err)
//                 {
//                     //alert(err);
//                 }
//                 return true
//             },
//             get(target, prop)
//             {
//                 // If the property is an object or an array, wrap it in a Proxy
//                 const value = target[prop]
//                 if (value !== null && typeof value === 'object')
//                 {
//                     value["name"] = prop
//                     return make_proxy(value)
//                 }
//                 return value
//             }
//         })
//     }
//     return obj // Return the original value if it's not an object or array
// }


// const update_form = d =>
// {
//     Object.keys(d).forEach(item =>
//     {
//         Object.entries(d[item]).forEach(([setting, value]) =>
//         {
//             const slider = document.querySelector(`#${item} + div > kiwi-slider[id*="${setting.split('_')[0]}"]`);
//             const note = document.querySelector(`#${item} + div > label[id*="${setting.split('_')[0]}"] input`);

//             slider && slider?.setAttribute('default', value);
//             note && note?.setAttribute('value', value);
//         });
//     });
// }

// // get all
// const get_all = () =>
// {
//     fetch("/get_all")
//         .then(r => r.json()).then(d =>
//         {
//             console.log(d)
//             data = make_proxy(d)
//             update_form(data)
//         })
// }

// const update_param = (pad, param, value) =>
// {
//     data[pad][param] = value
// }

// function updatePadsValue(data)
// {
//     Object.keys(data.instruments).forEach(item =>
//     {
//         Object.entries(data.instruments[item]).forEach(([setting, value]) =>
//         {
//             const slider = document.querySelector(`#${item} + div > kiwi-slider[id*="${setting.split('_')[0]}"]`);
//             const note = document.querySelector(`#${item} + div > label[id*="${setting.split('_')[0]}"] input`);

//             slider && slider?.setAttribute('default', value);
//             note && note?.setAttribute('value', value);
//         });
//     });
// };

// window.addEventListener('click', (event) =>
// {
//     const element = event.target;

//     if (element.closest('[id="about-modal"]') || element.closest('[data-target="about-modal"]'))
//     {
//         element.nodeName === 'BUTTON' || element.nodeName === 'DIALOG' ?
//             document.querySelector('#about-modal').toggleAttribute('open') : null;
//     }
// });

// get_all()