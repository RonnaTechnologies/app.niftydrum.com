class VerticalGauge extends HTMLElement {
    constructor() {
        super();
        this._value = parseFloat(this.getAttribute('value')) || 0;
        this._threshold = 50;
        this.dragging = false;

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    connectedCallback() {
        this.container = this.querySelector('.gauge-container');
        this.marker = this.querySelector('.threshold-marker');
        this.thresholdLabel = this.marker.querySelector('.threshold-label');
        this.valueText = this.querySelector('.value-text');

        this.marker.addEventListener('pointerdown', this.startDrag.bind(this));

        this.updateGauge();
        this.updateMarkerPosition();
        this.updateValueText();

        if (this.thresholdLabel) {
            this.thresholdLabel.style.opacity = '0';
        }
    }

    set value(val) {
        this._value = this._clamp(val);
        this.updateGauge();
        this.updateValueText();
    }

    get value() {
        return this._value;
    }

    set threshold(val) {
        this._threshold = this._clamp(val);
        this.updateMarkerPosition();
        this.updateThresholdLabel();
    }

    get threshold() {
        return this._threshold;
    }

    _clamp(val) {
        return Math.min(100, Math.max(0, val));
    }

    updateGauge() {
        const percent = this._value;
        this.container.style.background = `linear-gradient(to top, orange ${percent}%, transparent ${percent}%)`;
    }

    updateMarkerPosition() {
        const height = this.container.clientHeight;
        const y = height * (1 - this._threshold / 100);
        const markerHeight = this.marker.offsetHeight || 0;
        const translateY = height - markerHeight - (height - markerHeight) * (this.threshold / 100);
        this.marker.style.transform = `translateY(${translateY}px)`;
    }

    updateValueText() {
        if (this.valueText) {
            this.valueText.textContent = `${this._value.toFixed(0)}%`;
        }
    }

    updateThresholdLabel() {
        if (this.thresholdLabel) {
            this.thresholdLabel.textContent = `${this._threshold.toFixed(0)}%`;
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
        const newThreshold = 100 - (clampedY / rect.height) * 100;

        this.threshold = newThreshold;
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
