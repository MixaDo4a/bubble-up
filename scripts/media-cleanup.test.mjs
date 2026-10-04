import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const { deleteStorageObjectIfUnreferenced, parseStorageObject } = await import("../lib/catalog/media-cleanup.ts");
const config = { url: "https://lptzejmdtsmnlxfodihr.supabase.co", key: "test-key", bucket: "drinkit-media" };
const target = `${config.url}/storage/v1/object/public/${config.bucket}/123-file.mp4`;
const originalFetch = globalThis.fetch;

afterEach(() => { globalThis.fetch = originalFetch; });

test("parses only media URLs from the configured Supabase bucket", () => {
  assert.deepEqual(parseStorageObject(target, config), { bucket: config.bucket, path: "123-file.mp4" });
  assert.equal(parseStorageObject("https://elsewhere.example/storage/v1/object/public/drinkit-media/a.mp4", config), null);
  assert.equal(parseStorageObject(`${config.url}/storage/v1/object/public/other/a.mp4`, config), null);
});

test("does not delete a file that another record still references", async () => {
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes("/rest/v1/products?") && String(url).includes("video_url")) {
      return new Response(JSON.stringify([{ id: "product-1" }]), { status: 200 });
    }
    return new Response("[]", { status: 200 });
  };
  assert.equal(await deleteStorageObjectIfUnreferenced(config, target), "referenced");
  assert.equal(requests.some((url) => url.includes("/storage/v1/object/drinkit-media/")), false);
});

test("deletes an orphan only after every reference lookup succeeds", async () => {
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return new Response("[]", { status: 200 });
  };
  assert.equal(await deleteStorageObjectIfUnreferenced(config, target), "deleted");
  assert.equal(requests.at(-1), `${config.url}/storage/v1/object/drinkit-media/123-file.mp4`);
});

test("fails closed when any reference lookup fails", async () => {
  const requests = [];
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (requests.length === 1) return new Response("unavailable", { status: 503 });
    return new Response("[]", { status: 200 });
  };
  try {
    assert.equal(await deleteStorageObjectIfUnreferenced(config, target), "error");
    assert.equal(requests.some((url) => url.includes("/storage/v1/object/drinkit-media/")), false);
  } finally {
    console.error = originalError;
  }
});

test("stale sweep preserves referenced and recent uploads", async () => {
  const { cleanupStaleOrphanMedia } = await import("../lib/catalog/media-cleanup.ts");
  let deleted = [];
  globalThis.fetch = async (url, init = {}) => {
    const address = String(url);
    if (address.includes("/storage/v1/object/list/")) {
      return new Response(JSON.stringify([
        { name: "unused-old.mp4", created_at: "2020-01-01T00:00:00Z", metadata: { size: 100 } },
        { name: "kept-old.mp4", created_at: "2020-01-01T00:00:00Z", metadata: { size: 100 } },
        { name: "unfinished-new.mp4", created_at: new Date().toISOString(), metadata: { size: 100 } },
      ]), { status: 200 });
    }
    if (address.includes("/rest/v1/products?") && address.includes("video_url")) {
      return new Response(JSON.stringify([{ video_url: `${config.url}/storage/v1/object/public/${config.bucket}/kept-old.mp4` }]), { status: 200 });
    }
    if (init.method === "DELETE") deleted = JSON.parse(init.body).prefixes;
    return new Response("[]", { status: 200 });
  };
  assert.equal(await cleanupStaleOrphanMedia(config), 1);
  assert.deepEqual(deleted, ["unused-old.mp4"]);
});
