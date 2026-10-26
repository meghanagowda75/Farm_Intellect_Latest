import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  MessagesSquare,
  Phone,
  Stethoscope,
  Video,
  Trash2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ExpertBooking,
  appendExpertBooking,
  getExpertBookings,
  saveExpertBookings,
} from "@/lib/phase1-storage";

const experts = [
  {
    name: "Dr. Kavita Sharma",
    expertise: "Plant pathology",
    mode: ["video", "chat"],
  },
  {
    name: "Dr. Arjun Patel",
    expertise: "Irrigation and soil health",
    mode: ["call", "video", "field_visit"],
  },
  {
    name: "Dr. Meera Singh",
    expertise: "Market linkage and schemes",
    mode: ["chat", "call"],
  },
];

export const ExpertConsultationWorkflow = () => {
  const { toast } = useToast();

  const [bookings, setBookings] = useState<ExpertBooking[]>(() =>
    getExpertBookings()
  );

  const [bookingToDelete, setBookingToDelete] =
    useState<ExpertBooking | null>(null);

  const [form, setForm] = useState({
    expertName: experts[0].name,
    expertise: experts[0].expertise,
    slot: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    mode: "video" as ExpertBooking["mode"],
    issue: "",
    notes: "",
  });

  const selectedExpert = useMemo(
    () =>
      experts.find((expert) => expert.name === form.expertName) ??
      experts[0],
    [form.expertName]
  );

  const handleBook = () => {
    if (!form.issue.trim()) {
      toast({
        title: "Add the consultation issue",
        description:
          "Mention the field problem, crop stage, or business question you want the expert to review.",
        variant: "destructive",
      });
      return;
    }

    const booking: ExpertBooking = {
      id: `booking-${Date.now()}`,
      expertName: form.expertName,
      expertise: selectedExpert.expertise,
      slot: new Date(form.slot).toISOString(),
      mode: form.mode,
      issue: form.issue.trim(),
      notes: form.notes.trim(),
      status: "requested",
    };

    appendExpertBooking(booking);
    setBookings((current) => [booking, ...current]);

    setForm((current) => ({
      ...current,
      issue: "",
      notes: "",
    }));

    toast({
      title: "Consultation requested",
      description: `${booking.expertName} received your ${
        booking.mode.replace("_", " ")
      } request for ${format(
        parseISO(booking.slot),
        "dd MMM, hh:mm a"
      )}.`,
    });
  };

  const handleDelete = () => {
    if (!bookingToDelete) return;

    const updatedBookings = bookings.filter(
      (booking) => booking.id !== bookingToDelete.id
    );

    saveExpertBookings(updatedBookings);
    setBookings(updatedBookings);

    toast({
      title: "Consultation deleted",
      description: `The consultation with ${bookingToDelete.expertName} was removed from your timeline.`,
    });

    setBookingToDelete(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Expert booking & consultation workflow
          </CardTitle>

          <CardDescription>
            Raise a structured consultation request with mode, slot, and crop
            issue so experts can prepare before the session.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-expert">Expert</Label>

              <Select
                value={form.expertName}
                onValueChange={(value) => {
                  const expert =
                    experts.find((item) => item.name === value) ??
                    experts[0];

                  setForm((current) => ({
                    ...current,
                    expertName: expert.name,
                    expertise: expert.expertise,
                    mode: expert.mode[0] as ExpertBooking["mode"],
                  }));
                }}
              >
                <SelectTrigger id="booking-expert">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {experts.map((expert) => (
                    <SelectItem key={expert.name} value={expert.name}>
                      {expert.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-slot">Preferred slot</Label>

              <Input
                id="booking-slot"
                type="datetime-local"
                value={form.slot}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slot: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-mode">Consultation mode</Label>

              <Select
                value={form.mode}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    mode: value as ExpertBooking["mode"],
                  }))
                }
              >
                <SelectTrigger id="booking-mode">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {selectedExpert.mode.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {selectedExpert.expertise}
              </p>

              <p className="mt-1">
                Best for disease diagnosis, irrigation planning, scheme
                guidance, and recovery steps.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-issue">Issue summary</Label>

            <Textarea
              id="booking-issue"
              rows={4}
              value={form.issue}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  issue: event.target.value,
                }))
              }
              placeholder="Describe the crop, symptoms, irrigation problem, market concern, or scheme paperwork question."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-notes">
              Attachments / prep notes
            </Label>

            <Textarea
              id="booking-notes"
              rows={3}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Mention field name, scanner result, village, or documents to keep ready."
            />
          </div>

          <Button onClick={handleBook}>
            Request consultation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Consultation timeline
          </CardTitle>

          <CardDescription>
            Track requested, confirmed, and completed sessions. Delete
            consultations when you no longer need them.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No consultations in your timeline
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your consultation requests will appear here.
              </p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {booking.expertName}
                        </h3>

                        <Badge
                          variant={
                            booking.status === "confirmed"
                              ? "default"
                              : booking.status === "completed"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {booking.status}
                        </Badge>

                        <Badge variant="outline">
                          {booking.expertise}
                        </Badge>
                      </div>

                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        {booking.issue}
                      </p>

                      {booking.notes && (
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          Prep: {booking.notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground sm:shrink-0 sm:text-right">
                      <div className="flex items-center gap-2 sm:justify-end">
                        {booking.mode === "video" ? (
                          <Video className="h-4 w-4" />
                        ) : booking.mode === "call" ? (
                          <Phone className="h-4 w-4" />
                        ) : (
                          <MessagesSquare className="h-4 w-4" />
                        )}

                        <span>{booking.mode.replace("_", " ")}</span>
                      </div>

                      <div>
                        {format(
                          parseISO(booking.slot),
                          "dd MMM yyyy, hh:mm a"
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setBookingToDelete(booking)}
                      className="min-h-10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {bookingToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setBookingToDelete(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-consultation-title"
            aria-describedby="delete-consultation-description"
            className="my-auto w-full max-w-md rounded-xl border bg-background p-5 text-foreground shadow-xl"
          >
            <h2
              id="delete-consultation-title"
              className="text-lg font-semibold"
            >
              Delete consultation?
            </h2>

            <p
              id="delete-consultation-description"
              className="mt-2 break-words text-sm text-muted-foreground"
            >
              Are you sure you want to delete the consultation with{" "}
              <span className="font-medium text-foreground">
                {bookingToDelete.expertName}
              </span>
              ? This removes it from your consultation timeline.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Yes, delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};