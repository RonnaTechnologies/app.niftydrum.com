function debounce(func, delay=200) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

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