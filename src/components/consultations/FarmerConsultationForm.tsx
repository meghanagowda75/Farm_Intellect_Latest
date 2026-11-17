import { useState } from "react";
import Turnstile from "react-turnstile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const categories = [
  ["Crop Disease", "consultation.crop_disease"],
  ["Soil Health", "consultation.soil_health"],
  ["Irrigation", "consultation.irrigation"],
  ["Pest Control", "consultation.pest_control"],
  ["Fertilizer", "consultation.fertilizer"],
  ["Market Advice", "consultation.market_advice"],
  ["General", "consultation.general"],
] as const;
const priorities = ["low", "medium", "high"];

export const FarmerConsultationForm = ({ onSubmitted }: { onSubmitted?: () => void }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title.trim() || !description.trim()) return;
    if (siteKey && !captchaToken) {
      toast({ title: t('consultation.verification_required'), description: t('consultation.complete_captcha'), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("consultations").insert({
      farmer_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      captcha_verified: true,
    });

    if (error) {
      toast({ title: t('consultation.failed_submit'), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t('consultation.submitted'), description: t('consultation.expert_review') });
      setTitle("");
      setDescription("");
      setCategory("General");
      setPriority("medium");
      setCaptchaToken(null);
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  return (
    <Card className="tricolor-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t('consultation.ask_expert')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consult-title">{t('consultation.question_title')}</Label>
            <Input id="consult-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("consultation.question_placeholder")} maxLength={200} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('consultation.category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(([value, key]) => <SelectItem key={value} value={value}>{t(key)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('consultation.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{t(`consultation.priority_${p}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="consult-desc">{t('consultation.describe_issue')}</Label>
            <Textarea id="consult-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder={t("consultation.details_placeholder")} rows={4} maxLength={2000} required />
          </div>

          {/* Turnstile CAPTCHA for bot prevention */}
          {siteKey && (
            <div className="flex justify-center py-2">
              <Turnstile
                sitekey={siteKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => {
                  setCaptchaToken(null);
                  toast({ title: t('consultation.captcha_failed'), description: t('common.try_again'), variant: "destructive" });
                }}
                theme="light"
              />
            </div>
          )}

          <Button type="submit" disabled={submitting || (Boolean(siteKey) && !captchaToken)} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? t('common.submitting') : t('consultation.submit_queue')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
