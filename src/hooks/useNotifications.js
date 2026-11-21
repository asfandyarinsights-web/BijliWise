import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearNotifications, deleteNotification, getDemoNotifications, getNotifications,
  getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
} from "../services/api";

const DATA_CHANGED_EVENT = "bijliwise:data-changed";

// Real mode: everything goes to the server. Demo mode: the fictional list is loaded once and
// read/delete/clear only change this browser's memory. Nothing is ever written for the demo.
export default function useNotifications({ isDemo, open }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await (isDemo ? getDemoNotifications() : getNotifications());
      setItems(data.notifications);
      setUnread(data.unread_count);
      setLoaded(true);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const loadCount = useCallback(async () => {
    if (isDemo) return; // demo count comes from the demo list
    try {
      setUnread((await getUnreadNotificationCount()).unread_count);
    } catch {
      // The badge is best-effort. The panel shows a proper error with Try again when opened.
    }
  }, [isDemo]);

  // Initial count (and the demo list, which is small and fixed).
  useEffect(() => {
    if (isDemo) loadList();
    else loadCount();
  }, [isDemo, loadList, loadCount]);

  // Refresh when the panel opens, when the tab regains focus, and after a bill is saved/changed.
  useEffect(() => { if (open && !isDemo) loadList(); }, [open, isDemo, loadList]);
  useEffect(() => {
    if (isDemo) return undefined;
    const refresh = () => (openRef.current ? loadList() : loadCount());
    window.addEventListener("focus", refresh);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
    };
  }, [isDemo, loadList, loadCount]);

  const run = useCallback(async (serverCall, localUpdate) => {
    setError("");
    try {
      if (!isDemo) await serverCall();
      setItems(localUpdate);
      setItems((cur) => { setUnread(cur.filter((n) => !n.is_read).length); return cur; });
    } catch (err) {
      setError(err.message || "That action could not be completed.");
    }
  }, [isDemo]);

  const markRead = useCallback((id) => run(
    () => markNotificationRead(id),
    (cur) => cur.map((n) => (n.id === id ? { ...n, is_read: true } : n))), [run]);
  const markAllRead = useCallback(() => run(
    markAllNotificationsRead, (cur) => cur.map((n) => ({ ...n, is_read: true }))), [run]);
  const remove = useCallback((id) => run(
    () => deleteNotification(id), (cur) => cur.filter((n) => n.id !== id)), [run]);
  const clearAll = useCallback(() => run(clearNotifications, () => []), [run]);

  return { items, unread, loading, error, loaded, reload: loadList, markRead, markAllRead, remove, clearAll };
}
