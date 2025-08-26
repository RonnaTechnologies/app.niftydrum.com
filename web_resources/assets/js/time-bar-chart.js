class TimeBarChart extends HTMLElement {
  constructor() {
    super();
    this.svg = null;
    this.svgWidth = this.clientWidth;
    this.svgHeight = 300;
    this.bars = [];
    this.timeComponent = {};
    this.isResizing = false;
    this.targetIndex = -1;
    this.startX = 0;
    this.originalWidth = 0;

    this.thresholdLine = null;
    this.thresholdInput = null;
    this.isDraggingThreshold = false;
    this.startY = 0;
    this.thresholdInitValue = 200;
    this._lastDispatched = {
      scan: null,
      mask: null,
      decay: null,
      threshold: null
    };
  }

  connectedCallback() {
    this.svg = document.getElementById("timeline");
    this.maxDuration = parseFloat(this.getAttribute('maxDuration')) || 600;

    this.svgHeight = this.svg.viewBox.baseVal.height || this.svg.clientHeight || 300;
    this.svg.setAttribute('viewBox', `0 0 ${this.maxDuration} ${this.svgHeight}`);

    this.svgWidth = this.clientWidth || 600;
    this.svg.style.width = "100%";
    this.svg.style.height = `${this.svgHeight}px`;

    this.resizeObserver = new ResizeObserver(() => {
      this.svgWidth = this.clientWidth || 600;
    })

    this.debouncedDispatch = debounce(() => {
      const current = {
        scan: this.scan,
        mask: this.mask,
        decay: this.decay,
        threshold: this.threshold
      };
    
      const changes = {};
      let hasChanged = false;
    
      for (const key in current) {
        if (current[key] !== this._lastDispatched[key]) {
          changes[key] = current[key];
          hasChanged = true;
        }
      }
    
      if (hasChanged) {
        this.dispatchEvent(new CustomEvent('change', {
          detail: changes,
          bubbles: true,
          composed: true
        }));

        Object.assign(this._lastDispatched, changes);
      }
    });

    this.thresholdLine = document.getElementById("threshold-line");
    this.thresholdInput = document.querySelector('input[name="threshold"]');

    const groups = Array.from(this.svg.querySelectorAll("g"));

    this.bars = groups.map((group) => {
      const name = group.dataset.name;
      const input = document.querySelector(`input[name="${name}"]`);
      const rect = group.querySelector("rect.bar");
      const handle = group.querySelector(".resize-handle");
      const text = group.querySelector("text");
      const minWidth = input.min || 0;
      const maxWidth = input.max || this.svgWidth;

      const bar = {
        name,
        group,
        rect,
        handle,
        text,
        minWidth,
        maxWidth,
        input,

        getWidth: () => parseFloat(rect.getAttribute("width")),

        setWidth: (newWidth) => {
          const othersWidth = this.bars.reduce(
            (sum, b) => (b === bar ? sum : sum + b.getWidth()),
            0
          );
          const maxAllowed = Math.min(bar.maxWidth, this.svgWidth - othersWidth);
          const width = Math.max(bar.minWidth, Math.min(maxAllowed, newWidth));
          rect.setAttribute("width", width);
          handle.setAttribute("x", width - 5);
          this.positionBars();
          this.debouncedDispatch();
          return width;
        },
      };

      if (bar.input) {
        bar.input.value = bar.getWidth().toFixed(1);

        bar.input.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            bar.setWidth(val);
            this.debouncedDispatch();
          }
        });
      }

      return bar;
    });

    this.bars.forEach((bar) => {
      Object.defineProperty(this, bar.name, {
        get: () => bar.getWidth(),
        set: (val) => {
          const appliedWidth = bar.setWidth(val);
          if (bar.input) {
            bar.input.value = appliedWidth.toFixed(1);
          }
        },
        enumerable: true,
      });
    });

    Object.defineProperty(this, 'threshold', {
      get: () => {
        if (!this.thresholdLine) return null;
        const y = parseFloat(this.thresholdLine.getAttribute("y1"));
        return ((this.svgHeight - y) / this.svgHeight) * 100;
      },
      set: (val) => {
        if (!this.thresholdLine) return;
        const clamped = Math.max(0, Math.min(100, val));
        const newY = this.svgHeight - (clamped / 100) * this.svgHeight;
        this.thresholdLine.setAttribute("y1", newY);
        this.thresholdLine.setAttribute("y2", newY);
    
        if (this.thresholdInput) {
          this.thresholdInput.value = clamped.toFixed(1);
        }
        this.debouncedDispatch();
      },
      enumerable: true
    });

    this.initThresholdInput();
    this.positionBars();
    this.setupEvents();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
  }

  positionBars() {
    let currentX = 0;
    this.bars.forEach((bar) => {
      bar.group.setAttribute("transform", `translate(${currentX},0)`);
      bar.handle.setAttribute("x", bar.getWidth() - 5);
      currentX += bar.getWidth();
    });
  }

  initThresholdInput() {
    if (!this.thresholdLine || !this.thresholdInput) return;

    const y = parseFloat(this.thresholdLine.getAttribute("y1"));
    const perc = ((this.svgHeight - y) / this.svgHeight) * 100;
    this.thresholdInput.value = perc.toFixed(1);
    this.thresholdInput.min = 0;
    this.thresholdInput.max = 100;

    this.thresholdInput.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (isNaN(val)) return;
      const clamped = Math.max(0, Math.min(100, val));
      const newY = this.svgHeight - (clamped / 100) * this.svgHeight;
      this.thresholdLine.setAttribute("y1", newY);
      this.thresholdLine.setAttribute("y2", newY);
    });
  }

  setSvgWidth(newWidth) {
    this.svgWidth = newWidth;
    this.svg.setAttribute('width', this.svgWidth);
  
    const viewBoxValues = this.svg.getAttribute('viewBox').split(' ').map(Number);
    viewBoxValues[2] = this.svgWidth; // fixe largeur viewBox
    this.svg.setAttribute('viewBox', viewBoxValues.join(' '));
  }

  setupEvents() {
    this.svg.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("resize-handle")) {
        const group = e.target.closest("g");
        this.targetIndex = this.bars.findIndex((b) => b.group === group);
        this.originalWidth = this.bars[this.targetIndex].getWidth();
        this.startX = e.clientX;
        this.isResizing = true;
        e.preventDefault();
      }
    });

    this.thresholdLine.addEventListener("mousedown", (e) => {
      this.isDraggingThreshold = true;
      this.startY = e.clientY;
      this.thresholdInitValue = parseFloat(this.thresholdLine.getAttribute("y1"));
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isResizing) {
        const dxPixels = e.clientX - this.startX;
        const ratio = this.svgWidth / this.maxDuration;
        const dxLogical = dxPixels / ratio;
    
        const newWidth = this.originalWidth + dxLogical;
    
        const appliedWidth = this.bars[this.targetIndex].setWidth(newWidth);
    
        const bar = this.bars[this.targetIndex];
        if (bar.input) {
          bar.input.value = appliedWidth.toFixed(1);
        }
      } else if (this.isDraggingThreshold) {
        const dy = e.clientY - this.startY;
        let newY = this.thresholdInitValue + dy;
        newY = Math.min(this.svgHeight, Math.max(0, newY));
        this.thresholdLine.setAttribute("y1", newY);
        this.thresholdLine.setAttribute("y2", newY);
  
        const percFromBottom = ((this.svgHeight - newY) / this.svgHeight) * 100;
        if (this.thresholdInput) {
          this.thresholdInput.value = percFromBottom.toFixed(1);
        }
      }
      this.debouncedDispatch();
    });

    window.addEventListener("mouseup", () => {
      this.isResizing = false;
      this.isDraggingThreshold = false;
    });
  }
}

customElements.define("time-bar-chart", TimeBarChart);
