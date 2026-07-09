// Reusable modal shell around the native <dialog id="app-modal">.
// showModal() gives us top-layer stacking, ::backdrop, ESC-to-close and
// focus containment for free — no z-index or focus-trap code needed.

const dialog = document.getElementById("app-modal");
const body = document.getElementById("modal-body");

// app.js attaches its delegated click listeners here (never on the
// innerHTML-injected content itself).
export const modalBody = body;

export function openModal(html) {
  body.innerHTML = html;
  body.scrollTop = 0;
  // Swapping content while already open (e.g. hero modal -> item modal) must
  // not call showModal() again — it throws on an already-open dialog, and
  // routing through close()+showModal() instead races the async "close"
  // event (which clears body.innerHTML) against the new content being set.
  if (!dialog.open) dialog.showModal();
}

export function closeModal() {
  dialog.close();
}

// Backdrop click closes the dialog. Two quirks handled:
// 1) e.target === dialog only when the click lands on ::backdrop or the
//    dialog's own padding — so .app-modal has padding:0 and .modal-body
//    owns all padding (see style.css).
// 2) A text-selection drag that starts inside the content but *ends* on the
//    backdrop still fires click with target === dialog; only close when the
//    press also started on the backdrop.
let pressedOnBackdrop = false;
dialog.addEventListener("pointerdown", (e) => {
  pressedOnBackdrop = e.target === dialog;
});
dialog.addEventListener("click", (e) => {
  if (pressedOnBackdrop && e.target === dialog) dialog.close();
});

dialog.querySelector(".modal-close").addEventListener("click", closeModal);

// Drop stale content so icons/images don't linger into the next open.
dialog.addEventListener("close", () => {
  body.innerHTML = "";
});
