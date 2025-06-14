Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};

const markerRadius = 12;
const markerPadding = 1.2 * markerRadius;

const virtualWidth = 256 + markerPadding * 2;
const virtualHeight = 256 + markerPadding * 2;

// Fonctions de drag avec accès aux constantes en closure
function drag_constrained(pos) {
  return {
    x: this.absolutePosition().x,
    y: pos.y.clamp(markerPadding, this.getStage().height() - markerPadding),
  };
}

function drag(pos) {
  return {
    x: pos.x.clamp(markerPadding, this.getStage().width() - markerPadding),
    y: pos.y.clamp(markerPadding, this.getStage().height() - markerPadding),
  };
}

class BezierCurve extends HTMLElement {
  constructor() {
    super();

    this.virtualWidth = virtualWidth;
    this.virtualHeight = virtualHeight;
  }

  connectedCallback() {
    if (!this.querySelector('#curve_container')) {
      const container = document.createElement('div');
      container.id = 'curve_container';
      container.style.width = '100%';
      container.style.height = `${this.virtualHeight}px`;
      this.appendChild(container);
    }

    this.container = this.querySelector('#curve_container');

    this.stage = new Konva.Stage({
      container: this.container,
      width: this.virtualWidth,
      height: this.virtualHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.markerRadius = markerRadius;
    this.markerPadding = markerPadding;

    this.bezier = {
      start: this.buildAnchor(this.markerPadding, this.stage.height() - this.markerPadding, true),
      control1: this.buildAnchor(this.stage.width() / 4, this.stage.height() * 3 / 4),
      control2: this.buildAnchor(this.stage.width() * 3 / 4, this.stage.height() / 2),
      end: this.buildAnchor(this.stage.width() - this.markerPadding, this.markerPadding, true),
    };

    this.bezierLine = new Konva.Shape({
      stroke: 'orange',
      strokeWidth: 5,
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(this.bezier.start.x(), this.bezier.start.y());
        ctx.bezierCurveTo(
          this.bezier.control1.x(), this.bezier.control1.y(),
          this.bezier.control2.x(), this.bezier.control2.y(),
          this.bezier.end.x(), this.bezier.end.y()
        );
        ctx.fillStrokeShape(shape);
      },
    });
    this.layer.add(this.bezierLine);

    this.bezierLinePath = new Konva.Line({
      dash: [10, 0, 0, 10],
      strokeWidth: 3,
      stroke: 'gray',
      lineCap: 'round',
      opacity: 0.3,
      points: [],
    });
    this.layer.add(this.bezierLinePath);

    this.updateDottedLines();
    this.bezier.start.moveToTop();
    this.bezier.control1.moveToTop();
    this.bezier.control2.moveToTop();
    this.bezier.end.moveToTop();
    this.layer.batchDraw();

    this.fitStageIntoParentContainer();
    window.addEventListener('resize', this.fitStageIntoParentContainer.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.fitStageIntoParentContainer.bind(this));
    this.stage.destroy();
  }

  buildAnchor(x, y, constrained = false) {
    const settings = {
      x: x,
      y: y,
      radius: this.markerRadius,
      stroke: '#666',
      fill: '#ddd',
      strokeWidth: 2,
      draggable: true,
      dragBoundFunc: constrained ? drag_constrained : drag,
    };

    const anchor = new Konva.Circle(settings);
    this.layer.add(anchor);

    anchor.on('mouseover', () => {
      document.body.style.cursor = 'pointer';
      anchor.strokeWidth(4);
      this.layer.batchDraw();
    });

    anchor.on('mouseout', () => {
      document.body.style.cursor = 'default';
      anchor.strokeWidth(2);
      this.layer.batchDraw();
    });

    anchor.on('dragmove', () => {
      this.updateDottedLines();
      this.layer.batchDraw();
    });

    return anchor;
  }

  updateDottedLines() {
    this.bezierLinePath.points([
      this.bezier.start.x(), this.bezier.start.y(),
      this.bezier.control1.x(), this.bezier.control1.y(),
      this.bezier.control2.x(), this.bezier.control2.y(),
      this.bezier.end.x(), this.bezier.end.y(),
    ]);
  }

  fitStageIntoParentContainer() {
    const containerWidth = this.container.offsetWidth;
    const scale = containerWidth / this.virtualWidth;

    this.stage.width(this.virtualWidth * scale);
    this.stage.height(this.virtualHeight * scale);
    this.stage.scale({ x: scale, y: scale });

    this.container.style.height = `${this.virtualHeight * scale}px`;

    this.stage.draw();
  }
}

customElements.define('bezier-curve', BezierCurve);
