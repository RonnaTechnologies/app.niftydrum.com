class TimeControl extends HTMLElement {
    constructor() {
      super();
  
      this.svg = this.querySelector("svg");
      this.rects = Array.from(this.svg.querySelectorAll("rect"));
      this.labels = Array.from(this.svg.querySelectorAll("text"));
      this.thresholdLine = this.svg.querySelector("#threshold-line");
  
      this.axisStart = parseFloat(this.getAttribute("axis-start")) || 0.001;
      this.axisEnd = parseFloat(this.getAttribute("axis-end")) || 100;
      this.maxThreshold = parseFloat(this.getAttribute("max-threshold")) || 1;
      this.thresholdValue = parseFloat(this.getAttribute("threshold")) || 0.5;
  
      this.svgWidth = this.svg.viewBox.baseVal.width;
      this.svgHeight = this.svg.viewBox.baseVal.height;
  
      this.drag = { type: null, index: null };
  
      this._parseZones();
      this._addHandles();
      this._updateLayout();
      this._updateThresholdLine();
      this._bindThresholdEvents();
    }
  
    _parseZones() {
      this.zones = this.rects.map((rect, i) => ({
        element: rect,
        name: rect.getAttribute("name"),
        start: parseFloat(rect.getAttribute("start")),
        duration: parseFloat(rect.getAttribute("duration")),
        minDuration: parseFloat(rect.getAttribute("min-duration")) || 0.001,
        maxDuration: parseFloat(rect.getAttribute("max-duration")) || Infinity,
        minStart: parseFloat(rect.getAttribute("min-start")) || this.axisStart,
        maxStart: parseFloat(rect.getAttribute("max-start")) || this.axisEnd,
      }));
    }
  
    _addHandles() {
      this.zones.forEach((zone, i) => {
        ['left', 'right'].forEach(side => {
          const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          handle.setAttribute("width", 6);
          handle.setAttribute("height", this.svgHeight);
          handle.setAttribute("y", 0);
          handle.classList.add("drag-handle", side);
          this.svg.appendChild(handle);
          zone[`${side}Handle`] = handle;
  
          handle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            this.drag = { type: side, index: i };
          });
        });
      });
  
      window.addEventListener("mousemove", this._onMouseMove.bind(this));
      window.addEventListener("mouseup", () => {
        this.drag = { type: null, index: null };
        this.dispatchEvent(new CustomEvent("zones-change", {
          detail: this.values,
          bubbles: true,
          composed: true
        }));
      });
    }
  
    _onMouseMove(e) {
      if (!this.drag.type) return;
  
      const i = this.drag.index;
      const zone = this.zones[i];
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const cursorPt = pt.matrixTransform(this.svg.getScreenCTM().inverse());
      const timeAtX = this._xToTime(cursorPt.x);
  
      if (this.drag.type === "left" && i > 0) {
        const prev = this.zones[i - 1];
  
        // Clamp to minDuration
        const minLeft = zone.start + zone.duration - zone.maxDuration;
        const maxLeft = zone.start + zone.duration - zone.minDuration;
        const newStart = Math.max(minLeft, Math.min(maxLeft, timeAtX));
  
        const delta = zone.start - newStart;
  
        // Update current
        zone.start = newStart;
        zone.duration += delta;
  
        // Update previous to end at this start
        prev.duration = zone.start - prev.start;
      }
  
      if (this.drag.type === "right" && i < this.zones.length - 1) {
        const next = this.zones[i + 1];
  
        const minRight = zone.start + zone.minDuration;
        const maxRight = zone.start + zone.maxDuration;
        const newEnd = Math.max(minRight, Math.min(maxRight, timeAtX));
  
        zone.duration = newEnd - zone.start;
  
        // Update next to start here
        next.start = zone.start + zone.duration;
        next.duration = Math.max(next.minDuration, next.duration); // don't go below min
      }
  
      this._updateLayout();
    }
  
    _updateLayout() {
      this.zones.forEach((zone, i) => {
        const x = this._timeToX(zone.start);
        const width = this._timeToX(zone.start + zone.duration) - x;
  
        zone.element.setAttribute("x", x);
        zone.element.setAttribute("width", width);
  
        // Update handles
        if (zone.leftHandle) zone.leftHandle.setAttribute("x", x - 3);
        if (zone.rightHandle) zone.rightHandle.setAttribute("x", x + width - 3);
  
        // Update label position if exists
        if (this.labels[i]) {
          this.labels[i].setAttribute("x", x + 5);
        }
      });
    }
  
    _updateThresholdLine() {
      const y = this.svgHeight * (1 - this.thresholdValue / this.maxThreshold);
      this.thresholdLine.setAttribute("y1", y);
      this.thresholdLine.setAttribute("y2", y);
    }
  
    _bindThresholdEvents() {
      let dragging = false;
  
      this.thresholdLine.addEventListener("mousedown", (e) => {
        dragging = true;
        e.preventDefault();
      });
  
      window.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorPt = pt.matrixTransform(this.svg.getScreenCTM().inverse());
        const y = Math.max(0, Math.min(this.svgHeight, cursorPt.y));
        this.thresholdValue = this.maxThreshold * (1 - y / this.svgHeight);
        this._updateThresholdLine();
  
        this.dispatchEvent(new CustomEvent("threshold-change", {
          detail: { threshold: this.thresholdValue },
          bubbles: true,
          composed: true
        }));
      });
  
      window.addEventListener("mouseup", () => {
        dragging = false;
      });
    }
  
    _timeToX(t) {
      const logStart = Math.log10(this.axisStart);
      const logEnd = Math.log10(this.axisEnd);
      const logT = Math.log10(t);
      return ((logT - logStart) / (logEnd - logStart)) * this.svgWidth;
    }
  
    _xToTime(x) {
      const logStart = Math.log10(this.axisStart);
      const logEnd = Math.log10(this.axisEnd);
      const logT = logStart + (x / this.svgWidth) * (logEnd - logStart);
      return Math.pow(10, logT);
    }
  
    get values() {
      return this.zones.map(z => ({
        name: z.name,
        start: z.start,
        duration: z.duration
      }));
    }
  
    get threshold() {
      return this.thresholdValue;
    }
  
    set threshold(val) {
      this.thresholdValue = Math.max(0, Math.min(this.maxThreshold, val));
      this._updateThresholdLine();
    }
  }
  
  customElements.define("time-control", TimeControl);
  