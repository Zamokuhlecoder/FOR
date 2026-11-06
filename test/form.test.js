const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup(fetch) {
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
  const ids = ["form", "phone", "inputRow", "error", "success", "waLink", "savedNumber", "flag", "editLink"];
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const button = element();
  elements.form.querySelector = () => button;
  elements.success.hidden = true;
  const saved = {};
  const context = {
    $: (selector) => elements[selector.slice(1)],
    digitsOnly: (value) => (value || "").replace(/\D/g, ""),
    localStorage: { getItem: (key) => saved[key], setItem: (key, value) => { saved[key] = value; } },
    detectFlag: () => "", bumpFlag() {}, formatPhone: (value) => value,
    CONFIG: { hisName: "Alex", herName: "Tisetso", whatsappNumber: "27123456789" },
    fetch, burstHearts() {}, Sound: { chime() {} }, setTimeout: (callback) => callback(),
    clearTimeout() {}, Intl, encodeURIComponent
  };
  vm.runInNewContext(html.slice(start, end), context);
  return { elements, button, saved };
}

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
