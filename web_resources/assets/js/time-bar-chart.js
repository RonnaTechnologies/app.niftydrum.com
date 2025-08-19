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
  }

  connectedCallback() {
    this.svg = document.getElementById("timeline");
    this.setSvgWidth(this.svgWidth);
    window.addEventListener('resize', this.setSvgWidth(this.svgWidth));

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
          bar.setText();
          this.positionBars();
        },

        setText: () => {
          if (bar.input) {
            bar.input.value = bar.getWidth().toFixed(1);
          }
        }
      };

      if (bar.input) {
        bar.input.value = bar.getWidth().toFixed(1);

        bar.input.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            bar.setWidth(val);
          }
        });
      }

      return bar;
    });

    // Make timeComponent externally accessible
    this.bars.forEach((bar) => {
      Object.defineProperty(this.timeComponent, bar.name, {
        get: () => bar.getWidth(),
        set: (val) => bar.setWidth(val),
        enumerable: true
      });
    });

    this.initThresholdInput();
    this.positionBars();
    this.setupEvents();
  }

  positionBars() {
    let currentX = 0;
    this.bars.forEach((bar) => {
      bar.group.setAttribute("transform", `translate(${currentX},0)`);
      bar.handle.setAttribute("x", bar.getWidth() - 5);
      bar.setText(); // Updates input value
      currentX += bar.getWidth();
    });
  }

  initThresholdInput() {
    if (!this.thresholdLine || !this.thresholdInput) return;

    // Initial sync: set input to match line position
    const y = parseFloat(this.thresholdLine.getAttribute("y1"));
    const perc = ((this.svgHeight - y) / this.svgHeight) * 100;
    this.thresholdInput.value = perc.toFixed(1);
    this.thresholdInput.min = 0;
    this.thresholdInput.max = 100;

    // Input to line
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
    this.svg.setAttribute('width', this.svgWidth);
    const viewBoxValues = this.svg.getAttribute('viewBox').split(' ').map(Number);
    viewBoxValues[2] = newWidth;
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
        const dx = e.clientX - this.startX;
        this.bars[this.targetIndex].setWidth(this.originalWidth + dx);
      } else if (this.isDraggingThreshold) {
        const dy = e.clientY - this.startY;
        let newY = this.thresholdInitValue + dy;
        newY = Math.min(this.svgHeight, Math.max(0, newY));
        this.thresholdLine.setAttribute("y1", newY);
        this.thresholdLine.setAttribute("y2", newY);

        // Update threshold input
        const percFromBottom = ((this.svgHeight - newY) / this.svgHeight) * 100;
        if (this.thresholdInput) {
          this.thresholdInput.value = percFromBottom.toFixed(1);
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this.isResizing = false;
      this.isDraggingThreshold = false;
    });
  }
}

customElements.define("time-bar-chart", TimeBarChart);
