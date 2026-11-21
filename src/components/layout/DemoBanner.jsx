import { useEffect, useState } from "react";
import { FlaskConical, LogOut } from "lucide-react";
import { getDemoProfile } from "../../services/api";

// Always visible while Demo Mode is on, so nobody mistakes the sample data for real records.
export default function DemoBanner({ onExit }) {
  const [profile, setProfile] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    getDemoProfile()
      .then((p) => { if (!ignore) setProfile(p); })
      .catch(() => { if (!ignore) setFailed(true); });
    return () => { ignore = true; };
  }, []);

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-300 md:px-8">
      <FlaskConical size={17} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-bold">DEMO MODE.</span>{" "}
        {profile
          ? `Exploring ${profile.name} (${profile.consumer_reference}, ${profile.city}, ${profile.household_size} people), a fictional household. `
          : failed ? "The demo profile could not be loaded, but the data is still fictional. " : ""}
        Sample data only, read-only. Your real bills are not used or changed.
      </p>
      <button onClick={onExit}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-3 py-1.5 font-semibold transition hover:bg-amber-400/10">
        <LogOut size={15} aria-hidden="true" /> Exit demo
      </button>
    </div>
  );
}
