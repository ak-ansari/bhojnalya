// The guest's view of one outlet's menu. Replaced by the contracts schema when the menu API lands.
export type Diet = 'veg' | 'egg' | 'non_veg';

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  pricePaise: bigint;
  diet: Diet;
  inStock: boolean;
  customisable: boolean;
}

export interface Branding {
  /** `#RRGGBB`; anything else falls back to the house colour. */
  primaryColor: string;
  /** Up to three characters shown in the logo disc until logos are uploaded. */
  logoText: string;
}

export interface GuestMenu {
  outletName: string;
  tableLabel: string;
  branding: Branding;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface MenuFilter {
  categoryId: string;
  vegOnly: boolean;
}

/** The items a guest sees under one category, with only veg items when they ask for veg only. */
export function visibleItems(menu: GuestMenu, filter: MenuFilter): MenuItem[] {
  return menu.items.filter(
    (item) => item.categoryId === filter.categoryId && (!filter.vegOnly || item.diet === 'veg'),
  );
}
