class BezierCurve extends HTMLElement {
  constructor() {
    super();

    this.svg = this.querySelector("svg");
    this.path = this.svg.querySelector("#bezier-curve-path");
    this.anchors = [
      this.svg.querySelector("#p0"),
      this.svg.querySelector("#p1"),
      this.svg.querySelector("#p2"),
      this.svg.querySelector("#p3")
    ];

    this.line01 = this.svg.querySelector("#line-p0-p1");
    this.line23 = this.svg.querySelector("#line-p2-p3");

    this.state = [
      [0, 128],
      [64, 64],
      [192, 192],
      [255, 128]
    ];

    this.dragIndex = null;

    this._bindEvents();
    this._updateCurve();

    this.debouncedDispatch = debounce(() => {
      this.dispatchEvent(new CustomEvent('curve', {
          detail: { curve: this.state },
          bubbles: true,
          composed: true
      }));
  });
  }

  _bindEvents() {
    this.anchors.forEach((anchor, i) => {
      anchor.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.dragIndex = i;
        window.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("mouseup", this._onMouseUp);
      });
    });

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  _getSVGCoordinates(event) {
    const pt = this.svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    const svgPoint = pt.matrixTransform(this.svg.getScreenCTM().inverse());

    svgPoint.y = 255 - svgPoint.y;

    return svgPoint;
  }

  _onMouseMove(event) {
    if (this.dragIndex === null) return;

    const pos = this._getSVGCoordinates(event);
    const clampedX = Math.max(0, Math.min(255, pos.x));
    const clampedY = Math.max(0, Math.min(255, pos.y));

    const oldState = this.state;

    if (this.dragIndex === 0) {
      this.state[0][1] = clampedY;
    } else if (this.dragIndex === 3) {
      this.state[3][1] = clampedY;
    } else {
      this.state[this.dragIndex][0] = clampedX;
      this.state[this.dragIndex][1] = clampedY;
    }

    this._updateCurve();
    this.debouncedDispatch();
  }

  _onMouseUp() {
    this.dragIndex = null;
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mouseup", this._onMouseUp);
  }

  _updateCurve() {
    this.path.setAttribute("d",
      `M ${this.state[0][0]},${255 - this.state[0][1]} ` +
      `C ${this.state[1][0]},${255 - this.state[1][1]} ` +
      `${this.state[2][0]},${255 - this.state[2][1]} ` +
      `${this.state[3][0]},${255 - this.state[3][1]}`
    );

    this.anchors.forEach((anchor, i) => {
      anchor.setAttribute("cx", this.state[i][0]);
      anchor.setAttribute("cy", 255 - this.state[i][1]);
    });

    this.line01.setAttribute("x1", this.state[0][0]);
    this.line01.setAttribute("y1", 255 - this.state[0][1]);
    this.line01.setAttribute("x2", this.state[1][0]);
    this.line01.setAttribute("y2", 255 - this.state[1][1]);

    this.line23.setAttribute("x1", this.state[2][0]);
    this.line23.setAttribute("y1", 255 - this.state[2][1]);
    this.line23.setAttribute("x2", this.state[3][0]);
    this.line23.setAttribute("y2", 255 - this.state[3][1]);
  }

  get values() {
    return this.state.map((point) => [...point]);
  }

  set values(newPoints) {
    if (!newPoints) return null;

    for (let i = 0; i < 4; i++) {
      if (i === 0) {
        this.state[0][0] = 0;
        
        this.state[0][1] = Math.max(0, Math.min(255, newPoints[0][1]));
      } else if (i === 3) {
        this.state[3][0] = 255;
        this.state[3][1] = Math.max(0, Math.min(255, newPoints[3][1]));
      } else {
        this.state[i][0] = Math.max(0, Math.min(255, newPoints[i][0]));
        this.state[i][1] = Math.max(0, Math.min(255, newPoints[i][1]));
      }
    }
    this._updateCurve();
  }
}

customElements.define("bezier-curve", BezierCurve);
