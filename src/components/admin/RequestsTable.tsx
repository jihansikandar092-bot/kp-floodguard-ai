import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { districtListOptions } from "@/lib/api/district-query";
import {
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_LABEL,
  REQUEST_STATUSES,
  STATUS_BADGE,
  STATUS_LABEL,
  type EmergencyRequest,
  type RequestStatus,
} from "@/lib/emergency";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEmergencyRequests, updateEmergencyStatus } from "@/lib/api/requests.functions";
import { useCoordinator } from "@/lib/api/use-coordinator";

import { formatPkt, filterRequests } from "@/lib/request-display";
const ALL = "all";

export function RequestsTable() {
  const { signedIn, checking } = useCoordinator();
  const listFn = useServerFn(listEmergencyRequests);
  const list = useQuery({
    queryKey: ["emergency-requests"],
    queryFn: () => listFn(),
    enabled: signedIn === true,
    retry: false,
  });
  if (checking || (signedIn && list.isLoading))
    return <Blocked text="Checking coordinator access…" />;
  if (!signedIn)
    return (
      <Blocked text="Coordinator sign-in required. Emergency requests are visible only to verified coordinators." />
    );
  if (list.isError) return <Blocked text="Requests temporarily unavailable." />;
  if (!list.data?.authorized)
    return <Blocked text="Your account does not have the coordinator role. Access denied." />;
  return <RequestsView requests={list.data.requests} />;
}

function Blocked({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card"
    >
      {text}
    </p>
  );
}

function RequestsView({ requests }: { requests: EmergencyRequest[] }) {
  const [district, setDistrict] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [q, setQ] = useState("");

  const { data: districtList } = useQuery(districtListOptions());
  const districtOptions = useMemo(
    () =>
      Array.from(
        new Set([...(districtList ?? []).map((d) => d.name), ...requests.map((r) => r.district)]),
      ).sort(),
    [requests, districtList],
  );
  const rows = useMemo(
    () => filterRequests(requests, { district, type, status, q }),
    [requests, district, type, status, q],
  );

  const counts = useMemo(() => {
    const c: Record<RequestStatus, number> = { pending: 0, review: 0, progress: 0, resolved: 0 };
    requests.forEach((r) => c[r.status]++);
    return c;
  }, [requests]);

  const qc = useQueryClient();
  const updateFn = useServerFn(updateEmergencyStatus);
  const mutation = useMutation({
    mutationFn: (v: { r: EmergencyRequest; s: RequestStatus }) =>
      updateFn({ data: { id: v.r.id, status: v.s } }),
    onSuccess: (_d, v) => {
      toast.success(`${v.r.code} marked “${STATUS_LABEL[v.s]}”`);
      void qc.invalidateQueries({ queryKey: ["emergency-requests"] });
    },
    onError: () => toast.error("Status could not be updated"),
  });
  const changeStatus = (r: EmergencyRequest, s: RequestStatus) => mutation.mutate({ r, s });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {REQUEST_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? ALL : s)}
            aria-pressed={status === s}
            className="rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary"
          >
            <Badge variant={STATUS_BADGE[s]}>{STATUS_LABEL[s]}</Badge>
            <p className="mt-3 font-mono text-3xl font-bold">{counts[s]}</p>
            <p className="text-xs text-muted-foreground">requests</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID, name or location"
              className="pl-9"
              aria-label="Search requests"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[540px]">
            <FilterSelect
              label="District"
              value={district}
              onChange={setDistrict}
              options={districtOptions.map((d) => ({ value: d, label: d }))}
            />
            <FilterSelect
              label="Emergency type"
              value={type}
              onChange={setType}
              options={EMERGENCY_TYPES.map((t) => ({
                value: t,
                label: EMERGENCY_TYPE_LABEL[t].en,
              }))}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={REQUEST_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          </div>
        </div>

        <p className="px-4 pt-3 text-xs text-muted-foreground" aria-live="polite">
          Showing {rows.length} of {requests.length} requests
        </p>

        {/* Desktop table */}
        <div className="hidden p-2 xl:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>District / Tehsil</TableHead>
                <TableHead>Exact Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="font-mono text-xs font-semibold">
                    {r.code}
                    {r.isTest && (
                      <div className="mt-1">
                        <Badge variant="outline">TEST</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatPkt(r.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <a href={`tel:${r.phone}`} className="hover:underline">
                      {r.phone}
                    </a>
                  </TableCell>
                  <TableCell>
                    {r.district}
                    <div className="text-xs text-muted-foreground">{r.tehsil}</div>
                  </TableCell>
                  <TableCell className="max-w-[180px] text-xs">{r.location}</TableCell>
                  <TableCell>
                    <TypeBadge type={r.type} />
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.peopleAffected}</TableCell>
                  <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                    {r.description}
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      value={r.status}
                      onChange={(s) => changeStatus(r, s)}
                      id={r.code}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile / tablet cards */}
        <ul className="divide-y xl:hidden">
          {rows.map((r) => (
            <li key={r.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{r.code}</p>
                  <p className="text-xs text-muted-foreground">{formatPkt(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.isTest && <Badge variant="outline">TEST</Badge>}
                  <TypeBadge type={r.type} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Item k="Name" v={r.fullName} />
                <Item
                  k="Phone"
                  v={
                    <a href={`tel:${r.phone}`} className="font-mono underline">
                      {r.phone}
                    </a>
                  }
                />
                <Item k="District / Tehsil" v={`${r.district} · ${r.tehsil}`} />
                <Item k="People affected" v={r.peopleAffected} />
                <div className="col-span-2">
                  <Item k="Exact location" v={r.location} />
                </div>
                <div className="col-span-2">
                  <Item k="Description" v={r.description} />
                </div>
              </dl>
              <StatusSelect
                value={r.status}
                onChange={(s) => changeStatus(r, s)}
                id={`m-${r.code}`}
              />
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No requests match these filters.
          </p>
        )}
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function TypeBadge({ type }: { type: EmergencyRequest["type"] }) {
  const urgent = type === "rescue" || type === "medical";
  return (
    <Badge variant={urgent ? "high" : "outline"} className="whitespace-nowrap">
      {EMERGENCY_TYPE_LABEL[type].en}
    </Badge>
  );
}

function StatusSelect({
  value,
  onChange,
  id,
}: {
  value: RequestStatus;
  onChange: (s: RequestStatus) => void;
  id: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RequestStatus)}>
      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={`Status for ${id}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REQUEST_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All · {label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
