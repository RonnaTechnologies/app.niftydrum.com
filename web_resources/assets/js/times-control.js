class TimesControl extends HTMLElement {
  constructor() {
    super();
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.appendChild(this.canvas);

    this.dividers = {}; // { name: { min, max, gap, value, color } }
    this.drag = null;
    this.dragOffsetX = 0;

    this._thresholdY = 150;
    this._dragThreshold = false;
    this._dragOffsetY = 0;

    this._tooltip = document.createElement("div");
    Object.assign(this._tooltip.style, {
      position: "absolute",
      padding: "8px",
      background: "white",
      color: "black",
      borderRadius: "16px",
      fontSize: "12px",
      border: "2px solid var(--gauge-border-color, black)",
      pointerEvents: "none",
      transition: "opacity 0.15s",
      opacity: "0",
      whiteSpace: "nowrap",
      zIndex: "10",
    });
    this.style.position = "relative";
    this.appendChild(this._tooltip);

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._resize = this._resize.bind(this);
  }

  connectedCallback() {
    this._resize();
    window.addEventListener("resize", this._resize);

    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mouseup", this._onMouseUp);
    this.canvas.addEventListener("mouseleave", this._onMouseUp);

    this._parseDividers();
    this._draw();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resize);

    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mouseup", this._onMouseUp);
    this.canvas.removeEventListener("mouseleave", this._onMouseUp);
  }

  _parseDividers() {
    const reserved = new Set(["style", "class"]);

    this.dividers = {};

    for (const attr of this.getAttributeNames()) {
      if (reserved.has(attr)) continue;

      const val = this.getAttribute(attr);
      if (!val) continue;

      // Parse min,max,gap[,value][,color]
      let parts = val.split(",").map(s => s.trim());

      if (parts.length < 3) continue;

      let min = Number(parts[0]);
      let max = Number(parts[1]);
      let gap = Number(parts[2]);
      if ([min, max, gap].some(x => isNaN(x))) continue;

      let value = null;
      let color = null;

      if (parts.length === 4) {
        const val4 = parts[3];
        if (!isNaN(Number(val4))) {
          value = Number(val4);
        } else {
          color = val4;
        }
      } else if (parts.length >= 5) {
        value = Number(parts[3]);
        color = parts[4];
        if (isNaN(value)) {
          color = parts.slice(3).join(",");
          value = null;
        }
      }

      if (value === null || isNaN(value)) {
        value = Math.min(max, min + 100);
      }

      if (!color) {
        color = this._getRandomColorForName(attr);
      }

      // Enforce min > 0 for logarithmic scale to work (log(0) undefined)
      if (min <= 0) min = 1;
      if (max <= min) max = min * 10;
      if (value < min) value = min;
      if (value > max) value = max;

      this.dividers[attr] = { min, max, gap, value, color };
    }

    // Dynamic getters/setters for values
    Object.keys(this.dividers).forEach(name => {
      if (!(name in this)) {
        Object.defineProperty(this, name, {
          get: () => this.dividers[name]?.value ?? null,
          set: val => {
            if (!this.dividers[name]) return;
            this.dividers[name].value = this._clampValue(name, val);
            this._draw();
          },
          configurable: true,
          enumerable: true,
        });
      }
    });

    this._clampAllValues();
  }

  _getRandomColorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  }

  _clampAllValues() {
    const sortedKeys = Object.keys(this.dividers).sort(
      (a, b) => this.dividers[a].min - this.dividers[b].min
    );

    sortedKeys.forEach((key, idx) => {
      this.dividers[key].value = this._clampValue(key, this.dividers[key].value, sortedKeys, idx);
    });
  }

  _clampValue(name, val, sortedKeys = null, idx = null) {
    if (!this.dividers[name]) return val;
    let { min, max, gap } = this.dividers[name];

    if (!sortedKeys) {
      sortedKeys = Object.keys(this.dividers).sort(
        (a, b) => this.dividers[a].min - this.dividers[b].min
      );
      idx = sortedKeys.indexOf(name);
    }

    const prevName = idx > 0 ? sortedKeys[idx - 1] : null;
    const nextName = idx < sortedKeys.length - 1 ? sortedKeys[idx + 1] : null;

    // Clamp based on previous and next divider values with gaps — all in value space (log scale values)
    if (prevName) {
      let prevVal = this.dividers[prevName].value;
      min = Math.max(min, prevVal + gap);
    }
    if (nextName) {
      let nextVal = this.dividers[nextName].value;
      max = Math.min(max, nextVal - gap);
    }

    return Math.min(Math.max(val, min), max);
  }

  getDividerConfig(name) {
    return this.dividers[name] ? { ...this.dividers[name] } : null;
  }

  setDividerConfig(name, { min, max, gap, value, color }) {
    if (!this.dividers[name]) return;
    if (min !== undefined) this.dividers[name].min = min;
    if (max !== undefined) this.dividers[name].max = max;
    if (gap !== undefined) this.dividers[name].gap = gap;
    if (value !== undefined) this.dividers[name].value = this._clampValue(name, value);
    if (color !== undefined) this.dividers[name].color = color;
    this._draw();
  }

  get threshold() {
    return this._thresholdVal ?? 0;
  }

  set threshold(val) {
    // Clamp threshold value between min and max of vertical axis (to be used in drawing)
    // We assume vertical scale min=0, max=canvas.height for now (adjust if needed)
    const minV = 0;
    const maxV = this.canvas.height;
    this._thresholdVal = Math.min(Math.max(val, minV), maxV);
    this._draw();
  }

  _resize() {
    const style = getComputedStyle(this);
    this.canvas.width = parseInt(style.width) || 500;
    this.canvas.height = parseInt(style.height) || 300;

    Object.values(this.dividers).forEach(cfg => {
      if (cfg.max > this.canvas.width) cfg.max = this.canvas.width;
      cfg.value = this._clampValue(cfg.name, cfg.value);
    });

    this._draw();
  }

  // Convert value in [min, max] log scale to pixel X [0, width]
  _valueToX(val) {
    if (!val) return 0;
    // Find global min/max from all dividers to scale properly
    let minGlobal = Infinity;
    let maxGlobal = -Infinity;
    Object.values(this.dividers).forEach(({ min, max }) => {
      if (min < minGlobal) minGlobal = min;
      if (max > maxGlobal) maxGlobal = max;
    });

    // If no valid min/max, fallback
    if (minGlobal <= 0) minGlobal = 1;
    if (maxGlobal <= minGlobal) maxGlobal = minGlobal * 10;

    const width = this.canvas.width;

    // Logarithmic scale mapping
    const logMin = Math.log10(minGlobal);
    const logMax = Math.log10(maxGlobal);
    const logVal = Math.log10(val);

    const ratio = (logVal - logMin) / (logMax - logMin);
    return ratio * width;
  }

  // Convert pixel X [0,width] to value in [minGlobal,maxGlobal] log scale
  _xToValue(x) {
    let minGlobal = Infinity;
    let maxGlobal = -Infinity;
    Object.values(this.dividers).forEach(({ min, max }) => {
      if (min < minGlobal) minGlobal = min;
      if (max > maxGlobal) maxGlobal = max;
    });

    if (minGlobal <= 0) minGlobal = 1;
    if (maxGlobal <= minGlobal) maxGlobal = minGlobal * 10;

    const width = this.canvas.width;
    x = Math.min(Math.max(x, 0), width);

    const logMin = Math.log10(minGlobal);
    const logMax = Math.log10(maxGlobal);

    const ratio = x / width;
    const logVal = logMin + ratio * (logMax - logMin);
    return Math.pow(10, logVal);
  }

  // Vertical threshold position: threshold value in [minV, maxV] mapped inverted on vertical axis (minV = bottom, maxV = top)
  _thresholdValToY(val) {
    const height = this.canvas.height;
    const minV = 0;
    const maxV = height;
    val = Math.min(Math.max(val, minV), maxV);
    // Invert vertical position:
    // threshold = minV → bottom (height)
    // threshold = maxV → top (0)
    return height - ((val - minV) / (maxV - minV)) * height;
  }

  _draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Sort dividers by current value
    const sortedDividers = Object.entries(this.dividers)
      .map(([name, cfg]) => ({ name, ...cfg }))
      .sort((a, b) => a.value - b.value);

    // Draw alternating background stripes between dividers with their color
    let lastX = 0;
    sortedDividers.forEach(({ value, color }) => {
      const x = this._valueToX(value);
      ctx.fillStyle = color;
      ctx.fillRect(lastX, 0, x - lastX, height);
      lastX = x;
    });

    // Last stripe till end, alternate color
    ctx.fillStyle = sortedDividers.length
      ? this._shadeColor(sortedDividers[sortedDividers.length - 1].color, 0.5)
      : "#eee";
    ctx.fillRect(lastX, 0, width - lastX, height);

    // Draw divider lines - dashed black lines at logarithmic X
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.setLineDash([5, 5]);
    sortedDividers.forEach(({ value }) => {
      const x = this._valueToX(value);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw threshold line - solid red horizontal line (inverted vertical)
    const thresholdY = this._thresholdValToY(this._thresholdVal ?? 0);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();

    if (!this.drag && !this._dragThreshold) {
      this._tooltip.style.opacity = "0";
    }
  }

  _shadeColor(color, percent) {
    if (!color || !color.startsWith("#") || (color.length !== 7 && color.length !== 4)) return color;

    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    }

    r = Math.min(255, Math.floor(r + (255 - r) * percent));
    g = Math.min(255, Math.floor(g + (255 - g) * percent));
    b = Math.min(255, Math.floor(b + (255 - b) * percent));

    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  _onMouseDown(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    // Check if clicking near threshold line (within 6px vertical)
    const thresholdY = this._thresholdValToY(this._thresholdVal ?? 0);
    if (Math.abs(mouseY - thresholdY) < 6) {
      this._dragThreshold = true;
      this.drag = null;
      this._dragOffsetY = mouseY - thresholdY;
      this.style.cursor = "grabbing";
      this._tooltip.style.opacity = "1";
      this._updateTooltip(mouseX, mouseY, `Threshold`);
      return;
    }

    // Check if clicking near any divider line (within 6px horizontally)
    for (const [name, cfg] of Object.entries(this.dividers)) {
      const x = this._valueToX(cfg.value);
      if (Math.abs(mouseX - x) < 6) {
        this.drag = name;
        this._dragOffsetX = mouseX - x;
        this._dragThreshold = false;
        this.style.cursor = "grabbing";
        this._updateTooltip(mouseX, mouseY, name);
        return;
      }
    }

    this.drag = null;
    this._dragThreshold = false;
    this.style.cursor = "default";
    this._tooltip.style.opacity = "0";
  }

  _onMouseMove(event) {
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    if (this.drag) {
      // Convert pixel X back to value on log scale
      let newVal = this._xToValue(mouseX - this._dragOffsetX);

      // Clamp new value to avoid overlap
      newVal = this._clampValue(this.drag, newVal);

      this.dividers[this.drag].value = newVal;

      this._draw();
      this._updateTooltip(mouseX, mouseY, `${this.drag}: ${newVal.toFixed(2)}`);
      this.style.cursor = "grabbing";
    } else if (this._dragThreshold) {
      // Update threshold vertical value inverted
      const height = this.canvas.height;
      let newVal = height - (mouseY - this._dragOffsetY);
      newVal = Math.min(Math.max(newVal, 0), height);
      this._thresholdVal = newVal;
      this._draw();
      this._updateTooltip(mouseX, mouseY, `Threshold: ${newVal.toFixed(0)}`);
      this.style.cursor = "grabbing";
    } else {
      // Update cursor and tooltip on hover near dividers or threshold

      let hoverName = null;
      for (const [name, cfg] of Object.entries(this.dividers)) {
        const x = this._valueToX(cfg.value);
        if (Math.abs(mouseX - x) < 6) {
          hoverName = name;
          break;
        }
      }

      const thresholdY = this._thresholdValToY(this._thresholdVal ?? 0);
      if (Math.abs(mouseY - thresholdY) < 6) {
        hoverName = "threshold";
      }

      if (hoverName === "threshold") {
        this.style.cursor = "grab";
        this._updateTooltip(mouseX, mouseY, "Threshold");
        this._tooltip.style.opacity = "1";
      } else if (hoverName) {
        this.style.cursor = "grab";
        this._updateTooltip(mouseX, mouseY, hoverName);
        this._tooltip.style.opacity = "1";
      } else {
        this.style.cursor = "default";
        this._tooltip.style.opacity = "0";
      }
    }
  }

  _onMouseUp(event) {
    this.drag = null;
    this._dragThreshold = false;
    this.style.cursor = "default";
    this._tooltip.style.opacity = "0";
  }

  _updateTooltip(x, y, text) {
    this._tooltip.textContent = text;
    this._tooltip.style.left = `${x + 10}px`;
    this._tooltip.style.top = `${y + 10}px`;
    this._tooltip.style.opacity = "1";
  }
}

customElements.define("times-control", TimesControl);
