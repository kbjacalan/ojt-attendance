import { useEffect, useRef, useState } from "react";
import { Ellipsis } from "lucide-react";

/**
 * Row-level overflow menu for the admin Students table. Collapses the
 * per-row actions (View DTR, Edit, Approve/Reject, Activate/Deactivate,
 * Delete) behind one ⋯ button so rows stay slim — one menu per row,
 * built from caller-supplied items so approval-gating stays with the
 * row data, not in here.
 *
 * Keyboard: Enter/Space opens (native button), Esc closes and returns
 * focus to the trigger, ArrowDown/Up/Home/End move between items.
 * Clicking outside closes. Items shape:
 *   { key, label, icon: <Icon/>, danger?: bool, onSelect: () => void }
 */
export default function StudentRowMenu({ items, label = "Row actions" }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function focusItem(index) {
    const count = items.length;
    const next = ((index % count) + count) % count;
    itemRefs.current[next]?.focus();
  }

  function handleItemKeyDown(e, index) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(items.length - 1);
    }
  }

  function handleSelect(item) {
    setOpen(false);
    buttonRef.current?.focus();
    item.onSelect();
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter") && !open) {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => focusItem(0));
          }
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-border/50 hover:text-text-primary aria-expanded:bg-border/50 aria-expanded:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
      >
        <Ellipsis className="w-4 h-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="menu-in absolute right-0 top-full mt-2 w-52 z-30 bg-bg-primary border border-border rounded-2xl shadow-modal p-1.5 origin-top-right"
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => handleItemKeyDown(e, index)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-left transition-colors focus:outline-none focus-visible:bg-bg-secondary ${
                item.danger
                  ? "text-error hover:bg-error-subtle"
                  : "text-text-primary hover:bg-bg-secondary"
              }`}
            >
              <span className="w-4 h-4 shrink-0 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
