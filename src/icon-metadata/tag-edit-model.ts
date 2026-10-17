// DOM이나 저장소를 수정하지 않고 선택한 이미지의 변경 계획을 계산한다.
// ID 생성은 작성기 측에서 주입하며 선택 상태는 각 인스턴스가 소유한다.
export interface TagImage {
  handle: string;
  id?: string | null;
  rawTags?: string | null;
}
export interface TagChange {
  handle: string;
  id: string;
  rawTags: string;
}
export interface TagPlan {
  changes: TagChange[];
  selected: number;
  changed: number;
  ids: number;
  tagChanges: number;
}
export interface SelectionModifiers {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  checkbox?: boolean;
}
import { decode, encode, fail, normalize } from "./tag-codec.ts";

// 미선택 이미지의 ID를 보호하고, 원래 이미지 순서대로 충돌을 해소한다.
export function plan(
  images: readonly TagImage[],
  handles: readonly string[],
  tags: unknown,
  operation: string,
  generate: () => string,
): TagPlan {
  if (!["add", "remove", "replace"].includes(operation)) {
    fail("OP_INVALID", "태그 작업을 선택해 주세요.");
  }
  const normalizedTags = normalize(tags);
  if (operation !== "replace" && !normalizedTags.length) {
    fail("TAGS_EMPTY", "추가하거나 제거할 태그를 지정해 주세요.");
  }
  const selected = new Set(handles);
  if (!selected.size || selected.size !== handles.length) {
    fail("SELECTION_INVALID", "선택한 이미지가 없거나 중복되었습니다.");
  }
  const available = new Set(images.map((image) => image.handle));
  for (const handle of selected) {
    if (!available.has(handle)) {
      fail(
        "IMAGE_CHANGED",
        "선택한 이미지가 삭제되거나 교체되었습니다. 목록을 다시 확인해 주세요.",
      );
    }
  }

  const occupied = new Set(
    images
      .filter((image) => !selected.has(image.handle) && image.id)
      .map((image) => image.id),
  );
  const allIds = new Set(
    images.filter((image) => image.id).map((image) => image.id),
  );
  const changes: TagChange[] = [];
  const remove = new Set(normalizedTags);
  let ids = 0;
  let tagChanges = 0;
  for (const image of images) {
    if (!selected.has(image.handle)) {
      continue;
    }
    const before = decode(image.rawTags);
    const after =
      operation === "add"
        ? normalize(before.concat(normalizedTags))
        : operation === "remove"
          ? before.filter((tag) => !remove.has(tag))
          : normalizedTags;
    let id = image.id;
    if (!id || occupied.has(id)) {
      let tries = 0;
      do {
        id = generate();
        if (++tries > 100) {
          fail("ID_COLLISION", "고유 ID 생성에 실패했습니다.");
        }
      } while (allIds.has(id) || occupied.has(id));
      if (typeof id !== "string" || !id) {
        fail("ID_INVALID", "고유 ID 생성에 실패했습니다.");
      }
      allIds.add(id);
    }
    occupied.add(id);

    // 태그의 내용과 순서가 같으면 ID를 바꾸더라도 원래 속성 문자열을 보존한다.
    const same = JSON.stringify(before) === JSON.stringify(after);
    const rawTags =
      same && image.rawTags != null ? image.rawTags : encode(after);
    if (id !== image.id || rawTags !== image.rawTags) {
      changes.push({ handle: image.handle, id, rawTags });
      if (id !== image.id) {
        ids++;
      }
      if (rawTags !== image.rawTags) {
        tagChanges++;
      }
    }
  }
  return {
    changes,
    selected: selected.size,
    changed: changes.length,
    ids,
    tagChanges,
  };
}

// Ctrl/Meta·체크박스·Shift 범위 선택은 기존 anchor와 Set 삽입 순서를 따른다.
export class Selection {
  values: Set<string>;
  anchor: string | null;
  constructor() {
    this.values = new Set<string>();
    this.anchor = null;
  }

  click(
    handle: string,
    order: readonly string[],
    {
      ctrlKey = false,
      metaKey = false,
      shiftKey = false,
      checkbox = false,
    }: SelectionModifiers = {},
  ) {
    const additive = ctrlKey || metaKey;
    if (shiftKey && this.anchor && order.includes(this.anchor)) {
      if (!additive) {
        this.values.clear();
      }
      const start = order.indexOf(this.anchor);
      const end = order.indexOf(handle);
      for (const value of order.slice(
        Math.min(start, end),
        Math.max(start, end) + 1,
      )) {
        this.values.add(value);
      }
    } else if (additive || checkbox) {
      if (this.values.has(handle)) {
        this.values.delete(handle);
      } else {
        this.values.add(handle);
      }
      this.anchor = handle;
    } else {
      this.values = new Set([handle]);
      this.anchor = handle;
    }
  }

  all(order: readonly string[]) {
    this.values = new Set(order);
  }

  clear() {
    this.values.clear();
    this.anchor = null;
  }

  retain(order: readonly string[]) {
    const keep = new Set(order);
    for (const handle of this.values) {
      if (!keep.has(handle)) {
        this.values.delete(handle);
      }
    }
    if (!keep.has(this.anchor!)) {
      this.anchor = null;
    }
  }
}
