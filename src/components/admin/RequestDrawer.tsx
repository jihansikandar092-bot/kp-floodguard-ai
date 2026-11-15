import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listRequestEvents,
  updateEmergencyStatus,
  updateRequestDetails,
} from "@/lib/api/requests.functions";
import {
  EMERGENCY_TYPE_LABEL,
  REQUEST_STATUSES,
  STATUS_BADGE,
  STATUS_LABEL,
  type EmergencyRequest,
  type RequestStatus,
} from "@/lib/emergency";
import { formatPkt, maskPhone } from "@/lib/request-display";

/** Coordinator-only detail drawer: full request, assignment fields and status history. */
export function RequestDrawer({
  request,
  open,
  onOpenChange,
}: {
  request: EmergencyRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const eventsFn = useServerFn(listRequestEvents);
  const statusFn = useServerFn(updateEmergencyStatus);
  const detailsFn = useServerFn(updateRequestDetails);

  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [note, setNote] = useState("");
  const [team, setTeam] = useState<string | null>(null);
  const [internal, setInternal] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["request-events", request?.id],
    queryFn: () => eventsFn({ data: { requestId: request!.id } }),
    enabled: open && !!request,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["emergency-requests"] });
    void qc.invalidateQueries({ queryKey: ["request-events", request?.id] });
    void qc.invalidateQueries({ queryKey: ["open-request-counts"] });
  };

  const saveStatus = useMutation({
    mutationFn: () =>
      statusFn({
        data: { id: request!.id, status: status!, ...(note.trim() ? { note: note.trim() } : {}) },
      }),
    onSuccess: () => {
      toast.success(`${request!.code} marked “${STATUS_LABEL[status!]}”`);
      setStatus(null);
      setNote("");
      invalidate();
    },
    onError: () => toast.error("Status could not be updated"),
  });

  const saveDetails = useMutation({
    mutationFn: () =>
      detailsFn({
        data: {
          id: request!.id,
          assignedTeam: (team ?? request!.assignedTeam ?? "").trim() || null,
          internalNote: (internal ?? request!.internalNote ?? "").trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Assignment saved");
      invalidate();
    },
    onError: () => toast.error("Details could not be saved"),
  });

  if (!request) return null;
  const teamValue = team ?? request.assignedTeam ?? "";
  const internalValue = internal ?? request.internalNote ?? "";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="flex flex-wrap items-center gap-2 font-mono">
              {request.code}
              <Badge variant={STATUS_BADGE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
              {request.isTest && <Badge variant="outline">TEST</Badge>}
            </DrawerTitle>
            <DrawerDescription>
              Submitted {formatPkt(request.createdAt)} · Last update {formatPkt(request.updatedAt)}
            </DrawerDescription>
          </DrawerHeader>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Item k="Name" v={request.fullName} />
            <Item k="Phone" v={maskPhone(request.phone)} />
            <Item k="District / Tehsil" v={`${request.district} · ${request.tehsil}`} />
            <Item k="Type" v={EMERGENCY_TYPE_LABEL[request.type].en} />
            <Item k="People affected" v={request.peopleAffected} />
            <Item k="Language" v={request.language.toUpperCase()} />
            <div className="col-span-2">
              <Item k="Exact location" v={request.location} />
            </div>
            <div className="col-span-2">
              <Item k="Description" v={request.description} />
            </div>
          </dl>

          <section className="mt-6 space-y-3 rounded-xl border p-4" aria-label="Assignment">
            <h3 className="font-semibold">Assignment (coordinators only)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Assigned team</span>
                <Input
                  value={teamValue}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Rescue 1122 Swat unit"
                  maxLength={120}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Internal note</span>
                <Textarea
                  value={internalValue}
                  onChange={(e) => setInternal(e.target.value)}
                  placeholder="Visible only to coordinators"
                  maxLength={2000}
                  rows={3}
                />
              </label>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveDetails.mutate()}
              disabled={saveDetails.isPending}
            >
              Save assignment
            </Button>
          </section>

          <section className="mt-4 space-y-3 rounded-xl border p-4" aria-label="Change status">
            <h3 className="font-semibold">Change status</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={status ?? request.status}
                onValueChange={(v) => setStatus(v as RequestStatus)}
              >
                <SelectTrigger className="w-[160px]" aria-label="New status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the history"
                className="min-w-[200px] flex-1"
                maxLength={500}
              />
              <Button
                size="sm"
                onClick={() => saveStatus.mutate()}
                disabled={!status || status === request.status || saveStatus.isPending}
              >
                Save status
              </Button>
            </div>
          </section>

          <section className="mt-4" aria-label="Status history">
            <h3 className="font-semibold">History</h3>
            {events.isLoading && (
              <p className="mt-2 text-sm text-muted-foreground">Loading history…</p>
            )}
            {events.isError && (
              <p className="mt-2 text-sm text-emergency">History temporarily unavailable.</p>
            )}
            {events.data && events.data.events.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No status changes recorded yet.</p>
            )}
            {events.data && events.data.events.length > 0 && (
              <ol className="mt-2 space-y-2">
                {events.data.events.map((e) => (
                  <li key={e.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.fromStatus && (
                        <>
                          <Badge variant="outline">{STATUS_LABEL[e.fromStatus]}</Badge>
                          <span aria-hidden>→</span>
                        </>
                      )}
                      <Badge variant={STATUS_BADGE[e.toStatus]}>{STATUS_LABEL[e.toStatus]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatPkt(e.createdAt)}
                      </span>
                    </div>
                    {e.note && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
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
