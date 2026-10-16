// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) scope[name] = resolvers[name]?.();
      else Object.defineProperty(scope, name, { enumerable: true, get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get") });
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/upload-attribution/core.mjs
  function createAttributionCore({ environment = globalThis, dependencies = {} } = {}) {
    const { document, MutationObserver, URL } = environment;
    let attribution2 = createModuleScope(dependencies.attribution, [], ["Registry", "Controller"]);
    const initializeAttributionCore = /* @__PURE__ */ __name(function(g) {
      "use strict";
      let sequence = 0;
      const id = /* @__PURE__ */ __name((prefix) => prefix + ++sequence, "id");
      const ROOTS = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
      class Registry {
        static {
          __name(this, "Registry");
        }
        constructor({ now = /* @__PURE__ */ __name(() => Date.now(), "now"), ttl = 5 * 60 * 1e3, limit = 512 } = {}) {
          this.now = now;
          this.ttl = ttl;
          this.limit = limit;
          this.records = [];
          this.blocked = /* @__PURE__ */ new Set();
          this.full = false;
        }
        begin(files, root) {
          this.expire();
          const batch = id("b");
          if (this.records.length + files.length > this.limit) {
            this.full = true;
            return [];
          }
          const records = files.map((file, index) => ({
            id: id("f"),
            batch,
            index,
            name: String(file.name || ""),
            size: file.size,
            modified: file.lastModified,
            root,
            created: this.now(),
            state: "pending",
            consumed: false,
            info: null
          }));
          this.records.push(...records);
          return records;
        }
        ready(record, info) {
          if (this.records.includes(record) && record.state !== "expired") {
            record.info = info || { status: "missing" };
            record.state = "ready";
          }
        }
        expire() {
          for (const record of this.records) if (!record.consumed && record.state !== "expired" && this.now() - record.created > this.ttl) {
            record.state = "expired";
            this.blocked.add(record.name);
          }
        }
        match(names, root) {
          this.expire();
          const exact = new Set(names.filter((value) => typeof value === "string" && value.length));
          if (this.full) return { status: "capacity" };
          if ([...exact].some((name) => this.blocked.has(name))) return { status: "expired" };
          const possible = this.records.filter((record) => record.root === root && record.state !== "expired" && !record.consumed && exact.has(record.name));
          if (!possible.length) return { status: "unidentified" };
          const alternatives = this.records.filter((record) => record.root === root && record.state !== "expired" && exact.has(record.name));
          if (alternatives.some((record) => record.state === "pending")) return { status: "waiting" };
          if (alternatives.some((record) => record.info?.status !== "ok" || !record.info.url)) return { status: "source-missing" };
          const urls = new Set(alternatives.map((record) => record.info.url));
          if (urls.size !== 1) return { status: "ambiguous" };
          return {
            status: "matched",
            url: possible[0].info.url,
            record: possible[0],
            evidence: alternatives.length === 1 ? "unique-exact-name" : "source-equivalent",
            possibleIds: alternatives.map((record) => record.id)
          };
        }
        commit(match) {
          if (match.status === "matched") match.record.consumed = true;
        }
      }
      class Controller {
        static {
          __name(this, "Controller");
        }
        constructor({ document: document2 = g.document, parse, sanitize, caption, anchor, existing, onStatus = /* @__PURE__ */ __name(() => {
        }, "onStatus"), now } = {}) {
          this.doc = document2;
          this.parse = parse;
          this.sanitize = sanitize;
          this.caption = caption;
          this.anchor = anchor;
          this.existing = existing;
          this.onStatus = onStatus;
          this.registry = new Registry({ now });
          this.roots = /* @__PURE__ */ new Set();
          this.candidates = /* @__PURE__ */ new Set();
          this.ignored = /* @__PURE__ */ new WeakSet();
          this.handled = /* @__PURE__ */ new WeakSet();
          this.imageIds = /* @__PURE__ */ new WeakMap();
          this.mediaFailures = /* @__PURE__ */ new WeakMap();
          this.proof = /* @__PURE__ */ new WeakMap();
          this.events = [];
          this.closed = false;
          this.pending = [];
          this.selected = 0;
          this.readyCount = 0;
          this.inserted = 0;
          this.observer = new g.MutationObserver((mutations) => {
            this.discover();
            for (const mutation of mutations) {
              if (mutation.type === "attributes") this.observeImage(mutation.target);
              for (const node of mutation.addedNodes || []) {
                if (node.nodeType !== 1) continue;
                if (node.matches("img")) this.observeImage(node);
                for (const image of node.querySelectorAll("img")) this.observeImage(image);
              }
            }
            this.schedule();
          });
          this.discover();
          this.observer.observe(this.doc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["alt", "title", "src", "data-original-name", "data-filename"]
          });
        }
        trace(event) {
          this.events.push(event);
          if (this.events.length > 120) this.events.shift();
        }
        discover() {
          const found = [...this.doc.querySelectorAll(ROOTS)];
          if (!found.length) found.push(...this.doc.querySelectorAll('[contenteditable="true"]'));
          for (const root of found) if (!this.roots.has(root)) {
            this.roots.add(root);
            for (const image of root.querySelectorAll("img")) this.ignored.add(image);
          }
        }
        rootFor(image) {
          return [...this.roots].find((root) => root.isConnected && root.contains(image));
        }
        observeImage(image) {
          if (!image.matches?.("img") || this.ignored.has(image) || this.handled.has(image)) return;
          const root = this.rootFor(image);
          if (!root || !this.registry.records.some((record) => record.root === root && !record.consumed)) return;
          if (!this.imageIds.has(image)) {
            this.imageIds.set(image, id("i"));
            this.trace({ stage: "editor-image-observed", image: this.imageIds.get(image) });
            image.addEventListener("load", () => {
              if (!this.closed) {
                this.mediaFailures.delete(image);
                this.schedule();
              }
            });
            image.addEventListener("error", () => {
              if (!this.closed) {
                this.mediaFailures.set(image, image.getAttribute("src"));
                this.schedule();
              }
            });
          }
          this.candidates.add(image);
        }
        async select(files, input) {
          this.discover();
          const roots = [...this.roots].filter((root2) => root2.isConnected);
          const scope = input?.closest?.(".seditor,.note-editor,.editor");
          const scoped = scope ? roots.filter((root2) => root2 === scope || scope.contains(root2)) : roots;
          const root = scoped.length === 1 ? scoped[0] : null;
          if (!root) {
            this.trace({ stage: "editor-unavailable" });
            this.onStatus({ state: "editor-unavailable", selected: files.length });
            return;
          }
          for (const image of root.querySelectorAll("img")) if (!this.candidates.has(image)) this.ignored.add(image);
          const records = this.registry.begin(files, root);
          this.selected += files.length;
          records.forEach((record) => this.trace({ stage: "file-selected", file: record.id, batch: record.batch, index: record.index }));
          if (!records.length) {
            this.report();
            return;
          }
          let next = 0;
          const worker = /* @__PURE__ */ __name(async () => {
            while (!this.closed && next < records.length) {
              const index = next++, record = records[index];
              let info;
              try {
                info = await this.parse(files[index]);
              } catch (_) {
                info = { status: "error", reason: "parse-failed" };
              }
              if (this.closed) return;
              this.registry.ready(record, info);
              this.readyCount++;
              this.trace({ stage: "metadata-ready", file: record.id, sourceAvailable: info?.status === "ok" });
              this.schedule();
            }
          }, "worker");
          const task = Promise.all([worker(), worker()]);
          this.pending.push(task);
          try {
            await task;
          } finally {
            this.pending.splice(this.pending.indexOf(task), 1);
            this.schedule();
          }
        }
        schedule() {
          if (this.scheduled || this.closed) return;
          this.scheduled = true;
          g.queueMicrotask(() => {
            this.scheduled = false;
            if (!this.closed) this.reconcile();
          });
        }
        reconcile() {
          for (const image of [...this.candidates]) {
            const root = this.rootFor(image);
            if (!root || !image.isConnected) {
              this.candidates.delete(image);
              continue;
            }
            if (image.dataset.aruSourceCaptioned === "1" || this.existing(image)) {
              this.handled.add(image);
              this.candidates.delete(image);
              continue;
            }
            const match = this.registry.match([
              image.getAttribute("alt"),
              image.getAttribute("title"),
              image.getAttribute("data-original-name"),
              image.getAttribute("data-filename")
            ], root);
            this.proof.set(image, match);
            if (match.status !== "matched") continue;
            let uploaded;
            try {
              uploaded = new URL(image.getAttribute("src") || "", this.doc.baseURI);
            } catch (_) {
            }
            if (!uploaded || uploaded.protocol !== "https:" || !/^i[123]\.ruliweb\.com$/.test(uploaded.hostname) || uploaded.username || uploaded.password || uploaded.port) {
              this.proof.set(image, { status: "upload-pending" });
              continue;
            }
            if (this.mediaFailures.get(image) === image.getAttribute("src")) {
              this.proof.set(image, { status: "media-error" });
              continue;
            }
            if (!image.complete || image.naturalWidth === 0) {
              this.proof.set(image, { status: "media-loading" });
              continue;
            }
            const url = this.sanitize(match.url);
            if (!url) {
              this.proof.set(image, { status: "source-rejected" });
              continue;
            }
            const anchor = this.anchor(image);
            if (!anchor || anchor !== image && (anchor.querySelectorAll("img").length !== 1 || anchor.textContent.trim())) {
              this.proof.set(image, { status: "mixed-anchor" });
              continue;
            }
            try {
              anchor.after(this.caption(url));
              image.dataset.aruSourceCaptioned = "1";
              this.handled.add(image);
              this.registry.commit(match);
              this.inserted++;
              this.candidates.delete(image);
              this.proof.set(image, match);
              this.trace({ stage: "caption-inserted", image: this.imageIds.get(image), evidence: match.evidence, possibleFiles: match.possibleIds });
            } catch (_) {
              this.proof.set(image, { status: "insert-failed" });
            }
          }
          this.report();
        }
        snapshot() {
          const blocked = {};
          for (const image of this.candidates) {
            const state = this.proof.get(image)?.status || "waiting";
            blocked[state] = (blocked[state] || 0) + 1;
          }
          const order = [];
          for (const root of this.roots) if (root.isConnected) for (const image of root.querySelectorAll("img")) {
            const match = this.proof.get(image);
            if (this.imageIds.has(image)) order.push({
              image: this.imageIds.get(image),
              selectionIndex: match?.evidence === "unique-exact-name" ? match.record.index : null,
              batch: match?.evidence === "unique-exact-name" ? match.record.batch : null,
              evidence: match?.evidence || null
            });
          }
          return {
            diagnostic: "aru-upload-attribution-v1",
            state: this.registry.full ? "capacity" : "active",
            selected: this.selected,
            metadataReady: this.readyCount,
            captionsInserted: this.inserted,
            blocked,
            editorOrder: order,
            events: this.events.slice(),
            limits: "Selection, metadata completion and DOM order only. No upload request/response capture, file names, source URLs, content, credentials or storage."
          };
        }
        report() {
          const snapshot = this.snapshot();
          this.onStatus(snapshot);
        }
        destroy() {
          this.closed = true;
          this.observer.disconnect();
          this.candidates.clear();
          this.roots.clear();
          this.registry.records.length = 0;
          this.events.length = 0;
        }
      }
      attribution2 = Object.freeze({ Registry, Controller });
    }, "initializeAttributionCore");
    initializeAttributionCore(environment);
    return { "attribution": selectModuleExports(attribution2, ["Registry", "Controller"]) };
  }
  __name(createAttributionCore, "createAttributionCore");

  // docs/source/compat/upload-attribution-core.mjs
  var attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
  var result = createAttributionCore({ environment: globalThis, dependencies: { attribution: {} } });
  Object.assign(attribution, result.attribution);
})();
