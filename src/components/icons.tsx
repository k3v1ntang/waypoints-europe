import type { ReactNode } from 'react';

// The app's SVG line-icon set (Phase 5b, consolidated from per-component
// copies after code review). One visual grammar everywhere: 24-unit
// viewBox, 1.8 stroke, round caps, stroke="currentColor" so icons inherit
// the surrounding CSS `color` and stay legible in both color schemes
// (emoji ship fixed colors and don't).

interface IconProps {
  /** Rendered size in px (viewBox stays 24). */
  size?: number;
}

const Svg = ({ size = 20, children }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** Tour route: start point, S-curved path, end point. */
export const RouteIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="2.5" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="2.5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

/** iOS-style share: box with an arrow rising out of it. */
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M8 6.5 12 3l4 3.5" />
    <path d="M7 10H5.5v10h13V10H17" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

/** Distance: two end points joined by a line. */
export const DistanceIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="5" r="2" />
    <path d="m6.5 17.5 11-11" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
  </Svg>
);

/** Outward arrow in a corner - external link. */
export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
  </Svg>
);

/** Folded map - "tap on map" location picking. */
export const MapTapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);

/** Compass needle - "use my location". */
export const LocateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m21 3-9 18-2-7-7-2 18-9Z" />
  </Svg>
);
