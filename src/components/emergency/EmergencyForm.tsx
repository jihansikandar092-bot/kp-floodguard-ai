import { zodResolver } from "@hookform/resolvers/zod";
import { Ambulance, Droplet, HeartPulse, Home, LifeBuoy, Loader2, Utensils } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DISTRICTS } from "@/lib/data/districts";
import {
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_LABEL,
  emergencyRequestSchema,
  type EmergencyRequest,
  type EmergencyType,
} from "@/lib/emergency";
import { submitEmergencyRequest } from "@/lib/api/requests";

const TYPE_ICON: Record<EmergencyType, typeof LifeBuoy> = {
  rescue: LifeBuoy,
  medical: HeartPulse,
  food: Utensils,
  water: Droplet,
  shelter: Home,
};

export function EmergencyForm({ onSubmitted }: { onSubmitted: (r: EmergencyRequest) => void }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(emergencyRequestSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      district: "",
      tehsil: "",
      location: "",
      description: "",
    },
  });

  const districtName = watch("district");
  const tehsils = DISTRICTS.find((d) => d.name === districtName)?.tehsils ?? [];

  const onSubmit = handleSubmit(async (values) => {
    const { request } = await submitEmergencyRequest(values, "form");
    onSubmitted(request);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset>
        <legend className="text-base font-bold">1. Type of emergency</legend>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Emergency type" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {EMERGENCY_TYPES.map((t) => {
                const Icon = TYPE_ICON[t];
                const active = field.value === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(t)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border bg-card px-3 py-4 text-sm font-semibold transition-all hover:border-primary",
                      active && "border-emergency bg-emergency-soft text-emergency ring-1 ring-emergency",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {EMERGENCY_TYPE_LABEL[t].en}
                  </button>
                );
              })}
            </div>
          )}
        />
        <FieldError msg={errors.type?.message} />
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-base font-bold sm:col-span-2">2. Your details</legend>
        <Field label="Full Name" id="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...register("fullName")} aria-invalid={!!errors.fullName} />
        </Field>
        <Field label="Phone Number" id="phone" error={errors.phone?.message} hint="Mobile number rescuers can call">
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" {...register("phone")} aria-invalid={!!errors.phone} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-base font-bold sm:col-span-2">3. Location</legend>
        <Field label="District" id="district" error={errors.district?.message}>
          <Controller
            control={control}
            name="district"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="district" aria-invalid={!!errors.district}>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other district</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Tehsil" id="tehsil" error={errors.tehsil?.message}>
          <Input id="tehsil" list="tehsil-options" {...register("tehsil")} aria-invalid={!!errors.tehsil} />
          <datalist id="tehsil-options">
            {tehsils.map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Exact Location" id="location" error={errors.location?.message} hint="Village, street, nearest landmark">
            <Input id="location" {...register("location")} aria-invalid={!!errors.location} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-3 text-base font-bold sm:col-span-3">4. Situation</legend>
        <Field label="Number of People Affected" id="peopleAffected" error={errors.peopleAffected?.message}>
          <Input id="peopleAffected" type="number" min={1} inputMode="numeric" {...register("peopleAffected", { valueAsNumber: true })} aria-invalid={!!errors.peopleAffected} />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Emergency Description" id="description" error={errors.description?.message}>
            <Textarea id="description" rows={4} placeholder="What is happening? Any injured, elderly or children?" {...register("description")} aria-invalid={!!errors.description} />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:max-w-md">
          Prototype: your request will be saved on this device as a demo record. It is not yet
          forwarded to rescue teams. In immediate danger, call Rescue 1122.
        </p>
        <Button type="submit" variant="emergency" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Ambulance />}
          Submit Emergency Request
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <FieldError msg={error} /> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{msg}</p>;
}
