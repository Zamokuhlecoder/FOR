const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup(fetch, whatsappNumber = "27821234567", saved = {}) {
  const html = fs.readFileSync("index.html", "utf8");
  const start = html.indexOf("/* ---------- form ---------- */", html.indexOf("<script>"));
  const end = html.indexOf("/* gentle nudge for the developer */", start);
  assert.ok(start !== -1 && end !== -1);

  function element() {
    return {
      value: "", hidden: false, disabled: false, readOnly: false,
      classList: { add() {}, remove() {} },
      addEventListener(name, callback) { this[name] = callback; },
      focus() {}, select() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 }; }
    };
  }
  const ids = ["form", "phone", "inputRow", "error", "success", "waLink", "directWaLink", "waUnavailable", "savedNumber", "flag", "editLink"];
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const button = element();
  elements.form.querySelector = () => button;
  elements.success.hidden = true;
  elements.waLink.hidden = true;
  elements.directWaLink.hidden = true;
  elements.waUnavailable.hidden = true;
  const context = {
    $: (selector) => elements[selector.slice(1)],
    digitsOnly: (value) => (value || "").replace(/\D/g, ""),
    localStorage: { getItem: (key) => saved[key], setItem: (key, value) => { saved[key] = value; } },
    detectFlag: () => "", bumpFlag() {}, formatPhone: (value) => value,
    CONFIG: { hisName: "Alex", herName: "Tisetso", whatsappNumber },
    fetch, burstHearts() {}, Sound: { chime() {} }, setTimeout: (callback) => callback(),
    clearTimeout() {}, Intl, encodeURIComponent
  };
  vm.runInNewContext(html.slice(start, end), context);
  return { elements, button, saved };
}

test("phone field starts empty even when a previous number was saved", () => {
  const app = setup(() => {}, "27821234567", { wa_number_tisetso: "27829999999" });
  assert.equal(app.elements.phone.value, "");
});

test("WhatsApp links open a blank chat without submitting the form", () => {
  let calls = 0;
  const app = setup(() => { calls++; });
  assert.equal(app.elements.directWaLink.hidden, false);
  assert.equal(app.elements.directWaLink.href, "https://wa.me/27821234567");
  assert.equal(app.elements.waLink.href, app.elements.directWaLink.href);
  assert.equal(calls, 0);
});

test("placeholder or invalid WhatsApp number does not create links", () => {
  for (const number of ["27123456789", "", "0123456"]) {
    const app = setup(() => {}, number);
    assert.equal(app.elements.directWaLink.hidden, true);
    assert.equal(app.elements.waLink.hidden, true);
    assert.equal(app.elements.waUnavailable.hidden, false);
  }
});

test("successful submission sends digits before showing success", async () => {
  let resolveFetch;
  let request;
  const app = setup((url, options) => {
    request = { url, options };
    return new Promise((resolve) => { resolveFetch = resolve; });
  });
  app.elements.phone.value = "27 82 123 4567";
  const pending = app.elements.form.submit({ preventDefault() {} });
  assert.equal(app.button.disabled, true);
  assert.equal(app.elements.phone.readOnly, true);
  assert.equal(app.elements.success.hidden, true);
  assert.equal(request.url, "/api/send-number");
  assert.equal(JSON.parse(request.options.body).phone, "27821234567");
  resolveFetch({ ok: true, async json() { return { ok: true }; } });
  await pending;
  assert.equal(app.elements.success.hidden, false);
  assert.equal(app.elements.form.hidden, true);
  assert.equal(app.elements.savedNumber.textContent, "+27821234567");
  assert.equal(app.button.disabled, false);
  assert.equal(Object.keys(app.saved).length, 0);
});

test("invalid or failed submissions keep the form visible and display an error", async () => {
  let calls = 0;
  const app = setup(async () => { calls++; return { ok: false }; });
  app.elements.phone.value = "123";
  await app.elements.form.submit({ preventDefault() {} });
  assert.equal(calls, 0);
  assert.equal(app.elements.error.hidden, false);

  app.elements.phone.value = "27821234567";
  await app.elements.form.submit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(app.elements.success.hidden, true);
  assert.equal(app.elements.form.hidden, false);
  assert.equal(app.elements.error.hidden, false);
  assert.equal(app.button.disabled, false);
  assert.equal(app.elements.phone.readOnly, false);
  assert.equal(Object.keys(app.saved).length, 0);
});

test("unexpected responses do not show success", async () => {
  const app = setup(async () => ({ ok: true, async json() { return {}; } }));
  app.elements.phone.value = "27821234567";
  await app.elements.form.submit({ preventDefault() {} });
  assert.equal(app.elements.success.hidden, true);
  assert.equal(app.elements.error.hidden, false);
});
