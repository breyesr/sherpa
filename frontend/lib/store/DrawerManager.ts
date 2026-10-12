import { create } from 'zustand';
import type { Client, Product, Store as StoreModel } from '@/types/models';
import type { components } from '@/types/api';

type CategoryResponse = components['schemas']['CategoryResponse'];
type ServiceResponse = components['schemas']['ServiceResponse'];

/**
 * Payload contract per drawer. Extend this map as each drawer is migrated.
 * `undefined` payload = drawer needs no input.
 */
export interface DrawerPayloads {
  order: { preselectedStoreId?: string } | undefined;
  fieldNote: { storeId: string };
  contact:
    | {
        clientId?: string | null;
        initialData?: Partial<Client>;
        isProspect?: boolean;
      }
    | undefined;
  category: { category?: CategoryResponse | null } | undefined;
  catalog: 
    | {
        initialMode?: 'product' | 'category';
        productId?: string | null;
        categoryId?: string | null;
        initialData?: Partial<Product> | Partial<CategoryResponse> | null;
      }
    | undefined;
  account: 
    | {
        storeId?: string | null;
        initialData?: StoreModel | null;
        isProspect?: boolean;
      }
    | undefined;
  service: { service?: ServiceResponse | null } | undefined;
  manageFields: undefined;
  manageAttributes: undefined;
  manageCatalogAttributes: undefined;
  appointment: undefined;
}

export type DrawerType = keyof DrawerPayloads;

type OpenArgs<K extends DrawerType> = undefined extends DrawerPayloads[K]
  ? [payload?: DrawerPayloads[K]]
  : [payload: DrawerPayloads[K]];

interface DrawerState {
  /** Open drawers, bottom -> top. Supports nesting (parent stays open under child). */
  stack: DrawerType[];
  /** Last payload per drawer. Retained after close so exit animations keep content. */
  payloads: { [K in DrawerType]?: DrawerPayloads[K] };
  openDrawer: <K extends DrawerType>(type: K, ...args: OpenArgs<K>) => void;
  /** Closes the given drawer, or the top-most drawer if omitted. */
  closeDrawer: (type?: DrawerType) => void;
  /** Closes every open drawer (e.g., on route change). */
  closeAll: () => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  stack: [],
  payloads: {},
  openDrawer: (type, ...args) =>
    set((state) => ({
      stack: [...state.stack.filter((t) => t !== type), type],
      payloads: { ...state.payloads, [type]: args[0] },
    })),
  closeDrawer: (type) =>
    set((state) => {
      const target = type ?? state.stack[state.stack.length - 1];
      if (!target) return state;
      return { stack: state.stack.filter((t) => t !== target) };
    }),
  closeAll: () => set((state) => (state.stack.length ? { stack: [] } : state)),
}));

/** Per-drawer accessor: open state, typed payload, and close handler. */
export function useDrawer<K extends DrawerType>(type: K) {
  const isOpen = useDrawerStore((s) => s.stack.includes(type));
  const payload = useDrawerStore((s) => s.payloads[type]) as DrawerPayloads[K];
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  return { isOpen, payload, close: () => closeDrawer(type) };
}
