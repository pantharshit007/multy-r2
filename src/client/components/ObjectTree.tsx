import { useMemo, useState } from "react";
import type { TreeContentsProps, ObjectTreeProps } from "../types/objectTree";
import { buildObjectTree } from "../utils/objectTree";
import { ChevronRightIcon, FolderIcon, PlusIcon, TrashIcon } from "./Icons";
import { ObjectRow } from "./ObjectRow";
import { TreeFolderEditor } from "./TreeFolderEditor";

/** Render selectable folders with inline creation and collapse controls. */
export function ObjectTree(props: ObjectTreeProps) {
  const root = useMemo(() => buildObjectTree(props.objects), [props.objects]);
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  /** Select a folder and toggle its expanded state. */
  function toggle(path: string) {
    setSelected(path);
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }
  /** Open an inline editor inside the selected folder. */
  function startCreating() {
    setExpanded((current) => new Set([...current, selected]));
    setEditing(selected);
  }
  return <div aria-label="Folder tree" className="pb-2">
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-inset px-3 py-2">
      <button type="button" disabled={editing !== null} onClick={() => setSelected("")} className="tree-hover min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted" aria-label="Select bucket root" title="Select bucket root">/{selected && `${selected}/`}</button>
      <button type="button" disabled={editing !== null} onClick={startCreating} title={`Create folder in ${selected || "bucket root"}`} className="btn btn-ghost h-8 px-2.5 text-xs disabled:opacity-40"><PlusIcon className="size-3.5" /><span>New folder</span></button>
      <button type="button" disabled={!root.folders.length || editing !== null} onClick={() => setExpanded(new Set())} aria-label="Collapse all" title="Collapse all" className="icon-btn disabled:opacity-40">
        <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 3H4a1 1 0 0 0-1 1v12M9 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><path d="M11 14.5h7" /></svg>
      </button>
    </div>
    {props.hasMore && <p className="px-5 py-2 text-xs text-muted">Showing loaded objects. Load more below to reveal additional files and folders.</p>}
    <div className="px-2 pt-2"><TreeContents {...props} node={root} selected={selected} expanded={expanded} editing={editing}
      onSelect={setSelected} onToggle={toggle} onCancel={() => setEditing(null)}
      onCreated={(path) => { setEditing(null); props.onCreated(path); }} /></div>
  </div>;
}

/** Render one directory level and recurse into expanded children. */
function TreeContents({ node, ...props }: TreeContentsProps) {
  return <>
    {props.editing === node.path && <TreeFolderEditor parent={node.path} record={props.record} onCancel={props.onCancel} onCreated={props.onCreated} />}
    {node.folders.map((folder) => <div key={folder.path}>
      <div className={`tree-hover flex items-center gap-2 rounded-lg pr-1 ${props.selected === folder.path ? "tree-selected" : ""}`}>
        <button type="button" disabled={props.editing !== null} aria-expanded={props.expanded.has(folder.path)} onFocus={() => props.onSelect(folder.path)} onClick={() => props.onToggle(folder.path)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-fg">
          <ChevronRightIcon aria-hidden="true" className={`size-3.5 shrink-0 text-subtle transition-transform ${props.expanded.has(folder.path) ? "rotate-90" : ""}`} />
          <FolderIcon className="size-4 shrink-0 text-accent" />
          <span className="min-w-0 truncate font-medium" title={`${folder.path}/`}>{folder.name || "(empty path segment)"}</span>
          <span className="ml-auto shrink-0 text-xs text-subtle tabular-nums">{folder.folders.length + folder.files.length} {folder.folders.length + folder.files.length === 1 ? "item" : "items"}{props.hasMore ? " loaded" : ""}</span>
        </button>
        {folder.placeholders.map((object) => <button key={object.key} type="button" aria-label={`Remove folder entry ${object.key}`} title="Remove folder entry; files inside are kept" onClick={() => props.onDelete(object)} className="icon-btn icon-btn-danger"><TrashIcon className="size-4" /></button>)}
      </div>
      {props.expanded.has(folder.path) && <div className="ml-[1.1rem] border-l border-line pl-1.5"><TreeContents node={folder} {...props} /></div>}
    </div>)}
    {node.files.map((object) => <div key={object.key} onFocus={() => props.onSelect(node.path)} onClick={() => props.onSelect(node.path)}><ObjectRow record={props.record} object={object} compact
      onDelete={() => props.onDelete(object)} onError={props.onError} onStatus={props.onStatus} /></div>)}
  </>;
}
