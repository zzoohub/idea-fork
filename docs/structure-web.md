# Web Folder Structure (FSD + Next.js App Router)

```
app/                 # Next.js App Router — routing only (thin re-exports)
├── layout.tsx       # Root layout (imports @/app/providers, @/app/globals.css)
├── page.tsx         # import { SomePage } from '@/views/some-page'
└── some-page/

src/                 # All FSD layers
├── app/             # FSD app-layer: providers, global styles (NO routing files)
│   ├── globals.css
│   └── providers/
├── views/           # FSD pages layer (named "views" to avoid Next.js pages/ conflict)
│   └── some-view/   # Compose widgets into full page layouts
│       └── ui/
├── widgets/         # Sections/blocks
│   ├── some-widget/
├── features/        # Features
│   └── some-feature/
│       ├── ui/
│       ├── model/
│       ├── api/
│       └── actions/   # Server Actions
├── entities/        # Business entities
│   └── some-entity/
│       ├── ui/
│       ├── model/
│       └── api/
└── shared/          # Reusable infrastructure
    ├── ui/          # Design system
    ├── lib/         # Utilities, helpers
    ├── api/         # API client
    └── config/      # Environment, constants
```
