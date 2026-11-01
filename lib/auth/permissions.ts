export const PERMISSION_GROUPS = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      {
        key: "dashboard.view",
        label: "Ver resumen",
        description: "Consulta las cifras generales del negocio.",
      },
    ],
  },
  {
    id: "analytics",
    label: "Estadísticas",
    items: [
      {
        key: "analytics.view",
        label: "Ver estadísticas",
        description: "Consulta visitas y solicitudes de atención.",
      },
    ],
  },
  {
    id: "products",
    label: "Productos",
    items: [
      { key: "products.view", label: "Ver productos", description: "Abre el listado de productos, incluidos los inactivos." },
      { key: "products.create", label: "Crear productos", description: "Da de alta platillos en una sección." },
      { key: "products.update", label: "Editar productos", description: "Cambia nombre, descripción, sección, destacado y orden." },
      { key: "products.delete", label: "Eliminar productos", description: "Borra platillos del menú." },
      { key: "products.update_price", label: "Cambiar precios", description: "Modifica el precio sin editar el resto del platillo." },
      { key: "products.update_availability", label: "Cambiar disponibilidad", description: "Activa o pausa un platillo." },
      { key: "products.upload_images", label: "Subir fotografías", description: "Reemplaza la foto de un platillo." },
    ],
  },
  {
    id: "categories",
    label: "Categorías",
    items: [
      { key: "categories.view", label: "Ver secciones", description: "Abre las secciones del menú." },
      { key: "categories.create", label: "Crear secciones", description: "Agrega una sección nueva." },
      { key: "categories.update", label: "Editar secciones", description: "Cambia nombre, descripción e imagen." },
      { key: "categories.delete", label: "Eliminar secciones", description: "Borra una sección y sus productos." },
      { key: "categories.reorder", label: "Reordenar secciones", description: "Cambia el orden de aparición." },
    ],
  },
  {
    id: "branding",
    label: "Branding",
    items: [
      { key: "branding.view", label: "Ver diseño", description: "Abre el editor visual." },
      { key: "branding.update", label: "Editar borrador", description: "Guarda cambios sin publicarlos." },
      { key: "branding.publish", label: "Publicar diseño", description: "Publica o restaura la apariencia del menú." },
    ],
  },
  {
    id: "menu",
    label: "Menú público",
    items: [
      { key: "menu.view", label: "Ver estado del menú", description: "Consulta si el comedor está recibiendo órdenes." },
      { key: "menu.publish", label: "Publicar disponibilidad", description: "Activa o pausa la recepción de órdenes." },
    ],
  },
  {
    id: "tables",
    label: "Mesas y QR",
    items: [
      { key: "tables.view", label: "Ver mesas", description: "Consulta mesas, enlaces y códigos QR." },
      { key: "tables.create", label: "Crear mesas", description: "Da de alta una mesa." },
      { key: "tables.update", label: "Editar mesas", description: "Cambia el nombre, el código o el estado." },
      { key: "tables.delete", label: "Eliminar mesas", description: "Permite borrar una mesa cuando esa acción exista." },
      { key: "tables.manage_qr", label: "Administrar QR", description: "Descarga e imprime el código de cada mesa." },
    ],
  },
  {
    id: "users",
    label: "Colaboradores",
    items: [
      {
        key: "users.view",
        label: "Ver colaboradores",
        description: "Consulta la lista. No permite invitar, editar permisos ni revocar.",
      },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];

const PERMISSION_SET = new Set<string>(
  PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key)),
);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

export function readPermissionList(values: string[]) {
  return values.filter(isPermission);
}
