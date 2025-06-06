customElements.define('kiwi-slider',
  class extends HTMLElement
  {

    static observedAttributes = ["default"];

    constructor()
    {
      super();

      this.route = this.getAttribute('route');
      this.min = Number(this.getAttribute('minimum'));
      this.max = Number(this.getAttribute('maximum'))
      this.value = Number(this.getAttribute('default'));
      this.step = Number(this.getAttribute('step')) ?? 1;
      this.label = this.getAttribute('label');

      this.template = `
        <label>
          ${this.label}
          <input type="number"
            min="${this.min}"
            max="${this.max}"
            step="${this.step}"
            value="${this.value}">
          <input type="range"
            min="${this.min}"
            max="${this.max}"
            step="${this.step}"
            value="${this.value}">
        </label>`;

      this.insertAdjacentHTML('afterbegin', this.template);
      this.inputElements = this.querySelectorAll('input');
      this.inputElements[0].addEventListener('change', this);
      this.inputElements[1].addEventListener('input', this);
      this.inputElements[1].addEventListener('change', this);
    }

    handleEvent(event)
    {
      this[`on${event.type}`](event);
    }

    onchange(event)
    {
      this.inputElements[1].value = event.target.value;
      const pad = this.id.split('-').slice(0, -1)[0];
      const param = this.id.split('-').slice(-1)[0];
      // fetchData(`${this.route}/${pad}/${param}/${event.target.value}`);
      update_param(pad, param, event.target.value)
    }

    oninput(event)
    {
      this.inputElements[0].value = event.target.value;
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
      this.inputElements.forEach(input => input.value = newValue);
    }
  });
