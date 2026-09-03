import type { BodyRuntime } from "./types";

export interface TreeActionHandlers {
  onSelect: (body: BodyRuntime) => void;
  onToggleBody: (body: BodyRuntime, visible: boolean) => void;
  onToggleBelt: (name: string, visible: boolean) => void;
}

const KIND_DOT: Record<string, string> = {
  star: "dot-star",
  planet: "dot-planet",
  dwarf: "dot-dwarf",
  moon: "dot-moon",
  comet: "dot-comet",
  mission: "dot-mission",
};

export function buildBodyTree(
  root: HTMLElement,
  bodies: BodyRuntime[],
  handlers: TreeActionHandlers,
): {
  setSelected: (name: string | null) => void;
  expandTo: (name: string) => void;
} {
  root.replaceChildren();

  const byName = new Map<string, HTMLElement>();
  const sun = bodies.find((b) => b.data.kind === "star");
  const planets = bodies.filter((b) => b.data.kind === "planet");
  const dwarfs = bodies.filter((b) => b.data.kind === "dwarf");
  const comets = bodies.filter((b) => b.data.kind === "comet");
  const missions = bodies.filter((b) => b.data.kind === "mission");

  const tree = document.createElement("ul");
  tree.className = "tree-root";
  tree.setAttribute("role", "tree");

  const solar = makeGroup("Sistema Solar", true);
  tree.append(solar.li);

  if (sun) {
    solar.children.append(makeBodyNode(sun, 0, handlers, byName));
  }

  const planetGroup = makeGroup("Planetas", true);
  solar.children.append(planetGroup.li);
  for (const planet of planets) {
    planetGroup.children.append(makeBodyBranch(planet, handlers, byName));
  }

  const dwarfGroup = makeGroup("Planetas-anões", true);
  solar.children.append(dwarfGroup.li);
  for (const dwarf of dwarfs) {
    dwarfGroup.children.append(makeBodyBranch(dwarf, handlers, byName));
  }

  if (comets.length) {
    const cometGroup = makeGroup("Cometas", true);
    solar.children.append(cometGroup.li);
    for (const comet of comets) cometGroup.children.append(makeBodyNode(comet, 0, handlers, byName));
  }

  if (missions.length) {
    const missionGroup = makeGroup("Missões", true);
    solar.children.append(missionGroup.li);
    for (const mission of missions) {
      missionGroup.children.append(makeBodyNode(mission, 0, handlers, byName));
    }
  }

  const beltGroup = makeGroup("Cinturões", true);
  solar.children.append(beltGroup.li);
  beltGroup.children.append(
    makeBeltNode("Cinturão de asteroides", handlers),
    makeBeltNode("Cinturão de Kuiper", handlers),
  );

  root.append(tree);

  function setSelected(name: string | null): void {
    root.querySelectorAll(".tree-label.is-selected").forEach((el) => {
      el.classList.remove("is-selected");
    });
    if (!name) return;
    const row = byName.get(name);
    row?.querySelector(".tree-label")?.classList.add("is-selected");
  }

  function expandTo(name: string): void {
    const row = byName.get(name);
    if (!row) return;
    let node: HTMLElement | null = row;
    while (node && node !== root) {
      if (node.matches("li.tree-node")) {
        node.classList.add("is-open");
        const btn = node.querySelector<HTMLButtonElement>(":scope > .tree-row > .tree-twist");
        if (btn) btn.setAttribute("aria-expanded", "true");
      }
      node = node.parentElement;
    }
    row.scrollIntoView({ block: "nearest" });
  }

  return { setSelected, expandTo };
}

