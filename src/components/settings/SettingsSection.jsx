import Card from "../ui/Card";

export default function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <div className="flex items-start gap-3 p-5 pb-0">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </Card>
  );
}