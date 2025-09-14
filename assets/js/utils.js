function debounce(func, delay = 200) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// function extractWidthsFromApiData(data, currentSensor) {
//     const scan = data[currentSensor]?.scan || 0;
//     const mask = data[currentSensor]?.mask || 0;
//     const decay = data[currentSensor]?.decay || 0;

//     const times = [scan, mask, decay];

//     const widths = times.map((time, i) => {
//         const prev = i === 0 ? 0 : times[i - 1];
//         return time - prev;
//     });

//     return {
//         scan: widths[0],
//         mask: widths[1],
//         decay: widths[2],
//         threshold: data[currentSensor]?.threshold || 0
//     };
// }

// function composeApiDataFromWidths(customElement) {
//     const scan = customElement.scan || 0;
//     const mask = (customElement.scan || 0) + (customElement.mask || 0);
//     const decay = mask + (customElement.decay || 0);
//     const threshold = customElement.threshold || 0;

//     return { scan, mask, decay, threshold };
// }


function fixedToFloat(rawValue, intBits, fracBits) {
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