import { test } from "node:test";
import assert from "node:assert/strict";
import { escHtml } from "./utils.js";

test("escHtml: empty string returns empty", () => {
  assert.equal(escHtml(""), "");
});

test("escHtml: no special chars unchanged", () => {
  assert.equal(escHtml("hello world"), "hello world");
});

test("escHtml: & → &amp;", () => {
  assert.equal(escHtml("a & b"), "a &amp; b");
});

test("escHtml: < and > in script tag", () => {
  assert.equal(escHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escHtml: double quote → &quot;", () => {
  assert.equal(escHtml('"quoted"'), "&quot;quoted&quot;");
});

test("escHtml: single quote → &#39;", () => {
  assert.equal(escHtml("it's"), "it&#39;s");
});

test("escHtml: multiple special chars", () => {
  assert.equal(escHtml('a & <b>"c"</b>'), "a &amp; &lt;b&gt;&quot;c&quot;&lt;/b&gt;");
});
