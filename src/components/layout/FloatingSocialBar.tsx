import { cn } from "@/lib/utils"
import { TelegramIcon } from "@/components/icons/telegram-icon"

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const socialLinks = [
  { icon: YouTubeIcon, href: "https://youtube.com/@yebetweg", label: "YouTube", color: "text-youtube hover:bg-youtube/10" },
  { icon: TelegramIcon, href: "https://t.me/yebetweg", label: "Telegram", color: "text-telegram hover:bg-telegram/10" },
  { icon: FacebookIcon, href: "https://facebook.com/yebetweg", label: "Facebook", color: "text-facebook hover:bg-facebook/10" },
]

export function FloatingSocialBar() {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
      {socialLinks.map((link) => {
        const IconComp = link.icon
        return (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex h-12 w-12 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm border border-border/75 shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-2xl",
              link.color
            )}
            title={link.label}
          >
            {typeof IconComp === "function" && "displayName" in IconComp ? (
              <IconComp className="h-5 w-5" />
            ) : (
              <IconComp className="h-5 w-5" />
            )}
          </a>
        )
      })}
    </div>
  )
}
