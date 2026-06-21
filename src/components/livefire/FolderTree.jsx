import React, { useState } from "react";
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, Plus,
  Trash2, Edit2, Check, X, AlertTriangle
} from "lucide-react";

function buildTree(folders, parentId = null, excludeFolderId = null) {
  return folders
    .filter(f => (f.parent_folder_id || null) === parentId && f.id !== excludeFolderId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(f => ({ ...f, children: buildTree(folders, f.id, excludeFolderId) }));
}

function TreeNode({ node, depth = 0, selectedId, onSelect, onCreateSub, onRename, onDelete, onDrop, onMoveFolder, allFolders }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleRename = () => {
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName.trim());
    }
    setEditing(false);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("folderId", node.id);
    e.dataTransfer.setData("dragType", "folder");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Don't allow dropping on self or descendant
    const srcFolderId = e.dataTransfer.getData("folderId");
    const dragType = e.dataTransfer.getData("dragType");
    if (dragType === "folder" && (srcFolderId === node.id || isDescendant(allFolders, srcFolderId, node.id))) {
      return;
    }
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dragType = e.dataTransfer.getData("dragType");
    if (dragType === "folder") {
      const folderId = e.dataTransfer.getData("folderId");
      if (folderId && folderId !== node.id) {
        onMoveFolder(folderId, node.id);
      }
    } else {
      const labId = e.dataTransfer.getData("labId");
      if (labId) {
        onDrop(labId, node.id);
      }
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    onDelete(node.id);
    setConfirmDelete(false);
  };

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={() => onSelect(isSelected ? null : node.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer group transition-all text-sm
          ${isSelected ? "bg-red-900/30 text-red-300 border border-red-700/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}
          ${dragOver ? "border border-green-500/40 bg-green-900/20" : "border border-transparent"}
        `}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="p-0.5 rounded hover:bg-gray-700/50 shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-amber-500/50 shrink-0" />
        )}

        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-600 text-white text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-red-500"
              autoFocus
            />
            <button onClick={handleRename} className="p-0.5 hover:text-green-400"><Check className="h-3 w-3" /></button>
            <button onClick={() => setEditing(false)} className="p-0.5 hover:text-red-400"><X className="h-3 w-3" /></button>
          </div>
        ) : confirmDelete ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
            <span className="text-[10px] text-red-400 font-mono">Delete?</span>
            <button onClick={handleConfirmDelete} className="px-1 py-0.5 bg-red-800 hover:bg-red-700 text-red-200 text-[9px] font-mono rounded">Yes</button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[9px] font-mono rounded">No</button>
          </div>
        ) : (
          <span className="flex-1 truncate text-xs font-mono">{node.name}</span>
        )}

        {!editing && !confirmDelete && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onCreateSub(node.id); }}
              className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-amber-400"
              title="New subfolder"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(node.name); }}
              className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-cyan-400"
              title="Rename"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400"
              title="Delete folder"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
        <span className="text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab ml-0.5" title="Drag to move">⠿</span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateSub={onCreateSub}
              onRename={onRename}
              onDelete={onDelete}
              onDrop={onDrop}
              onMoveFolder={onMoveFolder}
              allFolders={allFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isDescendant(folders, ancestorId, descendantId) {
  const children = folders.filter(f => f.parent_folder_id === ancestorId);
  for (const child of children) {
    if (child.id === descendantId) return true;
    if (isDescendant(folders, child.id, descendantId)) return true;
  }
  return false;
}

export default function FolderTree({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder, onMoveLab, onMoveFolder, isCreating = false, folderError = null, onDismissError }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingParentId, setCreatingParentId] = useState(null);

  const tree = buildTree(folders);

  // Close input when mutation succeeds (isPending changes from true to false)
  const [wasCreating, setWasCreating] = useState(false);
  if (wasCreating && !isCreating && creating) {
    setNewName("");
    setCreating(false);
    setCreatingParentId(null);
    setWasCreating(false);
  }
  if (isCreating && creating) {
    if (!wasCreating) setWasCreating(true);
  }

  const handleCreate = (parentId = null) => {
    if (newName.trim() && !isCreating) {
      onCreateFolder(newName.trim(), parentId);
    }
  };

  const startCreate = (parentId = null) => {
    setCreating(true);
    setCreatingParentId(parentId);
    setNewName("");
  };

  return (
    <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/20">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Folder className="h-4 w-4 text-amber-500" /> Folders
        </h2>
        <button
          onClick={() => startCreate(null)}
          className="p-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-700/40 transition-colors"
          title="New root folder"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* "All Labs" root — also accepts folder drops to move to root */}
        <div
          onClick={() => onSelectFolder(null)}
          onDragOver={(e) => {
            const dragType = e.dataTransfer.getData("dragType");
            if (dragType === "folder") { e.preventDefault(); }
          }}
          onDrop={(e) => {
            const dragType = e.dataTransfer.getData("dragType");
            if (dragType === "folder") {
              e.preventDefault();
              const folderId = e.dataTransfer.getData("folderId");
              if (folderId && onMoveFolder) onMoveFolder(folderId, null);
            }
          }}
          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all text-sm mb-1
            ${!selectedFolderId ? "bg-red-900/30 text-red-300 border border-red-700/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent"}
          `}
        >
          <Folder className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-mono">All Labs</span>
        </div>

        {/* Tree */}
        {tree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            selectedId={selectedFolderId}
            onSelect={onSelectFolder}
            onCreateSub={(parentId) => startCreate(parentId)}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
            onDrop={onMoveLab}
            onMoveFolder={onMoveFolder}
            allFolders={folders}
          />
        ))}

        {tree.length === 0 && !creating && (
          <p className="text-[10px] text-gray-600 font-mono text-center py-4">
            No folders yet. Click + to create one.
          </p>
        )}

        {/* Error display */}
        {folderError && (
          <div className="mx-2 mt-2 p-2 bg-red-900/30 border border-red-700/40 rounded-lg flex items-center justify-between">
            <span className="text-[10px] text-red-300 font-mono">{folderError}</span>
            {onDismissError && (
              <button onClick={onDismissError} className="text-red-400 hover:text-red-300 text-xs leading-none">&times;</button>
            )}
          </div>
        )}

        {/* Create new folder input */}
        {creating && (
          <div className="flex items-center gap-1 mt-2 pl-2" style={{ paddingLeft: creatingParentId ? "24px" : "8px" }}>
            <Folder className="h-3.5 w-3.5 text-amber-500/50 shrink-0" />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCreate(creatingParentId);
                if (e.key === "Escape" && !isCreating) { setCreating(false); setCreatingParentId(null); }
              }}
              placeholder="Folder name..."
              disabled={isCreating}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              autoFocus
            />
            {isCreating ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            ) : (
              <>
                <button onClick={() => handleCreate(creatingParentId)} className="p-1 hover:text-green-400 text-gray-500"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setCreating(false); setCreatingParentId(null); }} className="p-1 hover:text-red-400 text-gray-500"><X className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}