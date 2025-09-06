class TimeBarChart extends HTMLElement {
  constructor() {
    super();
    this._name = this.getAttribute('name');
    this.svg = null;
    this.svgWidth = this.clientWidth;
    this.svgHeight = 300;
    this.bars = [];
    this.timeComponent = {};
    this.isResizing = false;
    this.targetIndex = -1;
    this.startX = 0;
    this.originalWidth = 0;
    this.decayCurve = document.querySelector('.curve');
    this.threshold = this.svgHeight;
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
    });

    this.debouncedDispatch = debounce(() => {
      this.dispatchEvent(new CustomEvent(this._name, {
        detail: {
          scan: this.scan,
          mask: this.mask,
          decay: this.decay
        },
        bubbles: true,
        composed: true
      }));
    }
    );

    const groups = Array.from(this.svg.querySelectorAll("g"));

    this.bars = groups.map((group) => {
      const name = group.dataset.name;
      const input = document.querySelector(`input[name="${name}"]`);
      const rect = group.querySelector("rect.bar");
      const handle = group.querySelector(".resize-handle");
      const text = group.querySelector("text");

      const minWidth = parseFloat(input.min) || 0;
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
          handle.setAttribute("x", width - 3); // Adjusted for thinner bars
          this.positionBars();
          this.updateDecayCurve(); // Update decay curve when bar width changes
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

        bar.input.addEventListener("focus", (e) => {
          bar.handle.classList.add('active-time-bar');
        });
        bar.input.addEventListener("blur", (e) => {
          bar.handle.classList.remove('active-time-bar');
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

    this.positionBars();
    this.updateDecayCurve();
    this.setupEvents();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
  }

  positionBars() {
    let currentX = 0;
    this.bars.forEach((bar) => {
      bar.group.setAttribute("transform", `translate(${currentX},0)`);
      bar.handle.setAttribute("x", bar.getWidth() - 3);
      currentX += bar.getWidth();
    });
  }

  setThreshold(value) {
    this.threshold = value;
    this.updateDecayCurve();
  }

  // Generate exponential decay curve points
  generateDecayCurve(startX, width, height) {
    const points = [];
    const numPoints = Math.max(20, Math.floor(width / 2)); // More points for smoother curve

    for (let i = 0; i <= numPoints; i++) {
      const x = startX + (i / numPoints) * width;
      // Exponential decay: y = height * e^(-k*x) where we want it to end at y=0
      // Using y = height * e^(-5 * (i/numPoints)) to reach near 0 at the end
      const t = i / numPoints;
      const y = height * Math.exp(-5 * t);
      points.push(`${x},${y}`);
    }

    return points;
  }

  // Update the decay curve path
  updateDecayCurve() {
    if (!this.decayCurve || this.bars.length === 0) return;

    const lastBar = this.bars[this.bars.length - 1];
    if (!lastBar) return;

    // Calculate starting position of last bar
    let startX = 0;
    for (let i = 0; i < this.bars.length - 1; i++) {
      startX += this.bars[i].getWidth();
    }

    const width = lastBar.getWidth();
    const height = this.svgHeight;

    // Generate path data for exponential decay
    const pathData = this.generateExponentialDecayPath(startX, width, height);
    this.decayCurve.setAttribute("d", pathData);
  }

  // Generate SVG path data for exponential decay
  generateExponentialDecayPath(startX, width) {
    if (width <= 0) return "";

    const numPoints = Math.max(20, Math.floor(width / 2));
    let pathData = `M ${startX},${0}`;

    const k = 3; // decay constant
    const maxThreshold = Number(this.svg.getAttribute('maxThreshold')) || 100;
    const maxNorm = Number(this.svg.getAttribute('normHeight')) || 2048;
    const normalizedThreshold = (Math.min(this.threshold, maxThreshold) / maxNorm) * this.svgHeight;

    const effectiveHeight = this.svgHeight - normalizedThreshold;
    const A = effectiveHeight / (1 - Math.exp(-k));

    for (let i = 1; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = startX + t * width;
      const y = A * (1 - Math.exp(-k * t));

      pathData += ` L ${x},${y}`;
    }

    return pathData;
  }

  setSvgWidth(newWidth) {
    this.svgWidth = newWidth;
    this.svg.setAttribute('width', this.svgWidth);

    const viewBoxValues = this.svg.getAttribute('viewBox').split(' ').map(Number);
    viewBoxValues[2] = this.svgWidth;
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
          bar.input.focus();
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isResizing = false;
      this.isDraggingThreshold = false;
    });
  }

  setData({ scan, mask, decay }) {
    this.scan = scan;
    this.mask = mask;
    this.decay = decay;
  }
}

customElements.define("time-bar-chart", TimeBarChart);