"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3000";

type TicketUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

type TicketSla = {
  id?: string;
  name: string;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
};

type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
  requester?: TicketUser | null;
  assignedTo?: TicketUser | null;
  sla?: TicketSla | null;
  slaId?: string | null;
};

type TicketComment = {
  id: string;
  content: string;
  createdAt: string;
  user?: TicketUser | null;
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-violet-200 bg-violet-50 text-violet-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-600",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

function formatLabel(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "NU";

  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "NU"
  );
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message = (data as { message?: unknown }).message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-base font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default function TicketDetailClient({
  ticketId,
}: {
  ticketId: string;
}) {
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [currentUser, setCurrentUser] = useState<TicketUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [assigneeId, setAssigneeId] = useState("");
  const [commentText, setCommentText] = useState("");

  const role = currentUser?.role ?? "";
  const canManageTicket = [
    "ADMIN",
    "IT_MANAGER",
    "IT_SUPPORT",
  ].includes(role);

  const signOut = useCallback(() => {
    sessionStorage.removeItem("nexus_access_token");
    sessionStorage.removeItem("nexus_user");
    router.replace("/login");
  }, [router]);

  const getToken = useCallback(() => {
    return sessionStorage.getItem("nexus_access_token");
  }, []);

  const loadTicket = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/tickets/${encodeURIComponent(ticketId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        signOut();
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Gagal memuat tiket (${response.status}).`),
        );
      }

      const loadedTicket = data as Ticket;

      setTicket(loadedTicket);
      setSelectedStatus(loadedTicket.status || "OPEN");
      setAssigneeId(loadedTicket.assignedTo?.id || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat detail tiket.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, router, signOut, ticketId]);

  const loadComments = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoadingComments(true);

      const response = await fetch(
        `${API_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        signOut();
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Gagal memuat komentar (${response.status}).`,
          ),
        );
      }

      if (Array.isArray(data)) {
        setComments(data as TicketComment[]);
      } else {
        setComments([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat komentar.",
      );
    } finally {
      setLoadingComments(false);
    }
  }, [getToken, router, signOut, ticketId]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("nexus_user");

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser) as TicketUser);
      } catch {
        sessionStorage.removeItem("nexus_user");
      }
    }

    void loadTicket();
    void loadComments();
  }, [loadTicket, loadComments]);

  const updateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!ticket) return;

    if (selectedStatus === ticket.status) {
      setError("Status tiket belum berubah.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setSavingStatus(true);

    try {
      const response = await fetch(
        `${API_URL}/tickets/${encodeURIComponent(ticketId)}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );

      if (response.status === 401) {
        signOut();
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Status gagal diperbarui (${response.status}).`,
          ),
        );
      }

      setSuccess("Status tiket berhasil diperbarui.");
      await loadTicket();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui status.",
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const updateAssignment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!assigneeId.trim()) {
      setError("Masukkan ID akun petugas IT yang akan ditugaskan.");
      return;
    }

    setSavingAssignment(true);

    try {
      const response = await fetch(
        `${API_URL}/tickets/${encodeURIComponent(ticketId)}/assign`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedToId: assigneeId.trim(),
          }),
        },
      );

      if (response.status === 401) {
        signOut();
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Assignment gagal diperbarui (${response.status}).`,
          ),
        );
      }

      setSuccess("Assignment tiket berhasil diperbarui.");
      await loadTicket();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui assignment.",
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const content = commentText.trim();

    if (content.length < 2) {
      setError("Komentar minimal 2 karakter.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setSendingComment(true);

    try {
      const response = await fetch(
        `${API_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      );

      if (response.status === 401) {
        signOut();
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Komentar gagal dikirim (${response.status}).`,
          ),
        );
      }

      setCommentText("");
      setSuccess("Komentar berhasil dikirim.");
      await loadComments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengirim komentar.",
      );
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-800">
            Loading ticket details...
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mengambil informasi tiket dari server.
          </p>
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
            !
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Ticket unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Detail tiket tidak dapat ditampilkan. Tiket mungkin tidak
            ditemukan atau akunmu tidak memiliki akses.
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-left text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ← Back to Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1500px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-extrabold text-white shadow-sm">
              N
            </div>
            <div>
              <p className="text-base font-extrabold tracking-wide text-slate-900">
                NEXUS
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                IT Service Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">
                {currentUser?.name || currentUser?.email || "NEXUS User"}
              </p>
              <p className="text-[11px] text-slate-500">
                {formatLabel(role)}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-2 ring-blue-100">
              {getInitials(currentUser?.name)}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-medium transition hover:text-blue-600"
          >
            Workspace
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-medium transition hover:text-blue-600"
          >
            All Tickets
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">
            {ticket.ticketNumber}
          </span>
        </div>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div>
              <p className="font-bold">Something went wrong</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
              aria-label="Dismiss success"
            >
              ×
            </button>
          </div>
        )}

        {/* Ticket hero */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#14284e] via-[#1c3e78] to-[#2860ae] p-6 text-white shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[24px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 right-32 h-56 w-56 rounded-full border-[18px] border-white/5" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-blue-50">
                {ticket.ticketNumber}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                  ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                    ? "border-emerald-200/40 bg-emerald-400/15 text-emerald-100"
                    : "border-white/20 bg-white/10 text-white"
                }`}
              >
                {formatLabel(ticket.status)}
              </span>
            </div>

            <h1 className="mt-4 max-w-4xl break-words text-2xl font-bold tracking-tight sm:text-3xl">
              {ticket.title}
            </h1>

            <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-blue-100">
              {ticket.description || "No description provided."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-blue-100">
              <span className="flex items-center gap-2">
                <span>◷</span>
                Created {formatDate(ticket.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <span>▤</span>
                {formatLabel(ticket.category)}
              </span>
              <span className="flex items-center gap-2">
                <span>⚑</span>
                {formatLabel(ticket.priority)} priority
              </span>
            </div>
          </div>
        </section>

        {/* Main grid */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            {/* Description and metadata */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                eyebrow="Ticket information"
                title="Ticket Details"
                description="Informasi utama dan metadata permintaan layanan."
              />

              <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <DetailItem
                  label="Ticket number"
                  value={ticket.ticketNumber}
                />
                <DetailItem
                  label="Category"
                  value={formatLabel(ticket.category)}
                />
                <DetailItem
                  label="Priority"
                  value={formatLabel(ticket.priority)}
                />
                <DetailItem
                  label="Current status"
                  value={formatLabel(ticket.status)}
                />
                <DetailItem
                  label="Created at"
                  value={formatDate(ticket.createdAt)}
                />
                <DetailItem
                  label="Last updated"
                  value={formatDate(ticket.updatedAt || ticket.createdAt)}
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-500">
                  Full description
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {ticket.description || "No description provided."}
                </p>
              </div>
            </section>

            {/* Discussion */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  eyebrow="Communication"
                  title="Discussion & Comments"
                  description="Percakapan dan pembaruan terkait tiket ini."
                />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {comments.length} comments
                </span>
              </div>

              {/* Add comment */}
              <form
                onSubmit={addComment}
                className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {getInitials(currentUser?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">
                      {currentUser?.name || currentUser?.email || "You"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Add an update to this ticket
                    </p>
                  </div>
                </div>

                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={3}
                  maxLength={3000}
                  placeholder="Write a comment or provide an update..."
                  className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {commentText.length}/3000 characters
                  </span>
                  <button
                    type="submit"
                    disabled={sendingComment || !commentText.trim()}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingComment ? "Sending..." : "Send Comment →"}
                  </button>
                </div>
              </form>

              {/* Comment history */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Comment history
                </h3>

                {loadingComments ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-400">
                      ☰
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No comments yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Jadilah yang pertama memberikan pembaruan.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {comments.map((comment) => (
                      <article
                        key={comment.id}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                          {getInitials(comment.user?.name)}
                        </div>

                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {comment.user?.name ||
                                  comment.user?.email ||
                                  "NEXUS User"}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {formatDate(comment.createdAt)}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {comment.content}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void loadComments()}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  ↻ Refresh comments
                </button>
              </div>
            </section>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Requester */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading title="Requester" description="Ticket submitted by" />

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {getInitials(ticket.requester?.name)}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-slate-800">
                    {ticket.requester?.name || "Unknown requester"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {ticket.requester?.email || "No email available"}
                  </p>
                </div>
              </div>
            </section>

            {/* Assignment */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                title="Assignment"
                description="Petugas IT yang bertanggung jawab."
              />

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Currently assigned to
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {getInitials(ticket.assignedTo?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-slate-800">
                      {ticket.assignedTo?.name || "Unassigned"}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {ticket.assignedTo?.email || "No assignee email"}
                    </p>
                  </div>
                </div>
              </div>

              {canManageTicket && (
                <form onSubmit={updateAssignment} className="mt-5 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-700">
                      Assignee user ID
                    </span>
                    <input
                      value={assigneeId}
                      onChange={(event) => setAssigneeId(event.target.value)}
                      placeholder="Masukkan ID akun petugas"
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <p className="text-[11px] leading-5 text-slate-500">
                    Masukkan ID pengguna yang valid. Kosongkan tidak akan
                    menghapus assignment.
                  </p>

                  <button
                    type="submit"
                    disabled={
                      savingAssignment ||
                      !assigneeId.trim() ||
                      assigneeId.trim() === ticket.assignedTo?.id
                    }
                    className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingAssignment ? "Saving..." : "Update Assignment"}
                  </button>
                </form>
              )}

              {!canManageTicket && (
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  Assignment hanya dapat diubah oleh IT Support, IT Manager,
                  atau Admin.
                </p>
              )}
            </section>

            {/* Status management */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                title="Ticket Status"
                description="Perbarui progres penanganan tiket."
              />

              <div className="mt-5">
                <p className="text-xs font-medium text-slate-500">
                  Current status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.OPEN}`}
                >
                  {formatLabel(ticket.status)}
                </span>
              </div>

              {canManageTicket ? (
                <form onSubmit={updateStatus} className="mt-5 space-y-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-700">
                      New status
                    </span>
                    <select
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={
                      savingStatus || selectedStatus === ticket.status
                    }
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStatus ? "Updating..." : "Update Status"}
                  </button>
                </form>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  Kamu dapat melihat status tiket, tetapi tidak memiliki izin
                  untuk mengubahnya.
                </p>
              )}
            </section>

            {/* SLA */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#14284e] to-[#2457a0] p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                  Service level agreement
                </p>
                <h2 className="mt-2 text-base font-bold">SLA Policy</h2>
                <p className="mt-1 text-xs text-blue-100">
                  Target waktu respons dan penyelesaian.
                </p>
              </div>

              <div className="p-5">
                {ticket.sla ? (
                  <>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[11px] font-semibold text-emerald-700">
                        Active policy
                      </p>
                      <p className="mt-1 break-words text-base font-bold text-emerald-900">
                        {ticket.sla.name}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">
                          Response time
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {ticket.sla.responseTimeMinutes ?? "—"}
                        </p>
                        <p className="text-[10px] text-slate-500">minutes</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] text-slate-500">
                          Resolution time
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {ticket.sla.resolutionTimeMinutes ?? "—"}
                        </p>
                        <p className="text-[10px] text-slate-500">minutes</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-3 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600">
                      ◷
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      No SLA assigned
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tiket ini belum terhubung dengan kebijakan SLA.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Quick actions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading title="Quick Actions" />

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span>← Back to Dashboard</span>
                  <span className="text-slate-400">›</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    void loadTicket();
                    void loadComments();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span>↻ Refresh details</span>
                  <span className="text-slate-400">›</span>
                </button>
              </div>
            </section>
          </aside>
        </div>

        <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
          NEXUS ITSM · Enterprise Service Management
        </footer>
      </main>
    </div>
  );
}