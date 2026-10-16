// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // docs/source/ruliweb-icons/core.mjs
  var core_exports = {};
  __export(core_exports, {
    FoldState: () => FoldState,
    SearchIndex: () => SearchIndex,
    hasCriteria: () => hasCriteria,
    normalize: () => normalize,
    queryTokens: () => queryTokens
  });
  function normalize(value) {
    return String(value == null ? "" : value).normalize("NFKC").toLocaleLowerCase("ko-KR").trim().replace(/\s+/gu, " ");
  }
  __name(normalize, "normalize");
  function queryTokens(query) {
    return [...new Set(normalize(query).split(" ").filter(Boolean))];
  }
  __name(queryTokens, "queryTokens");
  function hasCriteria(state = {}) {
    return queryTokens(state.query).length > 0 || ["selectedTagIds", "categoryFilterIds", "sourceFilterIds"].some((key) => Array.isArray(state[key]) && state[key].length > 0);
  }
  __name(hasCriteria, "hasCriteria");
  var SearchIndex = class {
    static {
      __name(this, "SearchIndex");
    }
    constructor(pack = {}) {
      this.pack = pack;
      this.groups = [];
      this.tagIndex = /* @__PURE__ */ new Map();
      this.cache = /* @__PURE__ */ new Map();
      const tags = new Map((pack.tags || []).map((tag) => [tag.id, tag.name]));
      const categories = new Map((pack.categories || []).map((cat) => [cat.id, cat]));
      const sources = new Map((pack.sources || []).map((source) => [source.sourceId, source]));
      const groupMap = /* @__PURE__ */ new Map();
      const makeGroup = /* @__PURE__ */ __name((id, name, aliases, sourceId) => {
        if (!groupMap.has(id)) {
          const group = {
            id,
            name,
            aliases: aliases || [],
            sourceId,
            entries: [],
            seen: /* @__PURE__ */ new Set(),
            fields: [name, ...aliases || []].map(normalize)
          };
          groupMap.set(id, group);
          this.groups.push(group);
        }
        return groupMap.get(id);
      }, "makeGroup");
      for (const category of categories.values()) {
        makeGroup(category.id, category.name, category.aliases || []);
      }
      const seenIcons = /* @__PURE__ */ new Set();
      for (const [position, icon] of (pack.icons || []).entries()) {
        const id = icon.id || icon.iconId;
        if (!id || seenIcons.has(id)) {
          continue;
        }
        seenIcons.add(id);
        const sourceId = icon.sourceId || icon.origin && icon.origin.sourceId || "unclassified";
        const tagIds = new Set(icon.tagIds || []);
        const entry = {
          icon,
          id,
          position,
          sourceId,
          tagIds,
          fields: [
            icon.name,
            ...icon.keywords || [],
            ...[...tagIds].map((tag) => tags.get(tag) || "")
          ].map(normalize)
        };
        for (const tag of tagIds) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, /* @__PURE__ */ new Set());
          }
          this.tagIndex.get(tag).add(id);
        }
        const memberships = [...new Set(icon.categoryIds || [])].filter((cat) => categories.has(cat));
        const groups = memberships.length ? memberships.map((cat) => groupMap.get(cat)) : [
          makeGroup("source:" + sourceId, sources.get(sourceId)?.title || (icon.origin?.articleId ? "원본 글 " + icon.origin.articleId : "미분류"), [], sourceId)
        ];
        for (const group of groups) {
          if (group.seen.has(id)) {
            continue;
          }
          group.seen.add(id);
          group.entries.push(entry);
        }
      }
      this.groups = this.groups.filter((group) => group.entries.length);
      this.iconCount = seenIcons.size;
      this.membershipCount = this.groups.reduce((sum, group) => sum + group.entries.length, 0);
    }
    search(state = {}) {
      const tokens = queryTokens(state.query);
      const selected = [...new Set(state.selectedTagIds || [])].sort();
      const categoryIds = new Set(state.categoryFilterIds || []);
      const sourceIds = new Set(state.sourceFilterIds || []);
      const mode = state.tagMatch === "all" ? "all" : "any";
      const sort = state.sort || "source";
      const key = JSON.stringify([
        tokens,
        selected,
        mode,
        [...categoryIds].sort(),
        [...sourceIds].sort(),
        sort
      ]);
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      let tagCandidates = null;
      if (selected.length) {
        const sets = selected.map((tag) => this.tagIndex.get(tag) || /* @__PURE__ */ new Set());
        tagCandidates = mode === "all" ? new Set([...sets[0]].filter((id) => sets.every((set) => set.has(id)))) : new Set(sets.flatMap((set) => [...set]));
      }
      const unique = /* @__PURE__ */ new Set();
      let membershipCount = 0;
      const groups = [];
      for (const group of this.groups) {
        if (categoryIds.size && !categoryIds.has(group.id)) {
          continue;
        }
        const groupMatches = tokens.map((token) => group.fields.some((field) => field.includes(token)));
        const matches = group.entries.filter((entry) => {
          if (tagCandidates && !tagCandidates.has(entry.id)) {
            return false;
          }
          if (sourceIds.size && !sourceIds.has(entry.sourceId)) {
            return false;
          }
          return tokens.every((token, index) => groupMatches[index] || entry.fields.some((field) => field.includes(token)));
        });
        if (!matches.length) {
          continue;
        }
        matches.sort((a, b) => sort === "name" ? String(a.icon.name).localeCompare(String(b.icon.name), "ko-KR") || a.position - b.position : (a.icon.sortOrder ?? a.position) - (b.icon.sortOrder ?? b.position) || a.position - b.position);
        for (const entry of matches) {
          unique.add(entry.id);
        }
        membershipCount += matches.length;
        groups.push({
          id: group.id,
          name: group.name,
          aliases: group.aliases,
          sourceId: group.sourceId,
          icons: matches.map((entry) => entry.icon),
          count: matches.length
        });
      }
      const result = {
        groups,
        uniqueCount: unique.size,
        membershipCount,
        active: hasCriteria(state)
      };
      if (this.cache.size >= 32) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, result);
      return result;
    }
  };
  var FoldState = class {
    static {
      __name(this, "FoldState");
    }
    constructor(baseCollapsed = {}) {
      this.baseCollapsed = baseCollapsed instanceof Map ? new Map(baseCollapsed) : new Map(Object.entries(baseCollapsed));
      this.searchSession = null;
    }
    update(active) {
      if (active && !this.searchSession) {
        this.searchSession = {
          snapshot: new Map(this.baseCollapsed),
          overrides: /* @__PURE__ */ new Map()
        };
      }
      if (!active && this.searchSession) {
        this.reset();
      }
      return this;
    }
    isCollapsed(id) {
      return this.searchSession ? !!this.searchSession.overrides.get(id) : !!this.baseCollapsed.get(id);
    }
    toggle(id) {
      const collapsed = !this.isCollapsed(id);
      (this.searchSession ? this.searchSession.overrides : this.baseCollapsed).set(id, collapsed);
      return collapsed;
    }
    setAll(ids, collapsed) {
      const target = this.searchSession ? this.searchSession.overrides : this.baseCollapsed;
      for (const id of ids) {
        target.set(id, !!collapsed);
      }
    }
    reset() {
      if (this.searchSession) {
        this.baseCollapsed = new Map(this.searchSession.snapshot);
      }
      this.searchSession = null;
      return this;
    }
    dispose() {
      return this.reset();
    }
  };

  // docs/source/compat/core.mjs
  Object.assign(globalThis.AruIcons = globalThis.AruIcons || {}, core_exports);
})();
