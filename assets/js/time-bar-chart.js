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
    this.liveCurve = document.querySelector('#live-curve');
    this.normHeight = Number(this.getAttribute('norm-height')) || 2048;
    this.liveValues = [];
    this.maxDuration = parseFloat(this.getAttribute('max-duration')) || 400;
  }

  connectedCallback() {
    this.svg = document.getElementById("timeline");

    this.svgHeight = this.svg.viewBox.baseVal.height || this.svg.clientHeight || 300;
    this.svg.setAttribute('viewBox', `0 0 ${this.maxDuration} ${this.svgHeight}`);
    this.svgWidth = this.svg.getBoundingClientRect().width || 600;
    this.svg.style.height = `${this.svgHeight}px`;

    this.resizeObserver = new ResizeObserver(() => {
      this.svgWidth = this.svg.getBoundingClientRect().width;
      if (this.liveValues) {
        this.setLiveCurve(this.liveValues);
      }
    });
    this.resizeObserver.observe(this.svg);

    this.debouncedDispatch = debounce(() => {
      const detail = this.bars.reduce((acc, bar) => {
        acc[bar.name] = bar.getWidth() / bar.xScale;
        return acc;
      }, {});
    
      this.dispatchEvent(new CustomEvent(this._name, {
        detail,
        bubbles: true,
        composed: true
      }));
    });

    const groups = Array.from(this.svg.querySelectorAll("g"));

    this.bars = groups.map((group) => {
      const name = group.dataset.name;
      const input = document.querySelector(`input[name="${name}"]`);
      const rect = group.querySelector("rect.bar");
      const handle = group.querySelector(".resize-handle");
      const text = group.querySelector("text");
      const xScale = Number(group.dataset.scale) || 1;

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
        xScale,

        getWidth: () => parseFloat(rect.getAttribute("width")),

        setWidth: (newWidth) => {
          const othersWidth = this.bars.reduce(
            (sum, b) => (b === bar ? sum : sum + b.getWidth()),
            0
          );
          const maxAllowed = Math.min(bar.maxWidth, this.svgWidth - othersWidth);
          const width = Math.max(bar.minWidth, Math.min(maxAllowed, newWidth));
          rect.setAttribute("width", width * xScale);
          handle.setAttribute("x", width - 3);
          this.positionBars();
          this.updateDecayCurve();
          return width;
        },
      };

      if (bar.input) {
        bar.input.value = bar.getWidth().toFixed(1);

        bar.input.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            bar.setWidth(val);
          }
        });

        bar.input.addEventListener("change", () => {
          this.debouncedDispatch();
        });

        bar.input.addEventListener("focus", () => {
          bar.handle.classList.add('active-time-bar');
        });

        bar.input.addEventListener("blur", () => {
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

  generateDecayCurve(startX, width, height) {
    const points = [];
    const numPoints = Math.max(20, Math.floor(width / 2));
    for (let i = 0; i <= numPoints; i++) {
      const x = startX + (i / numPoints) * width;
      const t = i / numPoints;
      const y = height * Math.exp(-5 * t);
      points.push(`${x},${y}`);
    }
    return points;
  }

  updateDecayCurve() {
    if (!this.decayCurve || this.bars.length === 0) return;
    const lastBar = this.bars[this.bars.length - 1];
    if (!lastBar) return;

    let startX = 0;
    for (let i = 0; i < this.bars.length - 1; i++) {
      startX += this.bars[i].getWidth();
    }

    const width = lastBar.getWidth();
    const height = this.svgHeight;
    const pathData = this.generateExponentialDecayPath(startX, width, height);
    this.decayCurve.setAttribute("d", pathData);
  }

  generateExponentialDecayPath(startX, width) {
    if (width <= 0) return "";
    const numPoints = Math.max(20, Math.floor(width / 2));
    let pathData = `M ${startX},${0}`;
    const k = 3;
    const maxThreshold = Number(this.svg.getAttribute('max-threshold')) || 100;
    const normalizedThreshold = (Math.min(this.threshold, maxThreshold) / this.normHeight) * this.svgHeight;
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
        const bar = this.bars[this.targetIndex];
        const xScale = Number(bar.group.dataset.scale) || 1;
    
        const dxPixels = e.clientX - this.startX;
        const ratio = this.svgWidth / this.maxDuration;

        const dxLogical = dxPixels / ratio;
    
        const newWidth = this.originalWidth / xScale + dxLogical / xScale;
        const appliedWidth = bar.setWidth(newWidth);
    
        if (bar.input) {
          bar.input.value = appliedWidth.toFixed(1);
          bar.input.focus();
          this.debouncedDispatch()
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isResizing = false;
      this.isDraggingThreshold = false;
    });
  }

  generatePathFromPoints(values) {
    const stepX =  this.svgWidth / (values.length - 1);
  
    const points = values.map((val, i) => {
      const x = i * stepX;
      const y = (1 - val / this.normHeight) *  this.svgHeight;
      return [x, y];
    });
  
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]},${points[i][1]}`;
    }
  
    return d;
  }
  

  setLiveCurve(values) {
    if (!values.length > 0) return;
    this.liveValues = values;
  
    const numPoints = values.length;
    const effectiveWidth = (numPoints / this.maxDuration) * this.maxDuration;
    const startX = 0;
    const stepX = effectiveWidth / (numPoints - 1);
  
    const points = values.map((val, i) => {
      const x = startX + i * stepX;
      const y = this.svgHeight - (val / this.normHeight) * this.svgHeight;
      return [x, y];
    });
  
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]},${points[i][1]}`;
    }
  
    this.liveCurve.setAttribute("d", d);
  }

  setData({ scan, mask, decay }) {
    this.scan = scan;
    this.mask = mask;
    this.decay = decay;
  }
}

customElements.define("time-bar-chart", TimeBarChart);