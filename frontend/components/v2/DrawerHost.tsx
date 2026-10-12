'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useDrawerStore } from '@/lib/store/DrawerManager';

import OrderDrawer from './OrderDrawer';
import FieldNoteDrawer from './FieldNoteDrawer';
import ContactDrawer from './ContactDrawer';
import CategoryDrawer from './CategoryDrawer';
import CatalogDrawer from './CatalogDrawer';
import AccountDrawer from './AccountDrawer';
import ServiceDrawer from './ServiceDrawer';
import ManageFieldsDrawer from './ManageFieldsDrawer';
import ManageAttributesDrawer from './ManageAttributesDrawer';
import ManageCatalogAttributesDrawer from './ManageCatalogAttributesDrawer';
import AppointmentDrawer from './AppointmentDrawer';

/**
 * Single mount point for all store-driven drawers. Rendered once in the root layout.
 * Drawers stay mounted (hidden when closed) so slide-in/out transitions are preserved.
 * Open from anywhere: useDrawerStore.getState().openDrawer('order', { ... }).
 */
export default function DrawerHost() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const stack = useDrawerStore.getState().stack;
        if (stack.length > 0) {
          useDrawerStore.getState().closeDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drawers are global; close them on navigation so no stale form follows the user.
  const pathname = usePathname();
  useEffect(() => {
    useDrawerStore.getState().closeAll();
  }, [pathname]);

  return (
    <>
      <OrderDrawer />
      <FieldNoteDrawer />
      <ContactDrawer />
      <CategoryDrawer />
      <CatalogDrawer />
      <AccountDrawer />
      <ServiceDrawer />
      <ManageFieldsDrawer />
      <ManageAttributesDrawer />
      <ManageCatalogAttributesDrawer />
      <AppointmentDrawer />
    </>
  );
}
