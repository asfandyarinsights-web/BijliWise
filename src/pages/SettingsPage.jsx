import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Banknote, CheckCircle2, Database, Globe, Info, LayoutDashboard, Palette, RotateCcw, User, Zap } from "lucide-react";
import Card from "../components/ui/Card";
import SettingsSection from "../components/settings/SettingsSection";
import ThemeSelector from "../components/settings/ThemeSelector";
import OptionGroup from "../components/settings/OptionGroup";
import ConfirmResetDialog from "../components/settings/ConfirmResetDialog";
import { usePreferences } from "../context/preferencesContext";
import { DEFAULT_PREFERENCES } from "../utils/preferences";
import { formatDisplayDate } from "../utils/dateFormat";
import pkg from "../../package.json";

const THEME_NAMES = { light: "Light", dark: "Dark", oled: "Black / OLED", system: "System" };
const DATE_NAMES = { short: "Short", dmy: "DD/MM/YYYY", iso: "YYYY-MM-DD" };
const SAMPLE_DATE = "2026-11-05";

const DATE_OPTIONS = Object.keys(DATE_NAMES).map((value) => ({
  value,
  label: DATE_NAMES[value],
  hint: formatDisplayDate(SAMPLE_DATE, value),
}));

const PERIOD_OPTIONS = [
  { value: "3", label: "3M" },
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
  { value: "all", label: "All" },
];

function FixedRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-raised/40 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
      <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">Fixed</span>
    </div>
  );
}

export default function SettingsPage({ onNavigate }) {
  const { preferences, resolvedTheme, storageOk, setPreference, resetPreferences } = usePreferences();
  const [notice, setNotice] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function change(key, value, message) {
    setPreference(key, value);
    setNotice(message);
  }

  function confirmReset() {
    resetPreferences();
    setConfirmingReset(false);
    setNotice(
      `All preferences were reset to their defaults: ${THEME_NAMES[DEFAULT_PREFERENCES.theme]} theme, ${DATE_NAMES[DEFAULT_PREFERENCES.dateFormat]} dates and a ${DEFAULT_PREFERENCES.defaultPeriod}M default period.`
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div role="status" aria-live="polite">
        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}{storageOk ? " Saved in this browser." : ""}</span>
          </div>
        )}
      </div>

      {!storageOk && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>This browser would not let BijliWise save your preferences. Your choices still apply until you close or reload this tab.</span>
        </div>
      )}

      <SettingsSection icon={Palette} title="Appearance" description="Choose how BijliWise looks. The change applies everywhere straight away.">
        <ThemeSelector
          value={preferences.theme}
          resolvedTheme={resolvedTheme}
          onChange={(value) => change("theme", value, `Theme set to ${THEME_NAMES[value]}.`)}
        />
      </SettingsSection>

      <SettingsSection icon={Globe} title="Regional preferences" description="How values are shown. These never change the numbers stored in the database.">
        <div className="grid gap-3 sm:grid-cols-2">
          <FixedRow icon={Banknote} label="Currency" value="PKR (Pakistani Rupee)" />
          <FixedRow icon={Zap} label="Energy unit" value="kWh (kilowatt-hour)" />
        </div>
        <OptionGroup
          legend="Date format"
          name="dateFormat"
          value={preferences.dateFormat}
          onChange={(value) => change("dateFormat", value, `Date format set to ${DATE_NAMES[value]}.`)}
          options={DATE_OPTIONS}
          hint="Applies to full dates such as a bill's issue date. Month names like Oct 2026 stay as they are."
        />
      </SettingsSection>

      <SettingsSection icon={LayoutDashboard} title="Dashboard preferences" description="Where the Dashboard and Analytics start.">
        <OptionGroup
          legend="Default period"
          name="defaultPeriod"
          value={preferences.defaultPeriod}
          onChange={(value) => change("defaultPeriod", value, `Default period set to ${value === "all" ? "All" : `${value}M`}.`)}
          options={PERIOD_OPTIONS}
          hint="3M, 6M and 12M mean the most recent months that have bills. You can still change the range on each page; the page itself does not remember it."
        />
      </SettingsSection>

      <SettingsSection icon={Database} title="Data and privacy" description="Where your information lives.">
        <ul className="space-y-2 text-sm text-muted">
          <li>Electricity bills are stored in the MySQL database used by the BijliWise backend. Nothing on this page changes or deletes them.</li>
          <li>CSV exports are created in your browser and saved to your device's downloads.</li>
          <li>Display preferences (theme, date format, default period) are saved only in this browser. They are not stored in the database and will not follow you to another browser or device.</li>
        </ul>
        <button type="button" onClick={() => onNavigate?.("bills")}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised/40 px-4 py-2.5 text-sm font-semibold transition hover:border-brand/40 hover:text-brand">
          Open Electricity Bills <ArrowRight size={16} />
        </button>
      </SettingsSection>

      <SettingsSection icon={User} title="Profile and about" description="Application information.">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-raised/40 p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-sm font-bold text-brand">DU</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Demo User</p>
            <p className="text-xs text-muted">Household account</p>
          </div>
          <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">Demo profile</span>
        </div>
        <p className="text-sm text-muted">
          BijliWise has no sign-in or account system yet, so this name is a placeholder rather than a real user record.
        </p>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-brand"><Info size={18} /></span>
          <div className="text-sm">
            <p className="font-semibold">BijliWise: Smart Energy. Smart Pakistan.</p>
            <p className="mt-0.5 text-muted">Helps households track electricity consumption, bills and monthly usage.</p>
            <p className="mt-1 text-xs text-muted">Version {pkg.version}</p>
          </div>
        </div>
      </SettingsSection>

      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Reset to defaults</h2>
          <p className="mt-0.5 text-sm text-muted">Restores the theme, date format and default period. Bills and other data are not touched.</p>
        </div>
        <button type="button" onClick={() => setConfirmingReset(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised/40 px-4 py-2.5 text-sm font-semibold transition hover:border-brand/40 hover:text-brand">
          <RotateCcw size={16} /> Reset to defaults
        </button>
      </Card>

      {confirmingReset && <ConfirmResetDialog onConfirm={confirmReset} onCancel={() => setConfirmingReset(false)} />}
    </div>
  );
}