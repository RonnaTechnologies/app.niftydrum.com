class RangeSlider extends HTMLElement
{
    constructor()
    {
        super();
        this._name = this.getAttribute('name');
        this._displayInt = this.hasAttribute('integer');
        this._value = 0.1;
        this._max = parseFloat(this.getAttribute('max')) || 1;
        this._min = parseFloat(this.getAttribute('min')) || 0;
        this._marker = this._min || 0;
        this.dragging = false;

        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.debouncedDispatch = debounce(() =>
        {
            this.dispatchEvent(new CustomEvent(this._name, {
                detail: { threshold: this._marker },
                bubbles: true,
                composed: true
            }));
        });

    }

    connectedCallback()
    {
        this.container = this.querySelector('.slider-container');
        this.marker = this.querySelector('.marker');
        this.label = this.marker?.querySelector('.label');

        this.marker?.addEventListener('pointerdown', this.startDrag.bind(this));

        this.updateValue();
        this.updateMarker();
        this.resizeObserver = new ResizeObserver(() =>
        {
            this.updateMarker();
        });
        this.resizeObserver.observe(this.container);
    }

    disconnectedCallback()
    {
        this.resizeObserver?.disconnect();
    }

    set value(val)
    {
        this._value = this._clampToMax(val);
        this.updateValue();
    }

    set threshold(val)
    {
        this._marker = this._clampToMax(val);
        this.updateMarker();
        this.updateLabel();
    }

    get threshold()
    {
        return this._marker;
    }

    _clampToMax(val)
    {
        return Math.min(this._max, Math.max(this._min, val));
    }

    updateValue()
    {
        const range = this._max - this._min;
        const normalizedValue = (this._value - this._min) / range;
        const percent = normalizedValue * 100;

        this.container.style.background = `linear-gradient(to top, orange ${Math.max(0.01, percent)}%, transparent ${percent}%)`;
    }

    updateMarker()
    {
        const height = this.container.clientHeight;
        const markerHeight = this.marker?.offsetHeight || 0;

        const range = this._max - this._min;
        const normalizedMarker = (this._marker - this._min) / range;
        const ratio = 1 - normalizedMarker;
        const translateY = ratio * (height - markerHeight);

        this.marker.style.transform = `translateY(${translateY}px)`;
    }

    updateLabel()
    {
        if (this.label)
        {
            const value = this._displayInt ? Math.round(this._marker) : Number(this._marker.toFixed(2));
            this.label.textContent = value.toString();
        }
    }

    startDrag(e)
    {
        e.preventDefault();
        this.dragging = true;

        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerMove(e)
    {
        const rect = this.container.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const clampedY = Math.min(rect.height, Math.max(0, offsetY));
        const ratio = 1 - (clampedY / rect.height);

        const oldThreshold = this.threshold;
        this.threshold = this._min + (ratio * (this._max - this._min));

        if (oldThreshold === this.threshold) return;
        this.debouncedDispatch()
    }

    onPointerUp()
    {
        this.dragging = false;

        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }
}

customElements.define('range-slider', RangeSlider);
