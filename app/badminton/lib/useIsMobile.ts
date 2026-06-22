'use client';

import { Grid } from 'antd';

/** True when viewport is below the md breakpoint (768px). */
export function useIsMobile(): boolean {
  const screens = Grid.useBreakpoint();
  return screens.md !== true;
}

/** Drawer/modal width: full screen on mobile, fixed on desktop. */
export function usePanelWidth(desktopWidth: number | string = 560): number | string {
  const isMobile = useIsMobile();
  return isMobile ? '100%' : desktopWidth;
}
