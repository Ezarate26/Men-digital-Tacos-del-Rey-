export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
};

export type MenuSection = {
  id: string;
  name: string;
  description: string;
  products: MenuProduct[];
};

export type MenuTableState =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "active"; code: string; label: string };

export type PublicMenu = {
  menuAvailable: boolean;
  sections: MenuSection[];
  table: MenuTableState;
  brand: {
    name: string;
    eyebrow: string;
    logoUrl: string | null;
  };
};

export type AttentionState = {
  status: "idle" | "success" | "error";
  message: string;
};
