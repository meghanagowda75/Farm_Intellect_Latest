import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { indianStates, getCitiesByState } from "@/data/indianLocations";
import { languageOptions } from "@/i18n/languages";
import { ArrowLeft, MessageSquare, PhoneCall, ShieldCheck, Sprout } from "lucide-react";

const COMMON_CROPS = [
  "Wheat", "Rice", "Maize", "Soybean", "Cotton", "Sugarcane",
  "Groundnut", "Mustard", "Bajra", "Jowar", "Tur (Arhar)", "Gram (Chana)",
];

const schema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile"),
  state: z.string().min(1, "Select state"),
  district: z.string().min(1, "Select district"),
  crop: z.string().min(1, "Select crop"),
  language: z.string().min(1),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required to send SMS" }) }),
});

const SmsRegister = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    state: "",
    district: "",
    crop: "",
    language: "hi",
    consent: false,
  });

  const districts = useMemo(() => (form.state ? getCitiesByState(form.state) : []), [form.state]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please check the form", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      await apiFetch("/api/sms/register", {
        method: "POST",
        body: JSON.stringify({
          name: parsed.data.name,
          phone: parsed.data.phone,
          state: parsed.data.state,
          district: parsed.data.district,
          crop: parsed.data.crop,
          language: parsed.data.language,
          consent: parsed.data.consent,
        }),
      });

      setDone(true);
      toast({
        title: "Registration saved",
        description: "Your SMS registration has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Could not register",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="space-y-2">
              <div className="inline-flex items-center gap-2 text-primary">
                <MessageSquare className="h-6 w-6" />
                <span className="text-xs font-semibold uppercase tracking-wider">SMS Alerts</span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl">No smartphone? No problem.</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start on free alerts and move to paid plans later. Get weather warnings, mandi prices, pest alerts and government scheme updates as
                <strong> simple SMS in your language</strong> — works on any ₹500 keypad phone.
              </p>
            </CardHeader>

            <CardContent>
              {done ? (
                <div className="space-y-4 py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold">You're in! 🎉</h3>
                  <p className="text-sm text-muted-foreground">
                    Your registration has been saved. SMS alerts will begin once the SMS service is configured. You can contact platform support to withdraw your consent.
                  </p>
                  <Button asChild variant="outline"><Link to="/">Done</Link></Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Farmer name</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ramesh Patil" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile (10 digits)</Label>
                      <div className="flex">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">+91</span>
                        <Input id="phone" inputMode="numeric" maxLength={10} className="rounded-l-none"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                          placeholder="98XXXXXXXX" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, district: "" })}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {indianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>District / City</Label>
                      <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })} disabled={!form.state}>
                        <SelectTrigger><SelectValue placeholder={form.state ? "Select district" : "Choose state first"} /></SelectTrigger>
                        <SelectContent>
                          {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary crop</Label>
                      <Select value={form.crop} onValueChange={(v) => setForm({ ...form, crop: v })}>
                        <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                        <SelectContent>
                          {COMMON_CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {languageOptions.map((l) => (
                            <SelectItem key={l.code} value={l.code}>{l.nativeName} ({l.name})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <Checkbox checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: !!v })} className="mt-0.5" />
                    <span className="text-muted-foreground">
                      I agree to receive SMS from Farm Intellect about weather, mandi prices, pest alerts and government schemes. I understand that message and data rates may apply, and I can contact platform support to withdraw my consent.
                    </span>
                  </label>

                  <Button type="submit" disabled={submitting} className="w-full" size="lg">
                    {submitting ? "Registering…" : "Register for SMS alerts"}
                  </Button>

                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <PhoneCall className="h-4 w-4 text-primary" /> Or give a missed call
                    </div>
                    <p className="mt-1">Once our toll-free number goes live, farmers can give a missed call to subscribe. By calling, they consent to receive Farm Intellect SMS alerts. Coming soon.</p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            {[
              { icon: Sprout, t: "Crop advisory" },
              { icon: MessageSquare, t: "22 languages" },
              { icon: ShieldCheck, t: "Free, no spam" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
                <Icon className="h-4 w-4 text-primary" /> {t}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SmsRegister;