function makeGroup(label: string, open: boolean): { li: HTMLLIElement; children: HTMLUListElement } {
  const li = document.createElement("li");
  li.className = "tree-node tree-group";
  if (open) li.classList.add("is-open");

  const row = document.createElement("div");
  row.className = "tree-row";

  const twist = document.createElement("button");
  twist.type = "button";
  twist.className = "tree-twist";
  twist.setAttribute("aria-expanded", String(open));
  twist.setAttribute("aria-label", open ? "Recolher" : "Expandir");
  twist.addEventListener("click", (e) => {
    e.stopPropagation();
    const next = !li.classList.contains("is-open");
    li.classList.toggle("is-open", next);
    twist.setAttribute("aria-expanded", String(next));
    twist.setAttribute("aria-label", next ? "Recolher" : "Expandir");
  });

  const title = document.createElement("span");
  title.className = "tree-group-label";
  title.textContent = label;

  row.append(twist, title);
  const children = document.createElement("ul");
  children.className = "tree-children";
  children.setAttribute("role", "group");

  li.append(row, children);
  return { li, children };
}

function makeBodyBranch(
  body: BodyRuntime,
  handlers: TreeActionHandlers,
  byName: Map<string, HTMLElement>,
): HTMLLIElement {
  if (!body.children.length) {
    return makeBodyNode(body, 0, handlers, byName);
  }

  const li = document.createElement("li");
  li.className = "tree-node is-open";
  byName.set(body.data.name, li);

  const row = document.createElement("div");
  row.className = "tree-row";

  const twist = document.createElement("button");
  twist.type = "button";
  twist.className = "tree-twist";
  twist.setAttribute("aria-expanded", "true");
  twist.addEventListener("click", (e) => {
    e.stopPropagation();
    const next = !li.classList.contains("is-open");
    li.classList.toggle("is-open", next);
    twist.setAttribute("aria-expanded", String(next));
  });

  row.append(twist, makeBodyControls(body, handlers));
  const children = document.createElement("ul");
  children.className = "tree-children";
  for (const child of body.children) {
    children.append(makeBodyNode(child, 1, handlers, byName));
  }
  li.append(row, children);
  return li;
}

function makeBodyNode(
  body: BodyRuntime,
  _depth: number,
  handlers: TreeActionHandlers,
  byName: Map<string, HTMLElement>,
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "tree-node tree-leaf";
  byName.set(body.data.name, li);

  const row = document.createElement("div");
  row.className = "tree-row";
  const spacer = document.createElement("span");
  spacer.className = "tree-twist is-leaf";
  row.append(spacer, makeBodyControls(body, handlers));
  li.append(row);
  return li;
}

function makeBodyControls(body: BodyRuntime, handlers: TreeActionHandlers): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "tree-item";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = true;
  check.title = "Mostrar / ocultar";
  check.addEventListener("click", (e) => e.stopPropagation());
  check.addEventListener("change", () => {
    handlers.onToggleBody(body, check.checked);
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tree-label";
  btn.title = `Focar em ${body.data.name}`;

  const dot = document.createElement("span");
  dot.className = `tree-dot ${KIND_DOT[body.data.kind] ?? "dot-planet"}`;

  const text = document.createElement("span");
  text.textContent = body.data.name;

  btn.append(dot, text);
  btn.addEventListener("click", () => handlers.onSelect(body));

  wrap.append(check, btn);
  return wrap;
}

function makeBeltNode(name: string, handlers: TreeActionHandlers): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "tree-node tree-leaf";

  const row = document.createElement("div");
  row.className = "tree-row";

  const spacer = document.createElement("span");
  spacer.className = "tree-twist is-leaf";

  const wrap = document.createElement("div");
  wrap.className = "tree-item";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = true;
  check.title = "Mostrar / ocultar";
  check.dataset.belt = name;
  check.addEventListener("change", () => handlers.onToggleBelt(name, check.checked));

  const label = document.createElement("span");
  label.className = "tree-label is-static";
  const dot = document.createElement("span");
  dot.className = "tree-dot dot-belt";
  const text = document.createElement("span");
  text.textContent = name.replace("Cinturão de ", "");
  label.append(dot, text);

  wrap.append(check, label);
  row.append(spacer, wrap);
  li.append(row);
  return li;
}
