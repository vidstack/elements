import { expect, fixture } from '@open-wc/testing';
import { html, LitElement, PropertyDeclarations } from 'lit';

import {
  getElementAttributes,
  observeAndForwardAttributes,
  raf,
  safelyDefineCustomElement
} from '../dom';

describe('utils/dom', function () {
  describe(safelyDefineCustomElement.name, function () {
    class FakeElement extends LitElement {
      render() {
        return html`<h1>penguins</h1>`;
      }
    }

    it('should not register custom element if server-side', async function () {
      safelyDefineCustomElement('fake-el', FakeElement, false);
      const el = await fixture(html`<fake-el></fake-el>`);
      expect(el.shadowRoot?.innerHTML ?? '').not.contains('<h1>penguins</h1>');
    });

    it('should register custom element', async function () {
      safelyDefineCustomElement('fake-el', FakeElement);
      const el = await fixture(html`<fake-el></fake-el>`);
      expect(el.shadowRoot?.innerHTML).contains('<h1>penguins</h1>');
    });

    it('should not register custom element if registered before', function () {
      expect(() => {
        safelyDefineCustomElement('fake-el', FakeElement);
        safelyDefineCustomElement('fake-el', FakeElement);
      }).not.throws();
    });
  });

  describe(getElementAttributes.name, function () {
    class A extends LitElement {
      static get properties(): PropertyDeclarations {
        return {
          propA: {},
          propB: {},
          propC: { attribute: 'prop-c' }
        };
      }
    }

    class B extends A {
      static get properties(): PropertyDeclarations {
        return {
          propD: {},
          propE: { attribute: 'prop-e' }
        };
      }
    }

    it('it should return all attributes', function () {
      const attributes = getElementAttributes(B);
      expect(Array.from(attributes)).eql([
        'propa',
        'propb',
        'prop-c',
        'propd',
        'prop-e'
      ]);
    });
  });

  describe(observeAndForwardAttributes.name, function () {
    it('should forward attributes', async function () {
      const elementA = document.createElement('div');
      const elementB = document.createElement('div');

      const observer = observeAndForwardAttributes(
        elementA,
        elementB,
        new Set(['a', 'b'])
      );

      elementA.setAttribute('a', '10');
      await raf();
      expect(elementB).to.have.attribute('a', '10');

      elementA.setAttribute('a', '20');
      await raf();
      expect(elementB).to.have.attribute('a', '20');

      elementA.setAttribute('b', '');
      await raf();
      expect(elementB).to.have.attribute('b', '');

      elementA.setAttribute('c', '');
      await raf();
      expect(elementB).to.not.have.attribute('c');

      observer.disconnect();

      elementA.setAttribute('b', '10');
      await raf();
      expect(elementB).to.have.attribute('b', '');
    });
  });
});
