const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const handler = require("../api/send-number");

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("validates requests and sends mail only after configuration is available", async (t) => {
  const original = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_TO: process.env.EMAIL_TO
  };
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  let res = response();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");

  for (const phone of [undefined, 1234567, "123456", "1234567890123456", "1234567\nBcc:evil"]) {
    res = response();
    await handler({ method: "POST", body: { phone } }, res);
    assert.equal(res.statusCode, 400);
  }

  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.EMAIL_TO;
  res = response();
  await handler({ method: "POST", body: { phone: "27821234567" } }, res);
  assert.equal(res.statusCode, 500);

  process.env.SMTP_USER = "sender@example.com";
  process.env.SMTP_PASSWORD = "abcd efgh";
  process.env.EMAIL_TO = "recipient@example.com";
  let options;
  let message;
  const transport = t.mock.method(nodemailer, "createTransport", (config) => {
    options = config;
    return { async sendMail(mail) { message = mail; } };
  });
  res = response();
  await handler({ method: "POST", body: { phone: "27821234567" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(options.auth.pass, "abcdefgh");
  assert.equal(message.from, "sender@example.com");
  assert.equal(message.to, "recipient@example.com");
  assert.match(message.text, /\+27821234567/);

  transport.mock.mockImplementation(() => ({
    async sendMail() { throw new Error("sensitive SMTP details"); }
  }));
  res = response();
  await handler({ method: "POST", body: { phone: "27821234567" } }, res);
  assert.equal(res.statusCode, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /sensitive/);
});
