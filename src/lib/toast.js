/**
 * EasyBMT — Custom Toast Notification System
 * Drop-in replacement for sonner's toast API.
 * Renders via ToastContainer (place in App.jsx).
 * 
 * Usage:
 *   import { toast } from "@/lib/toast"
 *   toast.success("Saved!")
 *   toast.error("Failed!")
 *   toast.info("Note")
 *   toast.warning("Watch out")
 *   showToast("message", "success")
 */

let _dispatch = null;

export function _registerToastDispatch(fn) {
  _dispatch = fn;
}

let _idCounter = 0;

function addToast(message, type = "info", options = {}) {
  const id = options.id || String(++_idCounter);
  const duration = options.duration ?? (type === "loading" ? 1000 : 3000);

  if (_dispatch) {
    _dispatch({
      action: "add",
      toast: { id, message, type, duration, ...options }
    });
  }
  return id;
}

function dismissToast(id) {
  if (_dispatch && id) {
    _dispatch({ action: "dismiss", id });
  }
}

// ── Main API ──────────────────────────────────────────────────────────────────

export function showToast(message, type = "info") {
  return addToast(message, type);
}

export const toast = {
  success: (msg, opts) => addToast(msg, "success", opts || {}),
  error:   (msg, opts) => addToast(msg, "error",   opts || {}),
  info:    (msg, opts) => addToast(msg, "info",     opts || {}),
  warning: (msg, opts) => addToast(msg, "warning",  opts || {}),
  warn:    (msg, opts) => addToast(msg, "warning",  opts || {}),
  loading: (msg, opts) => addToast(msg, "loading",  opts || {}),
  dismiss: (id) => dismissToast(id),

  promise: (promise, messages = {}) => {
    const id = addToast(messages.loading || "Loading...", "loading", { duration: 1000 });
    promise
      .then((result) => {
        const msg = typeof messages.success === "function" ? messages.success(result) : (messages.success || "Done!");
        addToast(msg, "success", { id }); // Overwrite the loading toast with the same id
      })
      .catch((err) => {
        const msg = typeof messages.error === "function" ? messages.error(err) : (messages.error || "Error!");
        addToast(msg, "error", { id }); // Overwrite the loading toast with the same id
      });
    return promise;
  },
};

export default toast;

