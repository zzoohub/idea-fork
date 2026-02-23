import { useTranslations } from "next-intl";
import { Icon } from "@/src/shared/ui/icon";
import { Badge } from "@/src/shared/ui/badge";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

interface ProductHeaderProps {
  name: string;
  iconUrl?: string;
  category: string;
  description?: string;
  websiteUrl?: string;
  status?: string;
  className?: string;
}

export function ProductHeader({
  name,
  iconUrl,
  category,
  description,
  websiteUrl,
  status,
  className,
}: ProductHeaderProps) {
  const t = useTranslations("productHeader");

  return (
    <div
      className={[
        "flex flex-col sm:flex-row items-start gap-6",
        "p-6 rounded-2xl",
        "bg-white dark:bg-[#18212F]",
        "border border-slate-200 dark:border-[#283039]",
        "shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Product icon / letter avatar */}
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-[#137fec]/10 text-4xl font-bold text-[#137fec]"
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Center: name, status, description, metadata */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
            {name}
          </h1>
          {status && (
            <Badge variant="positive">
              {status}
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            {description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Icon name="layout-grid" size={16} className="text-slate-400 dark:text-slate-500" />
            {category}
          </span>

          {websiteUrl && isSafeUrl(websiteUrl) && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#137fec] hover:text-[#0f6bca] transition-colors duration-150"
            >
              <Icon name="globe" size={16} />
              {new URL(websiteUrl).hostname.replace("www.", "")}
            </a>
          )}
        </div>
      </div>

      {/* Right: CTA button */}
      <div className="shrink-0 self-center sm:self-start">
        <button
          type="button"
          className={[
            "inline-flex items-center gap-2",
            "px-5 py-2.5 rounded-xl",
            "bg-[#137fec] text-white text-sm font-semibold",
            "shadow-lg shadow-[#137fec]/20",
            "hover:bg-[#0f6bca] active:bg-[#0d5eaf]",
            "transition-colors duration-150",
            "cursor-pointer",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
          ].join(" ")}
        >
          <Icon name="bell-ring" size={18} />
          {t("trackChanges")}
        </button>
      </div>
    </div>
  );
}
