customElements.define('kiwi-number',
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
      <label id="${this.id}">
        ${this.label}
        <input type="number" 
          name="number" 
          min="${this.min}"
          max="${this.max}"
          value="${this.value}"
          step="${this.step}" 
          route="${this.route}">
      </label>
    `;

      this.insertAdjacentHTML('afterbegin', this.template);
      this.inputElement = this.querySelector('input[type="number"]');
      this.inputElement.addEventListener('change', this);
    }

    handleEvent(event)
    {
      this[`on${event.type}`](event);
    }

    onchange(event)
    {
      this.inputElement.value = event.target.value;
      const pad = this.id.split('-').slice(0, -1)[0];
      const param = this.id.split('-').slice(-1)[0];
      // fetchData(`${this.route}/${pad}/${param}/${event.target.value}`);
      update_param(pad, param, event.target.value)
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
      this.inputElement.value = newValue;
    }
  });
