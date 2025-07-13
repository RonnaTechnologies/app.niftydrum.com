class TimesControl extends HTMLElement {
  constructor() {
    super();
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.appendChild(this.canvas);

    this._data = [];
    this._divider1X = 100;
    this._divider2X = 300;
    this._thresholdY = 150;
    this.drag = null;

    this.MIN_DIVIDER1_X = 20;
    this.MAX_DIVIDER2_X = null;

    this.MIN_THRESHOLD_Y = 20;
    this.MAX_THRESHOLD_Y = null;

    // Création des infobulles
    this._tooltip = document.createElement("div");
    this._tooltip.style.position = "absolute";
    this._tooltip.style.padding = "8px";
    this._tooltip.style.background = "white";
    this._tooltip.style.color = "black";
    this._tooltip.style.borderRadius = "16px";
    this._tooltip.style.fontSize = "12px";
    this._tooltip.style.border = "2px solid var(--gauge-border-color)";

    this._tooltip.style.pointerEvents = "none";
    this._tooltip.style.transition = "opacity 0.15s";
    this._tooltip.style.opacity = "0";
    this._tooltip.style.whiteSpace = "nowrap";
    this._tooltip.style.zIndex = "10";
    this.style.position = "relative"; // Pour que position absolute fonctionne sur tooltip
    this.appendChild(this._tooltip);

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._resize = this._resize.bind(this);
  }

  connectedCallback() {
    this.classList.add("times-control");
    this._resize();
    window.addEventListener("resize", this._resize);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mouseup", this._onMouseUp);
    this.canvas.addEventListener("mouseleave", this._onMouseUp);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resize);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mouseup", this._onMouseUp);
    this.canvas.removeEventListener("mouseleave", this._onMouseUp);
  }

  get data() {
    return this._data;
  }

  set data(value) {
    try {
      this._data = Array.isArray(value) ? value : JSON.parse(value);
      this._draw();
    } catch {
      this._data = [];
    }
  }

  get divider1() {
    return this._divider1X;
  }

  set divider1(val) {
    this._divider1X = Number(val);
    this._draw();
  }

  get divider2() {
    return this._divider2X;
  }

  set divider2(val) {
    this._divider2X = Number(val);
    this._draw();
  }

  get threshold() {
    return this._thresholdY;
  }

  set threshold(val) {
    this._thresholdY = Number(val);
    this._draw();
  }

  _resize() {
    const style = getComputedStyle(this);
    this.canvas.width = parseInt(style.width);
    this.canvas.height = parseInt(style.height);
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.MAX_DIVIDER2_X = this.width - 20;
    this.MAX_THRESHOLD_Y = this.height - 20;

    this._draw();
  }

  _draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const xMin = 0, xMax = this.width;
    const yMin = 0, yMax = this.height;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xMin, yMin);
    ctx.lineTo(xMin, yMax);
    ctx.lineTo(xMax, yMax);
    ctx.stroke();

    let d1 = Math.min(Math.max(this._divider1X, xMin), xMax);
    let d2 = Math.min(Math.max(this._divider2X, xMin), xMax);
    if (d2 < d1) [d1, d2] = [d2, d1];

    ctx.fillStyle = "#FFDDC1";
    ctx.fillRect(xMin, yMin, d1 - xMin, yMax - yMin);
    ctx.fillStyle = "#C1E1FF";
    ctx.fillRect(d1, yMin, d2 - d1, yMax - yMin);
    ctx.fillStyle = "#C1FFC1";
    ctx.fillRect(d2, yMin, xMax - d2, yMax - yMin);

    // Zones sensibles invisibles (facilitent hover)
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,0,0,0)";
    ctx.beginPath();
    ctx.moveTo(d1, yMin);
    ctx.lineTo(d1, yMax);
    ctx.moveTo(d2, yMin);
    ctx.lineTo(d2, yMax);
    let tY = Math.min(Math.max(this._thresholdY, yMin), yMax);
    ctx.moveTo(xMin, tY);
    ctx.lineTo(xMax, tY);
    ctx.stroke();

    // Lignes visibles tiretées
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(d1, yMin);
    ctx.lineTo(d1, yMax);
    ctx.moveTo(d2, yMin);
    ctx.lineTo(d2, yMax);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xMin, tY);
    ctx.lineTo(xMax, tY);
    ctx.stroke();

    if (this._data.length > 1) {
      const data = this._data;
      const maxData = Math.max(...data);
      const minData = Math.min(...data);
      const yScale = (yMax - yMin) / (maxData - minData || 1);
      const xStep = (xMax - xMin) / (data.length - 1);

      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const points = data.map((val, i) => ({
        x: xMin + i * xStep,
        y: yMax - (val - minData) * yScale,
      }));

      function catmullRom2bezier(points) {
        let beziers = [];
        for (let i = 0; i < points.length - 1; i++) {
          let p0 = points[i === 0 ? i : i - 1];
          let p1 = points[i];
          let p2 = points[i + 1];
          let p3 = points[i + 2 < points.length ? i + 2 : i + 1];
          let cp1x = p1.x + (p2.x - p0.x) / 6;
          let cp1y = p1.y + (p2.y - p0.y) / 6;
          let cp2x = p2.x - (p3.x - p1.x) / 6;
          let cp2y = p2.y - (p3.y - p1.y) / 6;
          beziers.push([cp1x, cp1y, cp2x, cp2y, p2.x, p2.y]);
        }
        return beziers;
      }

      ctx.moveTo(points[0].x, points[0].y);
      const beziers = catmullRom2bezier(points);
      for (let [cp1x, cp1y, cp2x, cp2y, x, y] of beziers) {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      }

      ctx.stroke();
    }
  }

  _onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sens = 10;

    if (Math.abs(y - this._thresholdY) < sens && x >= 0 && x <= this.width) {
      this.drag = "threshold";
      this.canvas.style.cursor = "grabbing";
      this._showTooltip("threshold");
    } else if (Math.abs(x - this._divider1X) < sens) {
      this.drag = "divider1";
      this.canvas.style.cursor = "grabbing";
      this._showTooltip("divider1");
    } else if (Math.abs(x - this._divider2X) < sens) {
      this.drag = "divider2";
      this.canvas.style.cursor = "grabbing";
      this._showTooltip("divider2");
    } else {
      this.drag = null;
      this._hideTooltip();
    }
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sens = 10;

    if (!this.drag) {
      if (
        (Math.abs(y - this._thresholdY) < sens && x >= 0 && x <= this.width) ||
        Math.abs(x - this._divider1X) < sens ||
        Math.abs(x - this._divider2X) < sens
      ) {
        this.canvas.style.cursor = "grab";
      } else {
        this.canvas.style.cursor = "default";
      }
      this._hideTooltip();
      return;
    }

    this.canvas.style.cursor = "grabbing";

    if (this.drag === "threshold") {
      this.threshold = Math.min(Math.max(y, this.MIN_THRESHOLD_Y), this.MAX_THRESHOLD_Y);
      this._updateTooltipPosition(this._divider1X, this._thresholdY, `Threshold: ${Math.round(this._thresholdY)}`);
    } else if (this.drag === "divider1") {
      this.divider1 = Math.min(Math.max(x, this.MIN_DIVIDER1_X), this._divider2X - 10);
      this._updateTooltipPosition(this._divider1X, this.height / 2, `Divider 1: ${Math.round(this._divider1X)}`);
    } else if (this.drag === "divider2") {
      this.divider2 = Math.max(Math.min(x, this.MAX_DIVIDER2_X), this._divider1X + 10);
      this._updateTooltipPosition(this._divider2X, this.height / 2, `Divider 2: ${Math.round(this._divider2X)}`);
    }
  }

  _onMouseUp() {
    this.drag = null;
    this._hideTooltip();
    this.canvas.style.cursor = "default";
  }

  _showTooltip(type) {
    this._tooltip.style.opacity = "1";
    // Affiche le texte initial suivant le type
    if(type === "threshold") {
      this._tooltip.textContent = `Threshold: ${Math.round(this._thresholdY)}`;
      this._updateTooltipPosition(this._divider1X, this._thresholdY, this._tooltip.textContent);
    } else if(type === "divider1") {
      this._tooltip.textContent = `Divider 1: ${Math.round(this._divider1X)}`;
      this._updateTooltipPosition(this._divider1X, this.height / 2, this._tooltip.textContent);
    } else if(type === "divider2") {
      this._tooltip.textContent = `Divider 2: ${Math.round(this._divider2X)}`;
      this._updateTooltipPosition(this._divider2X, this.height / 2, this._tooltip.textContent);
    }
  }

  _updateTooltipPosition(x, y, text) {
    this._tooltip.textContent = text;
    // Position tooltip légèrement au-dessus de la ligne (ou au-dessus du curseur)
    const offsetX = 10;
    const offsetY = -25;
    this._tooltip.style.left = `${x + offsetX}px`;
    this._tooltip.style.top = `${y + offsetY}px`;
  }

}

customElements.define("times-control", TimesControl);
