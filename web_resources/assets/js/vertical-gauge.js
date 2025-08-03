class VerticalGauge extends HTMLElement {
    constructor() {
        super();
        this._value = 0;
        this._marker = 0;
        this._max = parseFloat(this.getAttribute('max')) || 100;
        this.dragging = false;

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.debouncedDispatch = debounce(() => {
            this.dispatchEvent(new CustomEvent('gain', {
                detail: { threshold: this._marker },
                bubbles: true,
                composed: true
            }));
        });
    }

    connectedCallback() {
        this.container = this.querySelector('.gauge-container');
        this.marker = this.querySelector('.marker');
        this.label = this.marker?.querySelector('.label');

        this.marker?.addEventListener('pointerdown', this.startDrag.bind(this));

        this.updateValue();
        this.updateMarker();

        if (this.label) {
            this.label.style.opacity = '0';
        }
    }

    set value(val) {
        this._value = this._clampToMax(val);
        this.updateValue();
    }

    set threshold(val) {
        this._marker = this._clampToMax(val);
        this.updateMarker();
        this.updatelabel();
    }

    get threshold() {
        return this._marker;
    }

    _clampToMax(val) {
        return Math.min(this._max, Math.max(0, val));
    }

    updateValue() {
        const percent = (this._value / this._max) * 100;
        this.container.style.background = `linear-gradient(to top, orange ${percent}%, transparent ${percent}%)`;
    }

    updateMarker() {
        const height = this.container.clientHeight;
        const markerHeight = this.marker?.offsetHeight || 0;

        const ratio = 1 - (this._marker / this._max);
        const translateY = ratio * (height - markerHeight);

        this.marker.style.transform = `translateY(${translateY}px)`;
    }

    updatelabel() {
        if (this.label) {
            this.label.textContent = `${this._marker.toFixed(2)}`;
        }
    }

    startDrag(e) {
        e.preventDefault();
        this.dragging = true;

        if (this.label) {
            this.label.style.opacity = '1';
        }

        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerMove(e) {
        const rect = this.container.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const clampedY = Math.min(rect.height, Math.max(0, offsetY));
        const ratio = 1 - (clampedY / rect.height);

        const oldThreshold = this.threshold;
        this.threshold = ratio * this._max;

        if (oldThreshold === this.threshold) return;
        this.debouncedDispatch()
    }

    onPointerUp() {
        this.dragging = false;

        if (this.label) {
            this.label.style.opacity = '0';
        }

        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }
}

customElements.define('vertical-gauge', VerticalGauge);
