class VerticalGauge extends HTMLElement {
    static get observedAttributes() {
        return ['max'];
    }

    constructor() {
        super();
        this._value = 0;
        this._threshold = 0;
        this._max = parseFloat(this.getAttribute('max')) || 100;
        this.dragging = false;

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    connectedCallback() {
        this.container = this.querySelector('.gauge-container');
        this.marker = this.querySelector('.threshold-marker');
        this.thresholdLabel = this.marker?.querySelector('.threshold-label');
        this.valueText = this.querySelector('.value-text');

        this.marker?.addEventListener('pointerdown', this.startDrag.bind(this));

        this.updateGauge();
        this.updateMarkerPosition();
        this.updateValueText();

        if (this.thresholdLabel) {
            this.thresholdLabel.style.opacity = '0';
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'max') {
            const newMax = parseFloat(newValue);
            if (!isNaN(newMax) && newMax > 0) {
                this._max = newMax;
                this.value = this._value;
                this.threshold = this._threshold;
                this.updateGauge();
                this.updateMarkerPosition();
                this.updateValueText();
            }
        }
    }

    set value(val) {
        this._value = this._clampToMax(val);
        this.updateGauge();
        this.updateValueText();
    }

    get value() {
        return this._value;
    }

    set threshold(val) {
        this._threshold = this._clampToMax(val);
        this.updateMarkerPosition();
        this.updateThresholdLabel();
    }

    get threshold() {
        return this._threshold;
    }

    set max(val) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            this.setAttribute('max', parsed);
        }
    }

    get max() {
        return this._max;
    }

    _clampToMax(val) {
        return Math.min(this._max, Math.max(0, val));
    }

    updateGauge() {
        const percent = (this._value / this._max) * 100;
        this.container.style.background = `linear-gradient(to top, orange ${percent}%, transparent ${percent}%)`;
    }

    updateMarkerPosition() {
        const height = this.container.clientHeight;
        const markerHeight = this.marker?.offsetHeight || 0;

        const ratio = 1 - (this._threshold / this._max);
        const translateY = ratio * (height - markerHeight);

        this.marker.style.transform = `translateY(${translateY}px)`;
    }

    updateValueText() {
        if (this.valueText) {
            this.valueText.textContent = `${this._value.toFixed(2)} / ${this._max}`;
        }
    }

    updateThresholdLabel() {
        if (this.thresholdLabel) {
            this.thresholdLabel.textContent = `${this._threshold.toFixed(2)}`;
        }
    }

    startDrag(e) {
        e.preventDefault();
        this.dragging = true;

        if (this.thresholdLabel) {
            this.thresholdLabel.style.opacity = '1';
        }

        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerMove(e) {
        const rect = this.container.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const clampedY = Math.min(rect.height, Math.max(0, offsetY));
        const ratio = 1 - (clampedY / rect.height);

        this.threshold = ratio * this._max;
    }

    onPointerUp() {
        this.dragging = false;

        if (this.thresholdLabel) {
            this.thresholdLabel.style.opacity = '0';
        }

        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }
}

customElements.define('vertical-gauge', VerticalGauge);
