
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3000";
const PAGE_SIZE = 6;

type UserRole = "EMPLOYEE" | "IT_SUPPORT" | "IT_MANAGER" | "ADMIN";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING"
  | "RESOLVED"
  | "CLOSED";

type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  requester?: {
    id?: string;
    name: string;
    email: string;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  sla?: {
    id?: string;
    name: string;
    responseTimeMinutes: number;
    resolutionTimeMinutes: number;
  } | null;
};

type SlaOption = {
  id: string;
  name: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
};

type StatCardProps = {
  label: string;
  value: number | string;
  detail: string;
  icon: string;
  accent: string;
};

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" />
        <path d="M13 8v2m0 4v2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    down: <path d="m7 10 5 5 5-5" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m8 14 4-4 4 4 5-7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 17.5 6L20 12M4 12l2.5 6A7 7 0 0 0 18.4 15" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    laptop: (
      <>
        <rect x="5" y="4" width="14" height="12" rx="1" />
        <path d="M2 20h20l-2-4H4l-2 4Z" />
      </>
    ),
    message: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    PENDING: "Pending",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
  };

  return labels[status] ?? status;
}

function priorityLabel(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 ring-blue-200",
    IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
    PENDING: "bg-orange-50 text-orange-700 ring-orange-200",
    RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? styles.OPEN
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-blue-50 text-blue-700",
    HIGH: "bg-orange-50 text-orange-700",
    CRITICAL: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
        styles[priority] ?? styles.MEDIUM
      }`}
    >
      {priorityLabel(priority)}
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  accent,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon name={icon} size={22} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slas, setSlas] = useState<SlaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("SOFTWARE");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [slaId, setSlaId] = useState("");

  const isITStaff =
    user?.role === "IT_SUPPORT" ||
    user?.role === "IT_MANAGER" ||
    user?.role === "ADMIN";

  const pageTitle =
    user?.role === "EMPLOYEE"
      ? "My Dashboard"
      : user?.role === "IT_SUPPORT"
        ? "IT Support Dashboard"
        : user?.role === "IT_MANAGER"
          ? "IT Operations Dashboard"
          : user?.role === "ADMIN"
            ? "Administration Dashboard"
            : "Dashboard";

  const pageDescription =
    user?.role === "EMPLOYEE"
      ? "Track your requests and stay updated on your tickets."
      : user?.role === "IT_SUPPORT"
        ? "Manage assigned tickets and support requests."
        : user?.role === "IT_MANAGER"
          ? "Monitor ticket operations and service-level performance."
          : user?.role === "ADMIN"
            ? "Monitor the service desk and manage operations."
            : "Welcome to NEXUS ITSM.";

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("nexus_access_token");
  }, []);

  const handleUnauthorized = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("nexus_access_token");
      sessionStorage.removeItem("nexus_user");
    }

    router.replace("/login");
  }, [router]);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        throw new Error("Sesi berakhir. Silakan login kembali.");
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Sesi berakhir. Silakan login kembali.");
      }

      if (!response.ok) {
        let message = `Permintaan gagal (${response.status}).`;

        try {
          const body = await response.json();
          if (typeof body.message === "string") {
            message = body.message;
          } else if (Array.isArray(body.message)) {
            message = body.message.join(", ");
          }
        } catch {
          // Pertahankan pesan default jika respons bukan JSON.
        }

        throw new Error(message);
      }

      if (response.status === 204) return null;

      return response.json();
    },
    [getToken, handleUnauthorized],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ticketData, slaData] = await Promise.all([
        apiFetch("/tickets"),
        apiFetch("/tickets/sla").catch(() => []),
      ]);

      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setSlas(Array.isArray(slaData) ? slaData : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Tidak dapat memuat data dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const savedUser = sessionStorage.getItem("nexus_user");
    const token = sessionStorage.getItem("nexus_access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem("nexus_user");
      }
    }

    void loadDashboard();
  }, [loadDashboard, router]);

  const matchingTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets
      .filter((ticket) => {
        const matchesStatus =
          statusFilter === "ALL" || ticket.status === statusFilter;

        const matchesPriority =
          priorityFilter === "ALL" || ticket.priority === priorityFilter;

        const searchable = [
          ticket.ticketNumber,
          ticket.title,
          ticket.description ?? "",
          ticket.category,
          ticket.status,
          ticket.priority,
          ticket.requester?.name ?? "",
          ticket.requester?.email ?? "",
          ticket.assignedTo?.name ?? "",
          ticket.assignedTo?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesStatus &&
          matchesPriority &&
          (!query || searchable.includes(query))
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(matchingTickets.length / PAGE_SIZE),
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedTickets = matchingTickets.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const firstTicket =
    matchingTickets.length === 0
      ? 0
      : (safeCurrentPage - 1) * PAGE_SIZE + 1;

  const lastTicket = Math.min(
    safeCurrentPage * PAGE_SIZE,
    matchingTickets.length,
  );

  const openCount = tickets.filter(
    (ticket) => ticket.status === "OPEN",
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS",
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) =>
      ticket.status === "RESOLVED" || ticket.status === "CLOSED",
  ).length;

  const myAssignedCount = tickets.filter(
    (ticket) => ticket.assignedTo?.id === user?.id,
  ).length;

  const withSlaCount = tickets.filter((ticket) => ticket.sla).length;

  const stats: StatCardProps[] = useMemo(() => {
    if (user?.role === "EMPLOYEE") {
      return [
        {
          label: "My Tickets",
          value: tickets.length,
          detail: "Total requests submitted",
          icon: "ticket",
          accent: "bg-blue-50 text-blue-700",
        },
        {
          label: "Open Tickets",
          value: openCount,
          detail: "Waiting to be handled",
          icon: "clock",
          accent: "bg-amber-50 text-amber-700",
        },
        {
          label: "In Progress",
          value: inProgressCount,
          detail: "Currently being handled",
          icon: "refresh",
          accent: "bg-violet-50 text-violet-700",
        },
        {
          label: "Resolved",
          value: resolvedCount,
          detail: "Resolved or closed",
          icon: "check",
          accent: "bg-emerald-50 text-emerald-700",
        },
      ];
    }

    if (user?.role === "IT_SUPPORT") {
      return [
        {
          label: "Assigned to Me",
          value: myAssignedCount,
          detail: "Tickets assigned to your account",
          icon: "users",
          accent: "bg-blue-50 text-blue-700",
        },
        {
          label: "Open Tickets",
          value: openCount,
          detail: "Waiting for action",
          icon: "clock",
          accent: "bg-amber-50 text-amber-700",
        },
        {
          label: "In Progress",
          value: inProgressCount,
          detail: "Currently being handled",
          icon: "refresh",
          accent: "bg-violet-50 text-violet-700",
        },
        {
          label: "Resolved",
          value: resolvedCount,
          detail: "Resolved or closed",
          icon: "check",
          accent: "bg-emerald-50 text-emerald-700",
        },
      ];
    }

    if (user?.role === "IT_MANAGER") {
      return [
        {
          label: "Total Tickets",
          value: tickets.length,
          detail: "Tickets visible to operations",
          icon: "ticket",
          accent: "bg-blue-50 text-blue-700",
        },
        {
          label: "Open Tickets",
          value: openCount,
          detail: "Awaiting action",
          icon: "clock",
          accent: "bg-amber-50 text-amber-700",
        },
        {
          label: "In Progress",
          value: inProgressCount,
          detail: "Currently being handled",
          icon: "refresh",
          accent: "bg-violet-50 text-violet-700",
        },
        {
          label: "Tickets with SLA",
          value: withSlaCount,
          detail: "Tickets linked to an SLA",
          icon: "shield",
          accent: "bg-emerald-50 text-emerald-700",
        },
      ];
    }

    return [
      {
        label: "Total Tickets",
        value: tickets.length,
        detail: "Tickets visible to your account",
        icon: "ticket",
        accent: "bg-blue-50 text-blue-700",
      },
      {
        label: "Open Tickets",
        value: openCount,
        detail: "Awaiting action",
        icon: "clock",
        accent: "bg-amber-50 text-amber-700",
      },
      {
        label: "In Progress",
        value: inProgressCount,
        detail: "Currently being handled",
        icon: "refresh",
        accent: "bg-violet-50 text-violet-700",
      },
      {
        label: "Resolved",
        value: resolvedCount,
        detail: "Resolved or closed",
        icon: "check",
        accent: "bg-emerald-50 text-emerald-700",
      },
    ];
  }, [
    user,
    tickets,
    openCount,
    inProgressCount,
    resolvedCount,
    myAssignedCount,
    withSlaCount,
  ]);

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");

    if (title.trim().length < 5) {
      setError("Judul tiket minimal 5 karakter.");
      return;
    }

    if (description.trim().length < 10) {
      setError("Deskripsi tiket minimal 10 karakter.");
      return;
    }

    setCreating(true);

    try {
      const payload: {
        title: string;
        description: string;
        category: string;
        priority: TicketPriority;
        slaId?: string;
      } = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      };

      if (slaId) payload.slaId = slaId;

      await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTitle("");
      setDescription("");
      setCategory("SOFTWARE");
      setPriority("MEDIUM");
      setSlaId("");
      setShowCreateForm(false);
      setNotice("Tiket berhasil dibuat.");

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat tiket.",
      );
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("nexus_access_token");
    sessionStorage.removeItem("nexus_user");
    router.replace("/login");
  }

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCurrentPage(1);
  }

  function changeSearch(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function changeStatus(value: string) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function changePriority(value: string) {
    setPriorityFilter(value);
    setCurrentPage(1);
  }

  const navigation = [
    { label: "Overview", icon: "grid", href: "#overview", active: true },
    { label: "All Tickets", icon: "ticket", href: "#tickets", active: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#101b35] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-950/40">
              <Icon name="shield" size={23} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide">NEXUS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-200">
                IT Service Management
              </p>
            </div>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    item.active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} size={19} />
                  {item.label}
                  {item.active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </a>
              ))}

              {(user?.role === "IT_MANAGER" || user?.role === "ADMIN") && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setNotice(
                      "Informasi SLA tersedia pada bagian SLA Overview di dashboard.",
                    );
                    document
                      .getElementById("sla-overview")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon name="shield" size={19} />
                  SLA Overview
                </button>
              )}
            </nav>
          </div>

          <div className="mt-9 px-4">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              System
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Service Desk
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Centralized IT support and ticket management.
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl px-2 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? "N"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? "NEXUS User"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.role ? formatRole(user.role) : "Loading profile"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          />
        )}

        {/* Main area */}
        <main className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <Icon name="menu" size={22} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500">
                  Workspace / Overview
                </p>
                <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                System operational
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.name ?? "NEXUS User"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user?.role ? formatRole(user.role) : "User"}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-100 font-bold text-blue-700 shadow-sm ring-1 ring-slate-200">
                  {user?.name?.charAt(0).toUpperCase() ?? "N"}
                </div>
              </div>
            </div>
          </header>

          <div
            id="overview"
            className="mx-auto max-w-[1600px] space-y-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-9"
          >
            {/* Welcome banner */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#14264b] via-[#1b3970] to-[#2459a9] p-6 text-white shadow-lg shadow-blue-950/10 sm:p-8">
              <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[35px] border-white/[0.05]" />
              <div className="pointer-events-none absolute -bottom-28 right-44 h-56 w-56 rounded-full border-[25px] border-white/[0.06]" />

              <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-2xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                    <Icon name="calendar" size={14} />
                    IT Service Workspace
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                    {pageDescription}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                  >
                    <Icon name="refresh" size={17} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setShowCreateForm((value) => !value);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-800 shadow-sm transition hover:bg-blue-50"
                  >
                    <Icon name="plus" size={18} />
                    Create Ticket
                  </button>
                </div>
              </div>
            </section>

            {/* Feedback */}
            {error && (
              <div
                role="alert"
                className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <div>
                  <p className="font-semibold">Something went wrong</p>
                  <p className="mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="rounded-lg px-2 py-1 font-semibold hover:bg-red-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <p>{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="rounded-lg px-2 py-1 font-semibold hover:bg-emerald-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Create ticket form */}
            {showCreateForm && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Create a new ticket
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Describe the issue so the IT team can assist you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    aria-label="Close create ticket form"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={handleCreateTicket}
                  className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7"
                >
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ticket-title"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Ticket title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ticket-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      minLength={5}
                      maxLength={150}
                      required
                      placeholder="e.g. Laptop cannot connect to Wi-Fi"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ticket-description"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="ticket-description"
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      minLength={10}
                      maxLength={5000}
                      rows={4}
                      required
                      placeholder="Explain the issue, what you have tried, and how it affects your work..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <p className="mt-1.5 text-right text-xs text-slate-400">
                      {description.length}/5000 characters
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="ticket-category"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Category
                    </label>
                    <select
                      id="ticket-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="HARDWARE">Hardware</option>
                      <option value="SOFTWARE">Software</option>
                      <option value="NETWORK">Network</option>
                      <option value="ACCESS">Access</option>
                      <option value="EMAIL">Email</option>
                      <option value="SECURITY">Security</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ticket-priority"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Priority
                    </label>
                    <select
                      id="ticket-priority"
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value as TicketPriority)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="ticket-sla"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Service-level agreement
                    </label>
                    <select
                      id="ticket-sla"
                      value={slaId}
                      onChange={(event) => setSlaId(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="">Use default / no SLA selected</option>
                      {slas.map((sla) => (
                        <option key={sla.id} value={sla.id}>
                          {sla.name} — response {sla.responseTimeMinutes} min,
                          resolution {sla.resolutionTimeMinutes} min
                        </option>
                      ))}
                    </select>
                    {slas.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        No SLA options are available. You can still create a
                        ticket without selecting an SLA.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? "Creating ticket..." : "Submit ticket"}
                      {!creating && <Icon name="chevron" size={17} />}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Statistics */}
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Service overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    A real-time summary of the ticket data available to you.
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {loading ? "Updating data..." : "Based on current ticket data"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>
            </section>

            {/* Tickets table */}
            <section
              id="tickets"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {user?.role === "EMPLOYEE"
                      ? "My Tickets"
                      : "Recent Tickets"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search, filter, and open tickets to see their details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
                >
                  <Icon name="refresh" size={16} />
                  Refresh list
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:p-5">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Icon name="search" size={18} />
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => changeSearch(event.target.value)}
                    placeholder="Search tickets..."
                    aria-label="Search tickets"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => changeStatus(event.target.value)}
                  aria-label="Filter by status"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) => changePriority(event.target.value)}
                  aria-label="Filter by priority"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Reset filters
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Ticket
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Requester
                      </th>
                      {isITStaff && (
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Assignee
                        </th>
                      )}
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Priority
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Created
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={isITStaff ? 7 : 6} className="px-6 py-5">
                            <div className="h-5 animate-pulse rounded-md bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    ) : displayedTickets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isITStaff ? 7 : 6}
                          className="px-6 py-16 text-center"
                        >
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Icon name="ticket" size={27} />
                          </div>
                          <h3 className="mt-4 font-semibold text-slate-800">
                            No tickets found
                          </h3>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                            {tickets.length === 0
                              ? "There are no tickets available yet."
                              : "Try changing your search or filters."}
                          </p>
                          {tickets.length > 0 && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          onClick={() =>
                            router.push(
                              `/tickets/${encodeURIComponent(ticket.id)}`,
                            )
                          }
                          className="group cursor-pointer transition hover:bg-blue-50/40"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-100">
                                <Icon name="ticket" size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 group-hover:text-blue-700">
                                  {ticket.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {ticket.ticketNumber}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {ticket.category}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {ticket.requester?.name ?? "Unknown"}
                            </p>
                            <p className="mt-1 max-w-[170px] truncate text-xs text-slate-400">
                              {ticket.requester?.email ?? "—"}
                            </p>
                          </td>
                          {isITStaff && (
                            <td className="px-4 py-4">
                              {ticket.assignedTo ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                                    {ticket.assignedTo.name
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <span className="max-w-[130px] truncate text-sm text-slate-600">
                                    {ticket.assignedTo.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">
                                  Unassigned
                                </span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <PriorityBadge priority={ticket.priority} />
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={ticket.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                            {formatDate(ticket.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              aria-label={`Open ticket ${ticket.ticketNumber}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(
                                  `/tickets/${encodeURIComponent(ticket.id)}`,
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                            >
                              View
                              <Icon name="chevron" size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {firstTicket}–{lastTicket}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {matchingTickets.length}
                  </span>{" "}
                  tickets
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1 || loading}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="min-w-20 text-center text-sm text-slate-500">
                    Page{" "}
                    <span className="font-semibold text-slate-800">
                      {safeCurrentPage}
                    </span>{" "}
                    of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages || loading}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1),
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>

            {/* SLA overview */}
            <section id="sla-overview">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    SLA Overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configured response and resolution targets.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <Icon name="shield" size={14} />
                  Service-level agreements
                </div>
              </div>

              {slas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon name="shield" size={24} />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-800">
                    No SLA information available
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    SLA data could not be loaded or no SLA has been configured.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {slas.map((sla) => (
                    <div
                      key={sla.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Icon name="shield" size={22} />
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Configured
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900">
                        {sla.name}
                      </h3>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Response time</p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {sla.responseTimeMinutes}
                            <span className="ml-1 text-xs font-medium text-slate-500">
                              min
                            </span>
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Resolution</p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {sla.resolutionTimeMinutes}
                            <span className="ml-1 text-xs font-medium text-slate-500">
                              min
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Footer */}
            <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date(2026, 0, 1).getFullYear()} NEXUS ITSM. Enterprise Service Management.
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected to NEXUS API
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
