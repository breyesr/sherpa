'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import Drawer from './Drawer';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Layers, 
  Tag, 
  Loader2, 
  AlertCircle,
  Users,
  CheckCircle
} from 'lucide-react';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  storeId?: string | null; // If provided, we are in Edit Mode
  initialData?: any; // Data passed from list view for instant population
  isProspect?: boolean;
}

export default function AccountDrawer({ isOpen, onClose, token, storeId, initialData, isProspect = false }: AccountDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEditing = !!storeId;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    street_address: '',
    colonia: '',
    municipality: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'México',
    market: '',
    segment: '',
    region: '',
    external_id: '',
    client_ids: [] as string[],
    delivery_zip_codes: ''
  });

  // List of resolved colonias for autocomplete selection in manual address mode
  const [colonias, setColonias] = useState<string[]>([]);

  // Delivery zip codes UI helper state
  const [addressStates, setAddressStates] = useState<string[]>([]);
  const [addressMunicipalities, setAddressMunicipalities] = useState<string[]>([]);
  const [addressZipCodes, setAddressZipCodes] = useState<string[]>([]);
  const [addressColonias, setAddressColonias] = useState<string[]>([]);
  const [deliveryMunicipalities, setDeliveryMunicipalities] = useState<string[]>([]);
  const [deliveryZipCodesList, setDeliveryZipCodesList] = useState<any[]>([]);

  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedZipCodesArray, setSelectedZipCodesArray] = useState<string[]>([]);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [customZipInput, setCustomZipInput] = useState<string>('');
  const [manualAddress, setManualAddress] = useState(false);

  // Form dirty checking state
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');

  // Initialize state when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!storeId) {
        // Create mode: clear form
        const defaultData = {
          name: '',
          phone: '',
          email: '',
          street_address: '',
          colonia: '',
          municipality: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'México',
          market: '',
          segment: '',
          region: '',
          external_id: '',
          client_ids: [] as string[],
          delivery_zip_codes: ''
        };
        setFormData(defaultData);
        setColonias([]);
        setInitialSnapshot(JSON.stringify(defaultData));
        setManualAddress(false);
      } else if (initialData) {
        // Edit mode with initial data: populate instantly
        const eagerData = {
          name: initialData.name || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          street_address: initialData.street_address || '',
          colonia: initialData.colonia || '',
          municipality: initialData.municipality || '',
          city: initialData.city || '',
          state: initialData.state || '',
          zip_code: initialData.zip_code || '',
          country: initialData.country || 'México',
          market: initialData.market || '',
          segment: initialData.segment || '',
          region: initialData.region || '',
          external_id: initialData.external_id || '',
          client_ids: initialData.clients?.map((c: any) => c.id) || [],
          delivery_zip_codes: initialData.delivery_zip_codes?.join(', ') || ''
        };
        setFormData(eagerData);
        if (initialData.colonia) {
          setColonias([initialData.colonia]);
        }
        setInitialSnapshot(JSON.stringify(eagerData));
        setManualAddress(false);
      }
    }
  }, [isOpen, storeId, initialData]);

  // Fetch full store data if editing (background sync for deep data)
  useEffect(() => {
    if (isOpen && storeId) {
      const fetchStore = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/stores/${storeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const fullData = {
              name: data.name || '',
              phone: data.phone || '',
              email: data.email || '',
              street_address: data.street_address || '',
              colonia: data.colonia || '',
              municipality: data.municipality || '',
              city: data.city || '',
              state: data.state || '',
              zip_code: data.zip_code || '',
              country: data.country || 'México',
              market: data.market || '',
              segment: data.segment || '',
              region: data.region || '',
              external_id: data.external_id || '',
              client_ids: data.clients?.map((c: any) => c.id) || [],
              delivery_zip_codes: data.delivery_zip_codes?.join(', ') || ''
            };
            setFormData(prev => {
              const prevJson = JSON.stringify(prev);
              return (prevJson === initialSnapshot || !initialSnapshot) ? fullData : prev;
            });
            if (data.colonia) {
              setColonias(prev => prev.includes(data.colonia) ? prev : [...prev, data.colonia]);
            }
            if (data.state && data.municipality && allPostalCodes.length > 0) {
              const hasMatch = allPostalCodes.some(
                pc => pc.state === data.state && pc.municipality === data.municipality
              );
              if (!hasMatch) {
                setManualAddress(true);
              }
            }
            setInitialSnapshot(JSON.stringify(fullData));
          }
        } catch (err) {
          console.error('Failed to fetch store for background sync', err);
        }
      };
      fetchStore();
    }
  }, [isOpen, storeId, token, allPostalCodes.length]);

  // Autocomplete geographic fields on ZIP Code change (Manual Address Mode)
  useEffect(() => {
    const lookupZIP = async () => {
      const code = formData.zip_code.trim();
      if (code.length === 5 && manualAddress) {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/${code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const firstMatch = data[0];
              const uniqueColonias = Array.from(new Set(data.map((item: any) => item.colonia))) as string[];
              setColonias(uniqueColonias);
              
              setFormData(prev => ({
                ...prev,
                municipality: firstMatch.municipality || prev.municipality,
                city: firstMatch.city || firstMatch.municipality || prev.city,
                state: firstMatch.state || prev.state,
                colonia: uniqueColonias.includes(prev.colonia) ? prev.colonia : uniqueColonias[0]
              }));
            }
          }
        } catch (err) {
          console.error('Failed to resolve ZIP code details', err);
        }
      }
    };
    lookupZIP();
  }, [formData.zip_code, manualAddress, token]);

  // Fetch unique states on drawer open
  useEffect(() => {
    if (isOpen) {
      const fetchStates = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/states`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAddressStates(data);
            
            // Check if active store state exists in loaded states data, if not auto-toggle manual mode
            if (storeId && formData.state) {
              const hasMatch = data.includes(formData.state);
              if (!hasMatch) {
                setManualAddress(true);
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch states list', err);
        }
      };
      fetchStates();
      // Reset dropdown values
      setSelectedState(formData.state || '');
      setSelectedMunicipality(formData.municipality || '');
      setSelectedZipCodesArray([]);
      setLastClickedIndex(null);
      setCustomZipInput('');
      setManualAddress(false);
    }
  }, [isOpen, storeId, token]);

  // Fetch municipalities when physical address State changes
  useEffect(() => {
    if (formData.state) {
      const fetchMunicipalities = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/municipalities?state=${encodeURIComponent(formData.state)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAddressMunicipalities(data);
          }
        } catch (err) {
          console.error('Failed to fetch municipalities', err);
        }
      };
      fetchMunicipalities();
    } else {
      setAddressMunicipalities([]);
      setAddressZipCodes([]);
      setAddressColonias([]);
    }
  }, [formData.state, token]);

  // Fetch ZIP codes when physical address State & Municipality change
  useEffect(() => {
    if (formData.state && formData.municipality) {
      const fetchZipCodes = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/zip-codes?state=${encodeURIComponent(formData.state)}&municipality=${encodeURIComponent(formData.municipality)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDeliveryZipCodesList(data);
            const zips = Array.from(new Set(data.map((pc: any) => pc.zip_code))).sort() as string[];
            setAddressZipCodes(zips);
          }
        } catch (err) {
          console.error('Failed to fetch zip codes', err);
        }
      };
      fetchZipCodes();
    } else {
      setAddressZipCodes([]);
      setAddressColonias([]);
    }
  }, [formData.state, formData.municipality, token]);

  // Derive colonias when physical address ZIP Code changes
  useEffect(() => {
    if (formData.zip_code && deliveryZipCodesList.length > 0) {
      const filtered = deliveryZipCodesList
        .filter((pc: any) => pc.zip_code === formData.zip_code)
        .map((pc: any) => pc.colonia);
      setAddressColonias(Array.from(new Set(filtered)).sort() as string[]);
    } else {
      setAddressColonias([]);
    }
  }, [formData.zip_code, deliveryZipCodesList]);

  // Fetch delivery municipalities when delivery State changes
  useEffect(() => {
    if (selectedState) {
      const fetchDeliveryMunicipalities = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/municipalities?state=${encodeURIComponent(selectedState)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDeliveryMunicipalities(data);
          }
        } catch (err) {
          console.error('Failed to fetch delivery municipalities', err);
        }
      };
      fetchDeliveryMunicipalities();
    } else {
      setDeliveryMunicipalities([]);
      setSelectedZipCodesArray([]);
    }
  }, [selectedState, token]);

  // Fetch delivery ZIP codes when delivery State & Municipality change
  useEffect(() => {
    if (selectedState && selectedMunicipality) {
      const fetchDeliveryZipCodes = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/postal-codes/zip-codes?state=${encodeURIComponent(selectedState)}&municipality=${encodeURIComponent(selectedMunicipality)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const zips = Array.from(new Set(data.map((pc: any) => pc.zip_code))).sort() as string[];
            setSelectedZipCodesArray(zips);
          }
        } catch (err) {
          console.error('Failed to fetch delivery zip codes', err);
        }
      };
      fetchDeliveryZipCodes();
    } else {
      setSelectedZipCodesArray([]);
    }
  }, [selectedState, selectedMunicipality, token]);

  // Preselect delivery zone State and Municipality based on Store Address
  useEffect(() => {
    if (formData.state) {
      setSelectedState(formData.state);
    }
    if (formData.municipality) {
      setSelectedMunicipality(formData.municipality);
    }
  }, [formData.state, formData.municipality]);


  // Reset snapshot on close
  useEffect(() => {
    if (!isOpen) {
      setInitialSnapshot('');
    }
  }, [isOpen]);

  // Derive dirty state
  const isDirty = initialSnapshot !== '' && JSON.stringify(formData) !== initialSnapshot;

  // Warn before browser tab reload/close if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept Next.js client-side navigation if form is dirty
  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor) {
        const href = anchor.getAttribute('href');
        const targetAttr = anchor.getAttribute('target');
        
        // Only block internal relative/local navigation link clicks
        if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && targetAttr !== '_blank') {
          const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, [isDirty]);

  // Fetch all clients for linking
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-minimal'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: isOpen,
  });

  // Warn before closing drawer if dirty
  const handleClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmClose) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = isEditing 
      ? `${API_BASE_URL}/trade/stores/${storeId}` 
      : `${API_BASE_URL}/trade/stores`;
    
    const method = isEditing ? 'PATCH' : 'POST';

    // Clean payload
    const payload = {
      ...formData,
      is_prospect: isEditing ? (initialData?.is_prospect ?? isProspect) : isProspect,
      street_address: formData.street_address || null,
      colonia: formData.colonia || null,
      municipality: formData.municipality || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      country: formData.country || 'México',
      phone: formData.phone || null,
      email: formData.email || null,
      market: formData.market || null,
      segment: formData.segment || null,
      region: formData.region || null,
      external_id: formData.external_id || null,
      delivery_zip_codes: formData.delivery_zip_codes
        ? formData.delivery_zip_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save account');
      }

      queryClient.invalidateQueries({ queryKey: ['stores'] });
      if (storeId) queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      
      setInitialSnapshot('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(clientId)
        ? prev.client_ids.filter(id => id !== clientId)
        : [...prev.client_ids, clientId]
    }));
  };

  const footer = (
    <div className="flex gap-4">
      <button 
        onClick={handleClose}
        className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
      >
        Cancel
      </button>
      <button 
        onClick={handleSubmit}
        disabled={loading || !formData.name}
        className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Save Changes' : (isProspect ? 'Create Prospect Account' : 'Create Account'))}
      </button>
    </div>
  );



  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditing ? (isProspect ? "Edit Prospect Account" : "Edit Account") : (isProspect ? "New Prospect Account" : "New Account")} 
      subtitle={isEditing ? `Editing: ${formData.name || (isProspect ? 'Prospect Account' : 'Account')}` : (isProspect ? "Register a new prospective company or entity." : "Register a new physical point of sale.")}
      footer={footer}
      size="wide"
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Identity & Location Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1 mb-2">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-blue-600" />
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-blue-600">Identity & Location</h4>
            </div>
            <button
              type="button"
              onClick={() => setManualAddress(!manualAddress)}
              className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider transition-colors focus:outline-none"
            >
              {manualAddress ? "Use Guided Dropdowns" : "Enter Address Manually"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isProspect ? 'Company / Entity Name' : 'Account Name'}</label>
            <input 
              required
              type="text"
              placeholder={isProspect ? "e.g. Distribuidora del Norte" : "e.g. Tienda La Norteña"}
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {manualAddress ? (
            // Manual Address Entry Mode
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ZIP Code</label>
                  <input 
                    type="text"
                    placeholder="e.g. 04210"
                    maxLength={5}
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                    value={formData.zip_code}
                    onChange={e => setFormData({...formData, zip_code: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Colonia / Neighborhood</label>
                  {colonias.length > 0 ? (
                    <select
                      className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none"
                      value={formData.colonia}
                      onChange={e => setFormData({...formData, colonia: e.target.value})}
                    >
                      {colonias.map((col, idx) => (
                        <option key={idx} value={col}>{col}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      placeholder="e.g. Portales Sur"
                      className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                      value={formData.colonia}
                      onChange={e => setFormData({...formData, colonia: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Municipality / City</label>
                  <input 
                    type="text"
                    placeholder="e.g. Benito Juárez"
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                    value={formData.municipality}
                    onChange={e => setFormData({...formData, municipality: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
                  <input 
                    type="text"
                    placeholder="e.g. CDMX"
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                  />
                </div>
              </div>
            </>
          ) : (
            // Guided Dropdown Entry Mode
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">State</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none"
                    value={formData.state}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        state: e.target.value,
                        municipality: '',
                        zip_code: '',
                        colonia: '',
                        city: ''
                      });
                    }}
                  >
                    <option value="">Select State...</option>
                    {addressStates.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Municipality</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none disabled:opacity-50"
                    value={formData.municipality}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        municipality: e.target.value,
                        zip_code: '',
                        colonia: '',
                        city: e.target.value
                      });
                    }}
                    disabled={!formData.state}
                  >
                    <option value="">Select Municipality...</option>
                    {addressMunicipalities.map((mun, idx) => (
                      <option key={idx} value={mun}>{mun}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ZIP Code</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none disabled:opacity-50"
                    value={formData.zip_code}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        zip_code: e.target.value,
                        colonia: ''
                      });
                    }}
                    disabled={!formData.municipality}
                  >
                    <option value="">Select ZIP Code...</option>
                    {addressZipCodes.map((zip, idx) => (
                      <option key={idx} value={zip}>{zip}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Colonia / Neighborhood</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none disabled:opacity-50"
                    value={formData.colonia}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        colonia: e.target.value
                      });
                    }}
                    disabled={!formData.zip_code}
                  >
                    <option value="">Select Colonia...</option>
                    {addressColonias.map((col, idx) => (
                      <option key={idx} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Street & Number</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="e.g. Calzada de Tlalpan 1209"
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900 pr-12"
                value={formData.street_address}
                onChange={e => setFormData({...formData, street_address: e.target.value})}
              />
              <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 bg-white rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Zones / ZIP Codes</label>
            <span className="text-[9px] text-gray-400 italic">Configure coverage</span>
          </div>

          {/* Display added ZIPs as tags */}
          <div className="flex flex-wrap gap-2 min-h-[36px] p-3 bg-gray-50 rounded-xl border border-gray-50">
            {(() => {
              const currentZipArray = formData.delivery_zip_codes
                ? formData.delivery_zip_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];
              return (
                <>
                  {currentZipArray.map((zip, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg border border-blue-100 transition-all hover:bg-blue-100"
                    >
                      <span>{zip}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const updated = currentZipArray.filter(z => z !== zip);
                          setFormData({ ...formData, delivery_zip_codes: updated.join(', ') });
                        }}
                        className="text-blue-500 hover:text-red-600 transition-colors text-[10px] font-black focus:outline-none"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {currentZipArray.length === 0 && (
                    <span className="text-xs text-gray-400 italic py-0.5">No delivery zones configured yet.</span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Select helpers */}
          {(() => {
            const currentZipArray = formData.delivery_zip_codes
              ? formData.delivery_zip_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
            
            // Get unique states sorted
            const uniqueStates = addressStates;

            // Get unique municipalities filtered by state
            const filteredMunicipalities = deliveryMunicipalities;
            
            // Get unique zip codes filtered by state and municipality
            const filteredZipCodes = selectedZipCodesArray;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* State */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">State</span>
                    <select
                      className="w-full p-3.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all appearance-none"
                      value={selectedState}
                      onChange={e => {
                        setSelectedState(e.target.value);
                        setSelectedMunicipality('');
                        setSelectedZipCodesArray([]);
                        setLastClickedIndex(null);
                      }}
                    >
                      <option value="">Select State...</option>
                      {uniqueStates.map((st, idx) => (
                        <option key={idx} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Municipality */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Municipality</span>
                    <select
                      className="w-full p-3.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all appearance-none disabled:opacity-50"
                      value={selectedMunicipality}
                      onChange={e => {
                        setSelectedMunicipality(e.target.value);
                        setSelectedZipCodesArray([]);
                        setLastClickedIndex(null);
                      }}
                      disabled={!selectedState}
                    >
                      <option value="">Select Municipality...</option>
                      {filteredMunicipalities.map((mun, idx) => (
                        <option key={idx} value={mun}>{mun}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">ZIP Codes (Shift to select range)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedZipCodesArray.length === filteredZipCodes.length) {
                          setSelectedZipCodesArray([]);
                        } else {
                          setSelectedZipCodesArray(filteredZipCodes);
                        }
                      }}
                      disabled={!selectedMunicipality || filteredZipCodes.length === 0}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 disabled:text-gray-300 transition-colors focus:outline-none uppercase tracking-wider"
                    >
                      {selectedZipCodesArray.length === filteredZipCodes.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <select
                    multiple
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 transition-all disabled:opacity-50 min-h-[95px]"
                    value={selectedZipCodesArray}
                    onChange={() => {}}
                    disabled={!selectedMunicipality || filteredZipCodes.length === 0}
                  >
                    {filteredZipCodes.map((zip, idx) => (
                      <option 
                        key={idx} 
                        value={zip} 
                        className="py-1 px-2 rounded hover:bg-gray-100 font-bold cursor-pointer"
                        onMouseDown={e => {
                          e.preventDefault();
                          const isShift = e.shiftKey;
                          setSelectedZipCodesArray(prev => {
                            if (isShift && lastClickedIndex !== null) {
                              const start = Math.min(lastClickedIndex, idx);
                              const end = Math.max(lastClickedIndex, idx);
                              const rangeZips = filteredZipCodes.slice(start, end + 1);
                              return Array.from(new Set([...prev, ...rangeZips]));
                            } else {
                              setLastClickedIndex(idx);
                              if (prev.includes(zip)) {
                                  return prev.filter(z => z !== zip);
                              } else {
                                  return [...prev, zip];
                              }
                            }
                          });
                        }}
                      >
                        {zip}
                      </option>
                    ))}
                    {selectedMunicipality && filteredZipCodes.length === 0 && (
                      <option disabled className="text-gray-400 italic">No ZIP codes preloaded.</option>
                    )}
                    {!selectedMunicipality && (
                      <option disabled className="text-gray-400 italic">Select State and Municipality first.</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = Array.from(new Set([...currentZipArray, ...selectedZipCodesArray]));
                      setFormData({ ...formData, delivery_zip_codes: updated.join(', ') });
                      setSelectedZipCodesArray([]);
                    }}
                    disabled={selectedZipCodesArray.length === 0}
                    className="w-full mt-3 p-3 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    Add Selected ZIP Codes ({selectedZipCodesArray.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-1">
                  <input
                    type="text"
                    placeholder="Or type custom ZIP (5 digits)..."
                    className="flex-1 p-3.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 transition-all"
                    value={customZipInput}
                    onChange={e => setCustomZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customZipInput.length === 5 && !currentZipArray.includes(customZipInput)) {
                        const updated = [...currentZipArray, customZipInput];
                        setFormData({ ...formData, delivery_zip_codes: updated.join(', ') });
                        setCustomZipInput('');
                      }
                    }}
                    disabled={customZipInput.length !== 5}
                    className="px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 whitespace-nowrap uppercase tracking-wider font-black"
                  >
                    Add Custom
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Segmentation Section */}
        <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Layers size={16} className="text-gray-400" />
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Surgical Segmentation</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
              <input 
                type="text"
                placeholder="e.g. North, Sur, Central"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
                list="region-options"
              />
              <datalist id="region-options">
                <option value="North" />
                <option value="South" />
                <option value="East" />
                <option value="West" />
                <option value="Central" />
                <option value="National" />
                <option value="Norte" />
                <option value="Sur" />
                <option value="Este" />
                <option value="Oeste" />
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Segment</label>
              <select 
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={formData.segment}
                onChange={e => setFormData({...formData, segment: e.target.value})}
              >
                <option value="">Select Segment...</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
                <option value="Economic">Economic</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Market Category</label>
            <input 
              type="text"
              placeholder="e.g. Retail, Wholesale, Convenience"
              className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              value={formData.market}
              onChange={e => setFormData({...formData, market: e.target.value})}
            />
          </div>
        </div>

        {/* Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={16} className="text-gray-900" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Linked Decision Makers</h4>
          </div>

          <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {allClients.map((client: any) => (
              <button
                key={client.id}
                onClick={() => toggleClient(client.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  formData.client_ids.includes(client.id)
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.client_ids.includes(client.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Users size={14} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${formData.client_ids.includes(client.id) ? 'text-blue-900' : 'text-gray-700'}`}>
                      {client.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{client.role || 'Partner'}</p>
                  </div>
                </div>
                {formData.client_ids.includes(client.id) && <CheckCircle size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Integration Section */}
        <div className="pt-4 border-t border-gray-100">
           <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Internal External ID (Legacy Mapping)</label>
            <input 
              type="text"
              placeholder="e.g. ERP-10293"
              className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-300 outline-none text-xs font-mono text-gray-500"
              value={formData.external_id}
              onChange={e => setFormData({...formData, external_id: e.target.value})}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}
